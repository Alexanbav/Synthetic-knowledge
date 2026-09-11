import fs from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { parseAgentAction } from "./parse-action";
import {
  closeBrowser,
  describePage,
  openPrototype,
  performAction,
  type AgentAction,
} from "./playwright";

type RunInput = {
  sessionId: string;
  url: string;
  persona: { name: string; brief: string; constraints: string | null };
  task: { title: string; successCriteria: string; maxSteps: number };
  accessHint: string | null;
};

function assertAllowedUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Seules les URLs HTTP(S) sont autorisées.");
  }
  const allowlist = process.env.SYNTHETIC_ALLOWED_DOMAINS?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (allowlist?.length && !allowlist.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) {
    throw new Error(`Domaine non autorisé : ${url.hostname}`);
  }
}

async function demoDecision(pageText: string): Promise<AgentAction> {
  if (/confirmation|objectif atteint|merci/i.test(pageText)) {
    return {
      thought: "La page confirme explicitement que l'objectif est atteint.",
      action: "done",
      done: true,
      success: true,
      reason: "Confirmation visible",
    };
  }
  return {
    thought: "Je repère l'appel à l'action principal et je tente de poursuivre.",
    action: "click",
    selector: "[data-synthetic-action]",
  };
}

const systemPrompt =
  "Tu simules honnêtement un utilisateur UX. N'utilise ni DevTools ni connaissance cachée. Réponds uniquement en JSON avec thought, action (click|type|scroll|wait|done), selector, x, y, text, done, success, reason. N'annonce le succès que si le critère est visiblement atteint.";

function userPrompt(input: RunInput, pageText: string) {
  return `Persona: ${input.persona.name}. ${input.persona.brief}. Contraintes: ${input.persona.constraints ?? "aucune"}.\nTâche: ${input.task.title}.\nCritère: ${input.task.successCriteria}.\nAccès: ${input.accessHint ?? "aucune instruction"}.\nContenu visible: ${pageText}`;
}

async function claudeDecision(screenshot: Buffer, pageText: string, input: RunInput): Promise<AgentAction> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
    max_tokens: 800,
    temperature: 0.2,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: screenshot.toString("base64"),
            },
          },
          { type: "text", text: userPrompt(input, pageText) },
        ],
      },
    ],
  });
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  if (!text) throw new Error("Claude n'a renvoyé aucune action.");
  return parseAgentAction(text);
}

async function openaiDecision(screenshot: Buffer, pageText: string, input: RunInput): Promise<AgentAction> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt(input, pageText) },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${screenshot.toString("base64")}` },
          },
        ],
      },
    ],
  });
  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Le modèle n'a renvoyé aucune action.");
  return parseAgentAction(content);
}

async function visionDecision(
  screenshot: Buffer,
  pageText: string,
  input: RunInput,
): Promise<AgentAction> {
  if (process.env.ANTHROPIC_API_KEY) return claudeDecision(screenshot, pageText, input);
  if (process.env.OPENAI_API_KEY) return openaiDecision(screenshot, pageText, input);
  return demoDecision(pageText);
}

export async function runSyntheticSession(input: RunInput) {
  assertAllowedUrl(input.url);
  await db.session.update({ where: { id: input.sessionId }, data: { status: "RUNNING" } });
  let browser: Awaited<ReturnType<typeof openPrototype>>["browser"] | undefined;
  let lastThought = "";
  const frictions: string[] = [];

  try {
    const opened = await openPrototype(input.url);
    browser = opened.browser;
    const page = opened.page;
    const outputDirectory = path.join(process.cwd(), "public", "runs", input.sessionId);
    await fs.mkdir(outputDirectory, { recursive: true });

    for (let index = 1; index <= input.task.maxSteps; index += 1) {
      const screenshot = await page.screenshot({ type: "png" });
      const screenshotName = `${String(index).padStart(2, "0")}.png`;
      await fs.writeFile(path.join(outputDirectory, screenshotName), screenshot);
      const observation = await describePage(page);
      const action = await visionDecision(screenshot, observation, input);
      lastThought = action.thought;
      let result: string;
      try {
        result = await performAction(page, action);
        await page.waitForTimeout(450);
      } catch (error) {
        result = `Friction : ${error instanceof Error ? error.message : "action impossible"}`;
        frictions.push(result);
      }
      await db.step.create({
        data: {
          index,
          screenshotUrl: `/runs/${input.sessionId}/${screenshotName}`,
          observation: action.thought,
          actionJson: JSON.stringify(action),
          result,
          sessionId: input.sessionId,
        },
      });
      await db.session.update({ where: { id: input.sessionId }, data: { stepCount: index } });

      if (action.done || action.action === "done") {
        await db.session.update({
          where: { id: input.sessionId },
          data: {
            status: "COMPLETED",
            success: action.success === true,
            summary: action.reason ?? action.thought,
            friction: frictions.join("\n") || null,
          },
        });
        return;
      }
    }
    await db.session.update({
      where: { id: input.sessionId },
      data: {
        status: "COMPLETED",
        success: false,
        summary: `Limite d'étapes atteinte. Dernière observation : ${lastThought}`,
        friction: [...frictions, "Limite d'étapes atteinte"].join("\n"),
      },
    });
  } catch (error) {
    await db.session.update({
      where: { id: input.sessionId },
      data: {
        status: "FAILED",
        success: false,
        summary: error instanceof Error ? error.message : "Erreur inconnue",
      },
    });
  } finally {
    if (browser) await closeBrowser(browser);
  }
}
