"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunStudyButton({ studyId }: { studyId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function run() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/studies/${studyId}/run`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Le test n'a pas pu démarrer.");
      setBusy(false);
      return;
    }
    router.push(`/studies/${studyId}/report`);
    router.refresh();
  }
  return (
    <div>
      <button className="button" disabled={busy} onClick={run}>
        {busy ? "Les personas naviguent…" : "Lancer toutes les sessions →"}
      </button>
      {busy && <p className="meta">Gardez cette page ouverte pendant le test.</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
