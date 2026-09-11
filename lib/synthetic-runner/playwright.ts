import { chromium, type Browser, type Page } from "playwright";

export type AgentAction = {
  thought: string;
  action: "click" | "type" | "scroll" | "wait" | "done";
  selector?: string;
  x?: number;
  y?: number;
  text?: string;
  done?: boolean;
  success?: boolean;
  reason?: string;
};

export async function openPrototype(url: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "SyntheticKnowledge/1.0 (UX research agent)",
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator("body").waitFor({ timeout: 10_000 });
  return { browser, page };
}

export async function describePage(page: Page) {
  const frames = page.frames();
  const parts: string[] = [];
  for (const frame of frames) {
    try {
      const text = (await frame.locator("body").innerText({ timeout: 1_500 }))
        .replace(/\s+/g, " ")
        .slice(0, 5_000);
      if (text) parts.push(`[${frame === page.mainFrame() ? "page" : "iframe"}] ${text}`);
    } catch {
      // Cross-origin or transient frames are represented by the screenshot.
    }
  }
  return parts.join("\n").slice(0, 10_000);
}

async function locatorInFrames(page: Page, selector: string) {
  for (const frame of page.frames()) {
    try {
      const locator = frame.locator(selector).first();
      if (await locator.isVisible({ timeout: 500 })) return locator;
    } catch {
      // Try the next frame.
    }
  }
  return null;
}

export async function performAction(page: Page, action: AgentAction) {
  if (action.action === "done") return action.reason ?? "Session terminée";
  if (action.action === "wait") {
    await page.waitForTimeout(700);
    return "Attente effectuée";
  }
  if (action.action === "scroll") {
    await page.mouse.wheel(0, action.y ?? 550);
    return "Page défilée";
  }

  if (action.selector) {
    const locator = await locatorInFrames(page, action.selector);
    if (locator) {
      if (action.action === "type") {
        await locator.fill(action.text ?? "");
        return `Texte saisi dans ${action.selector}`;
      }
      await locator.click({ timeout: 4_000 });
      return `Clic sur ${action.selector}`;
    }
  }

  if (action.action === "click" && action.x != null && action.y != null) {
    await page.mouse.click(action.x, action.y);
    return `Clic aux coordonnées ${action.x},${action.y}`;
  }
  throw new Error("Action inexécutable : sélecteur ou coordonnées manquants");
}

export async function closeBrowser(browser: Browser) {
  await browser.close();
}
