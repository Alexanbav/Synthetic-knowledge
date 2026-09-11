import type { AgentAction } from "./playwright";

const actions = new Set(["click", "type", "scroll", "wait", "done"]);

export function parseAgentAction(raw: string): AgentAction {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Réponse du modèle illisible : JSON attendu.");
  }
  const parsed = JSON.parse(candidate.slice(start, end + 1)) as AgentAction;
  if (!actions.has(parsed.action)) {
    throw new Error(`Action inconnue : ${String(parsed.action)}`);
  }
  return parsed;
}
