import fs from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { extractJsonObject } from "@/lib/synthetic-runner/parse-action";

type Persona = { name: string; brief: string; constraints: string | null };
type Task = { title: string; successCriteria: string };
type Screen = { index: number; imageUrl: string; label: string | null };

type ScreenReview = { index: number; observation: string };

type HeuristicReview = {
  screens: ScreenReview[];
  frictions: string[];
  summary: string;
  plausibleSuccess: boolean | null;
};

const systemPrompt =
  "Tu es un expert en UX qui réalise une revue heuristique honnête d'écrans statiques (maquettes ou export PDF), du point de vue d'un persona. Tu ne peux pas cliquer : tu évalues la clarté, la hiérarchie visuelle, la charge cognitive, la lisibilité du CTA, les signaux de confiance et les frictions probables. N'invente pas d'informations que tu ne vois pas. Réponds uniquement en JSON avec les clés: screens (tableau de {index, observation}), frictions (tableau de chaînes), summary (chaîne), plausibleSuccess (booléen: le parcours semble-t-il permettre d'atteindre l'objectif).";

function userPrompt(persona: Persona, task: Task, screenCount: number) {
  return [
    `Persona : ${persona.name}. ${persona.brief}. Contraintes : ${persona.constraints ?? "aucune"}.`,
    `Objectif à évaluer : ${task.title}.`,
    `Critère de succès : ${task.successCriteria}.`,
    `Nombre d'écrans fournis : ${screenCount}. Analyse-les dans l'ordre.`,
  ].join("\n");
}

async function readScreen(imageUrl: string) {
  const filePath = path.join(process.cwd(), "public", imageUrl);
  const buffer = await fs.readFile(filePath);
  const extension = path.extname(imageUrl).toLowerCase();
  const mediaType =
    extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".webp"
        ? "image/webp"
        : extension === ".gif"
          ? "image/gif"
          : "image/png";
  return { base64: buffer.toString("base64"), mediaType };
}

function deterministicReview(persona: Persona, task: Task, screens: Screen[]): HeuristicReview {
  return {
    screens: screens.map((screen) => ({
      index: screen.index,
      observation: `Écran ${screen.index}${screen.label ? ` (${screen.label})` : ""} : vérifier la hiérarchie visuelle, la lisibilité du CTA principal et la charge cognitive pour ${persona.name}.`,
    })),
    frictions: [
      "Le CTA principal doit rester l'élément visuellement dominant de chaque écran.",
      "Limiter le nombre de choix au-dessus de la ligne de flottaison pour réduire l'hésitation.",
      "Ajouter des repères de confiance (preuves sociales, sécurité, prix clairs) proches de l'action.",
    ],
    summary: `Revue heuristique déterministe (sans clé LLM) de ${screens.length} écran(s) pour « ${persona.name} » sur l'objectif « ${task.title} ». Définissez ANTHROPIC_API_KEY (ou OPENAI_API_KEY) pour obtenir une analyse visuelle spécifique à ces écrans.`,
    plausibleSuccess: null,
  };
}

async function claudeReview(
  persona: Persona,
  task: Task,
  screens: Screen[],
): Promise<HeuristicReview> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const images = await Promise.all(screens.map((screen) => readScreen(screen.imageUrl)));
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
    max_tokens: 1500,
    temperature: 0.2,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt(persona, task, screens.length) },
          ...images.flatMap((image, position) => [
            { type: "text" as const, text: `Écran ${screens[position].index} :` },
            {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: image.mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
                data: image.base64,
              },
            },
          ]),
        ],
      },
    ],
  });
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  if (!text) throw new Error("Claude n'a renvoyé aucune analyse.");
  return extractJsonObject<HeuristicReview>(text);
}

async function openaiReview(
  persona: Persona,
  task: Task,
  screens: Screen[],
): Promise<HeuristicReview> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const images = await Promise.all(screens.map((screen) => readScreen(screen.imageUrl)));
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt(persona, task, screens.length) },
          ...images.flatMap((image, position) => [
            { type: "text" as const, text: `Écran ${screens[position].index} :` },
            {
              type: "image_url" as const,
              image_url: { url: `data:${image.mediaType};base64,${image.base64}` },
            },
          ]),
        ],
      },
    ],
  });
  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Le modèle n'a renvoyé aucune analyse.");
  return extractJsonObject<HeuristicReview>(content);
}

async function reviewScreens(
  persona: Persona,
  task: Task,
  screens: Screen[],
): Promise<HeuristicReview> {
  if (process.env.ANTHROPIC_API_KEY) return claudeReview(persona, task, screens);
  if (process.env.OPENAI_API_KEY) return openaiReview(persona, task, screens);
  return deterministicReview(persona, task, screens);
}

export async function runStaticReview(studyId: string) {
  const study = await db.study.findUnique({
    where: { id: studyId },
    include: { personas: true, tasks: true, screens: { orderBy: [{ variant: "asc" }, { index: "asc" }] } },
  });
  if (!study) throw new Error("Étude introuvable");

  await db.step.deleteMany({ where: { session: { studyId } } });
  await db.session.deleteMany({ where: { studyId } });
  await db.study.update({ where: { id: studyId }, data: { status: "RUNNING" } });

  const variants = Array.from(new Set(study.screens.map((screen) => screen.variant))).sort();

  for (const persona of study.personas) {
    for (const task of study.tasks) {
      for (const variant of variants) {
        const screens = study.screens.filter((screen) => screen.variant === variant);
        if (!screens.length) continue;
        const session = await db.session.create({
          data: { studyId, personaId: persona.id, taskId: task.id, variant },
        });
        try {
          const review = await reviewScreens(persona, task, screens);
          const byIndex = new Map(review.screens?.map((item) => [item.index, item.observation]));
          for (const screen of screens) {
            await db.step.create({
              data: {
                index: screen.index,
                screenshotUrl: screen.imageUrl,
                observation: byIndex.get(screen.index) ?? `Écran ${screen.index} analysé.`,
                actionJson: JSON.stringify({ action: "review" }),
                result: "Analyse heuristique",
                sessionId: session.id,
              },
            });
          }
          await db.session.update({
            where: { id: session.id },
            data: {
              status: "COMPLETED",
              success: review.plausibleSuccess ?? null,
              stepCount: screens.length,
              summary: review.summary,
              friction: review.frictions?.filter(Boolean).join("\n") || null,
            },
          });
        } catch (error) {
          await db.session.update({
            where: { id: session.id },
            data: {
              status: "FAILED",
              success: false,
              summary: error instanceof Error ? error.message : "Erreur inconnue",
            },
          });
        }
      }
    }
  }

  await db.study.update({ where: { id: studyId }, data: { status: "COMPLETED" } });
}
