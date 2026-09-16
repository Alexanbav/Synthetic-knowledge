import type { AgentAction } from "./playwright";

const actions = new Set(["click", "type", "scroll", "wait", "done"]);

export function extractJsonObject<T>(raw: string): T {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Réponse du modèle illisible : JSON attendu.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

export function parseAgentAction(raw: string): AgentAction {
  const parsed = extractJsonObject<AgentAction>(raw);
  if (!actions.has(parsed.action)) {
    throw new Error(`Action inconnue : ${String(parsed.action)}`);
  }
  return parsed;
}
