"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { defaultPersonas, defaultTasks } from "@/lib/templates/default-study";

export default function NewStudyPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [personas, setPersonas] = useState([defaultPersonas[0]]);
  const [tasks, setTasks] = useState(defaultTasks);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/studies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        hypothesis: data.get("hypothesis"),
        urlA: data.get("urlA"),
        urlB: data.get("urlB"),
        accessHint: data.get("accessHint"),
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
    router.push(`/studies/${result.id}`);
  }

  function loadDemo() {
    const origin = window.location.origin;
    const form = document.querySelector("form") as HTMLFormElement;
    (form.elements.namedItem("name") as HTMLInputElement).value = "Optimisation du CTA d'inscription";
    (form.elements.namedItem("hypothesis") as HTMLTextAreaElement).value =
      "Un CTA explicite devrait faciliter l'inscription et réduire les hésitations.";
    (form.elements.namedItem("urlA") as HTMLInputElement).value = `${origin}/demo-proto/a`;
    (form.elements.namedItem("urlB") as HTMLInputElement).value = `${origin}/demo-proto/b`;
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
      <form className="grid" onSubmit={submit}>
        <section className="card grid">
          <h2>1. Hypothèse et variantes</h2>
          <label>Nom de l’étude<input name="name" required placeholder="Ex. Checkout express" /></label>
          <label>Hypothèse<textarea name="hypothesis" required placeholder="Nous pensons que…" /></label>
          <div className="grid form-grid">
            <label>URL variante A<input name="urlA" required type="url" placeholder="https://…" /></label>
            <label>URL variante B (optionnelle)<input name="urlB" type="url" placeholder="https://…" /></label>
          </div>
          <label>Instructions d’accès (optionnel)<textarea name="accessHint" placeholder="Mot de passe du prototype ou indication de navigation" /></label>
        </section>

        <section className="card grid">
          <div className="row"><h2>2. Personas</h2><button className="button secondary" type="button" onClick={() => setPersonas([...personas, defaultPersonas[1]])}>+ Ajouter</button></div>
          {personas.map((persona, index) => (
            <div className="subcard" key={index}>
              <label>Nom<input value={persona.name} onChange={(e) => setPersonas(personas.map((p, i) => i === index ? { ...p, name: e.target.value } : p))} /></label>
              <label>Contexte<textarea value={persona.brief} onChange={(e) => setPersonas(personas.map((p, i) => i === index ? { ...p, brief: e.target.value } : p))} /></label>
              <label>Contraintes<input value={persona.constraints} onChange={(e) => setPersonas(personas.map((p, i) => i === index ? { ...p, constraints: e.target.value } : p))} /></label>
            </div>
          ))}
        </section>

        <section className="card grid">
          <div className="row"><h2>3. Tâches</h2><button className="button secondary" type="button" onClick={() => setTasks([...tasks, { ...defaultTasks[0], title: "Nouvelle tâche" }])}>+ Ajouter</button></div>
          {tasks.map((task, index) => (
            <div className="subcard" key={index}>
              <label>Objectif<input value={task.title} onChange={(e) => setTasks(tasks.map((t, i) => i === index ? { ...t, title: e.target.value } : t))} /></label>
              <label>Critère de succès<textarea value={task.successCriteria} onChange={(e) => setTasks(tasks.map((t, i) => i === index ? { ...t, successCriteria: e.target.value } : t))} /></label>
              <label>Étapes maximum<input type="number" min="2" max="25" value={task.maxSteps} onChange={(e) => setTasks(tasks.map((t, i) => i === index ? { ...t, maxSteps: Number(e.target.value) } : t))} /></label>
            </div>
          ))}
        </section>
        {error && <div className="error">{error}</div>}
        <button className="button" disabled={busy} type="submit">{busy ? "Création…" : "Créer l’étude"}</button>
      </form>
    </div>
  );
}
