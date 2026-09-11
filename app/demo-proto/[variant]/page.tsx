"use client";

import { use, useState } from "react";

export default function DemoPrototype({ params }: { params: Promise<{ variant: string }> }) {
  const { variant } = use(params);
  const [done, setDone] = useState(false);
  const isB = variant.toLowerCase() === "b";
  if (done) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#eef8f1" }}>
        <div data-synthetic-success="true" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 52 }}>✓</div>
          <h1 style={{ fontSize: 44 }}>Confirmation</h1>
          <p>Objectif atteint : votre inscription est enregistrée. Merci !</p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ minHeight: "100vh", background: isB ? "#10261d" : "#faf8f2", color: isB ? "white" : "#26231f", padding: "32px 7vw" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}><span>NOVA</span><span>Produit · Prix · À propos</span></nav>
      <main style={{ maxWidth: 760, margin: "14vh auto 0", textAlign: "center" }}>
        <small>LA PLATEFORME DES ÉQUIPES AMBITIEUSES</small>
        <h1 style={{ fontSize: "clamp(48px, 8vw, 92px)", margin: "24px 0" }}>{isB ? "Passez de l’idée à l’impact." : "Le futur du travail, aujourd’hui."}</h1>
        <p style={{ fontSize: 20, lineHeight: 1.6, opacity: .75 }}>Centralisez vos projets, alignez votre équipe et mesurez ce qui compte vraiment.</p>
        <button
          data-synthetic-action
          onClick={() => setDone(true)}
          style={{ border: 0, borderRadius: 12, padding: "17px 26px", marginTop: 28, background: isB ? "#65d895" : "#ddd5c6", color: "#10261d", fontWeight: 800, cursor: "pointer" }}
        >
          {isB ? "Créer mon espace gratuitement" : "En savoir plus"}
        </button>
      </main>
    </div>
  );
}
