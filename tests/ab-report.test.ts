import assert from "node:assert/strict";
import test from "node:test";
import { buildAbReport } from "../lib/ab-report.ts";

test("choisit la variante avec le meilleur taux de succès", () => {
  const report = buildAbReport([
    { variant: "A", status: "COMPLETED", success: false, stepCount: 4, friction: "CTA ambigu" },
    { variant: "B", status: "COMPLETED", success: true, stepCount: 2, friction: null },
  ]);
  assert.equal(report.winner, "B");
  assert.equal(report.variants[1].rate, 100);
});

test("ne désigne pas de gagnant à égalité", () => {
  const report = buildAbReport([
    { variant: "A", status: "COMPLETED", success: true, stepCount: 2, friction: null },
    { variant: "B", status: "COMPLETED", success: true, stepCount: 2, friction: null },
  ]);
  assert.equal(report.winner, null);
});
