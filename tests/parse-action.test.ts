import assert from "node:assert/strict";
import test from "node:test";
import { parseAgentAction } from "../lib/synthetic-runner/parse-action.ts";

test("lit un JSON Claude encapsulé dans un fence", () => {
  const action = parseAgentAction(`Voici l'action:\n\`\`\`json\n{"thought":"ok","action":"click","selector":"#cta"}\n\`\`\``);
  assert.equal(action.action, "click");
  assert.equal(action.selector, "#cta");
});
