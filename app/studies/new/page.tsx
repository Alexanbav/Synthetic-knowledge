"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { defaultPersonas, defaultTasks } from "@/lib/templates/default-study";

type Mode = "INTERACTIVE" | "STATIC";

export default function NewStudyPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("INTERACTIVE");
  const [personas, setPersonas] = useState([defaultPersonas[0]]);
  const [tasks, setTasks] = useState(defaultTasks);
  const [filesA, setFilesA] = useState<File[]>([]);
  const [filesB, setFilesB] = useState<File[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  async function uploadScreens(studyId: string, variant: "A" | "B", files: File[]) {
    const body = new FormData();
    body.set("variant", variant);
    for (const file of files) body.append("file", file);
    const response = await fetch(`/api/studies/${studyId}/screens`, { method: "POST", body });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error ?? `Échec de l'envoi des écrans (variante ${variant}).`);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);

    if (mode === "STATIC" && filesA.length === 0) {
      setError("Ajoutez au moins un PDF ou une image pour la variante A.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          hypothesis: data.get("hypothesis"),
          mode,
          urlA: mode === "INTERACTIVE" ? data.get("urlA") : undefined,
          urlB: mode === "INTERACTIVE" ? data.get("urlB") : undefined,
          accessHint: data.get("accessHint") || undefined,
          personas,
          tasks,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Impossible de créer l'étude.");
        setBusy(false);
        return;
      }
      if (mode === "STATIC") {
        await uploadScreens(result.id, "A", filesA);
        if (filesB.length) await uploadScreens(result.id, "B", filesB);
      }
      router.push(`/studies/${result.id}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Une erreur est survenue.");
      setBusy(false);
    }
  }

  function setField(name: string, value: string) {
    const form = formRef.current;
    const field = form?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    if (field) field.value = value;
  }

  function loadDemo() {
    if (mode === "INTERACTIVE") {
      const origin = window.location.origin;
      setField("name", "Optimisation du CTA d'inscription");
      setField("hypothesis", "Un CTA explicite devrait faciliter l'inscription et réduire les hésitations.");
      setField("urlA", `${origin}/demo-proto/a`);
      setField("urlB", `${origin}/demo-proto/b`);
      return;
    }
    void loadStaticDemo();
  }

  async function loadStaticDemo() {
    setError("");
    setField("name", "Revue de la landing d'inscription (PDF)");
    setField("hypothesis", "Une hiérarchie plus claire du CTA devrait réduire les frictions perçues.");
    try {
      const fetchPdf = async (path: string, name: string) => {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Démo indisponible : ${path}`);
        const blob = await response.blob();
        return new File([blob], name, { type: "application/pdf" });
      };
      const [a, b] = await Promise.all([
        fetchPdf("/demo-screens/variant-a.pdf", "variant-a.pdf"),
        fetchPdf("/demo-screens/variant-b.pdf", "variant-b.pdf"),
      ]);
      setFilesA([a]);
      setFilesB([b]);
    } catch (demoError) {
      setError(demoError instanceof Error ? demoError.message : "Démo statique indisponible.");
    }
  }

  return (
    <div className="form">
      <div className="row">
        <div>
          <div className="eyebrow">Nouvelle étude</div>
          <h1 style={{ fontSize: 44 }}>Cadrez votre expérience</h1>
        </div>
        <button type="button" className="button secondary" onClick={loadDemo}>Charger la démo</button>
      </div>
      <form className="grid" ref={formRef} onSubmit={submit}>
        <section className="card grid">
          <h2>1. Type d’étude</h2>
          <div className="segmented" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "INTERACTIVE"}
              className={mode === "INTERACTIVE" ? "active" : ""}
              onClick={() => setMode("INTERACTIVE")}
            >
              Prototype en ligne (URL)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "STATIC"}
              className={mode === "STATIC" ? "active" : ""}
              onClick={() => setMode("STATIC")}
            >
              Écrans statiques (PDF / images)
            </button>
          </div>
          <p className="meta">
            {mode === "INTERACTIVE"
              ? "Des personas synthétiques naviguent réellement le prototype dans un navigateur."
              : "Idéal quand le proto n’est pas cliquable : chaque page du PDF (ou chaque image) devient un écran analysé heuristiquement par persona."}
          </p>
        </section>

        <section className="card grid">
          <h2>2. Hypothèse et variantes</h2>
          <label>Nom de l’étude<input name="name" required placeholder="Ex. Checkout express" /></label>
          <label>Hypothèse<textarea name="hypothesis" required placeholder="Nous pensons que…" /></label>
          {mode === "INTERACTIVE" ? (
            <>
              <div className="grid form-grid">
                <label>URL variante A<input name="urlA" required={mode === "INTERACTIVE"} type="url" placeholder="https://…" /></label>
                <label>URL variante B (optionnelle)<input name="urlB" type="url" placeholder="https://…" /></label>
              </div>
              <label>Instructions d’accès (optionnel)<textarea name="accessHint" placeholder="Mot de passe du prototype ou indication de navigation" /></label>
            </>
          ) : (
            <div className="grid form-grid">
              <FileVariant label="Écrans variante A (requis)" files={filesA} onChange={setFilesA} />
              <FileVariant label="Écrans variante B (optionnel)" files={filesB} onChange={setFilesB} />
            </div>
          )}
        </section>

        <section className="card grid">
          <div className="row"><h2>3. Personas</h2><button className="button secondary" type="button" onClick={() => setPersonas([...personas, defaultPersonas[1]])}>+ Ajouter</button></div>
          {personas.map((persona, index) => (
            <div className="subcard" key={index}>
              <label>Nom<input value={persona.name} onChange={(e) => setPersonas(personas.map((p, i) => i === index ? { ...p, name: e.target.value } : p))} /></label>
              <label>Contexte<textarea value={persona.brief} onChange={(e) => setPersonas(personas.map((p, i) => i === index ? { ...p, brief: e.target.value } : p))} /></label>
              <label>Contraintes<input value={persona.constraints} onChange={(e) => setPersonas(personas.map((p, i) => i === index ? { ...p, constraints: e.target.value } : p))} /></label>
            </div>
          ))}
        </section>

        <section className="card grid">
          <div className="row"><h2>4. {mode === "STATIC" ? "Objectifs à évaluer" : "Tâches"}</h2><button className="button secondary" type="button" onClick={() => setTasks([...tasks, { ...defaultTasks[0], title: "Nouvelle tâche" }])}>+ Ajouter</button></div>
          {tasks.map((task, index) => (
            <div className="subcard" key={index}>
              <label>Objectif<input value={task.title} onChange={(e) => setTasks(tasks.map((t, i) => i === index ? { ...t, title: e.target.value } : t))} /></label>
              <label>Critère de succès<textarea value={task.successCriteria} onChange={(e) => setTasks(tasks.map((t, i) => i === index ? { ...t, successCriteria: e.target.value } : t))} /></label>
              {mode === "INTERACTIVE" && (
                <label>Étapes maximum<input type="number" min="2" max="25" value={task.maxSteps} onChange={(e) => setTasks(tasks.map((t, i) => i === index ? { ...t, maxSteps: Number(e.target.value) } : t))} /></label>
              )}
            </div>
          ))}
        </section>
        {error && <div className="error">{error}</div>}
        <button className="button" disabled={busy} type="submit">{busy ? "Création…" : "Créer l’étude"}</button>
      </form>
    </div>
  );
}

function FileVariant({
  label,
  files,
  onChange,
}: {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        multiple
        onChange={(event) => onChange(Array.from(event.target.files ?? []))}
      />
      {files.length > 0 && (
        <span className="meta">{files.map((file) => file.name).join(", ")}</span>
      )}
    </label>
  );
}
