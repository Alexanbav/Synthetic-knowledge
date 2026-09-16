import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buildAbReport, buildStaticReport } from "@/lib/ab-report";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const study = await db.study.findUnique({
    where: { id },
    include: {
      sessions: {
        include: { persona: true, task: true, steps: { orderBy: { index: "asc" } } },
        orderBy: [{ variant: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!study) notFound();
  const isStatic = study.mode === "STATIC";
  const report = buildAbReport(study.sessions);
  const staticReport = buildStaticReport(study.sessions);
  return (
    <div style={{ paddingBottom: 72 }}>
      <section className="hero">
        <div>
          <div className="eyebrow">{isStatic ? "Revue heuristique" : "Rapport synthétique"}</div>
          <h1>{study.name}</h1>
          <p className="lead">
            {isStatic
              ? "Analyse UX d'écrans statiques par persona : hypothèses de friction, clarté et hiérarchie visuelle."
              : report.winner
                ? `La variante ${report.winner} prend l’avantage dans cet échantillon.`
                : "Aucun gagnant net ne se dégage pour le moment."}
          </p>
        </div>
        <Link className="button secondary" href={`/studies/${study.id}`}>← Retour à l’étude</Link>
      </section>
      <section className="grid report-grid">
        {isStatic
          ? staticReport.variants.map((variant) => (
              <article className="card" key={variant.variant}>
                <div className="row"><h2>Variante {variant.variant}</h2></div>
                <div className="metric">{variant.screens}</div>
                <p>écran(s) analysé(s) · {variant.reviews} revue(s) par persona</p>
                {variant.frictions.length > 0 && (
                  <>
                    <h3 style={{ marginTop: 22 }}>Frictions relevées</h3>
                    <ul>{variant.frictions.slice(0, 6).map((item, i) => <li key={i}>{item}</li>)}</ul>
                  </>
                )}
              </article>
            ))
          : report.variants.map((variant) => (
              <article className="card" key={variant.variant}>
                <div className="row"><h2>Variante {variant.variant}</h2>{report.winner === variant.variant && <span className="pill">Gagnant suggéré</span>}</div>
                <div className="metric">{variant.rate}%</div>
                <p>de réussite · {variant.successes}/{variant.completed} sessions terminées</p>
                <div className="meta">{variant.averageSteps} étapes en moyenne</div>
                {variant.frictions.length > 0 && <><h3 style={{ marginTop: 22 }}>Frictions</h3><ul>{variant.frictions.slice(0, 5).map((item, i) => <li key={i}>{item}</li>)}</ul></>}
              </article>
            ))}
      </section>
      {!study.sessions.length && <div className="empty section">Lancez {isStatic ? "la revue" : "les sessions"} depuis l’étude pour générer ce rapport.</div>}
      <section className="section grid">
        <div><div className="eyebrow">{isStatic ? "Écrans analysés" : "Preuves de navigation"}</div><h2>{isStatic ? "Détail par persona" : "Rejouer les sessions"}</h2></div>
        {study.sessions.map((session) => (
          <article className="card grid" key={session.id}>
            <div className="row">
              <div><span className="pill">Variante {session.variant}</span><h3 style={{ marginTop: 10 }}>{session.persona.name} · {session.task.title}</h3></div>
              <strong>
                {isStatic
                  ? session.status === "FAILED"
                    ? "Analyse impossible"
                    : session.success === true
                      ? "Parcours plausible"
                      : session.success === false
                        ? "Parcours à risque"
                        : "Revue heuristique"
                  : session.success ? "Objectif atteint" : session.status === "FAILED" ? "Erreur technique" : "Objectif non atteint"}
              </strong>
            </div>
            <p>{session.summary}</p>
            <div className="timeline">
              {session.steps.map((step) => (
                <div className="step subcard" key={step.id}>
                  {step.screenshotUrl && <a href={step.screenshotUrl} target="_blank"><Image unoptimized width={1280} height={800} src={step.screenshotUrl} alt={`Écran ${step.index}`} /></a>}
                  <strong>Écran {step.index}</strong>
                  <span>{step.observation}</span>
                  <span className="meta">{step.result}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
      <aside className="card">
        <strong>À interpréter avec prudence.</strong>
        <p>
          {isStatic
            ? "Une revue heuristique sur écrans statiques révèle des hypothèses de friction, mais ne remplace ni un test avec de vrais utilisateurs ni un parcours interactif réel."
            : "Un petit échantillon d’utilisateurs synthétiques révèle des hypothèses et des frictions, mais ne remplace ni des entretiens réels ni une expérimentation statistiquement significative."}
        </p>
      </aside>
    </div>
  );
}
