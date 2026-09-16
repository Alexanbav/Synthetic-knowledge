import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { RunStudyButton } from "@/components/run-study-button";

export const dynamic = "force-dynamic";

export default async function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const study = await db.study.findUnique({
    where: { id },
    include: {
      personas: true,
      tasks: true,
      screens: { orderBy: [{ variant: "asc" }, { index: "asc" }] },
      sessions: { include: { persona: true, task: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!study) notFound();
  const isStatic = study.mode === "STATIC";
  const hostname = (value: string | null) => {
    if (!value) return null;
    try {
      return new URL(value).hostname;
    } catch {
      return value;
    }
  };
  const screensByVariant = ["A", "B"].map((variant) => ({
    variant,
    count: study.screens.filter((screen) => screen.variant === variant).length,
  })).filter((entry) => entry.count > 0);
  return (
    <div style={{ paddingBottom: 70 }}>
      <section className="hero">
        <div>
          <div className="eyebrow">{isStatic ? "Revue heuristique statique" : study.urlB ? "Expérience A/B" : "Test synthétique"}</div>
          <h1>{study.name}</h1>
          <p className="lead">{study.hypothesis}</p>
          <div className="meta">
            {isStatic
              ? screensByVariant.map((entry) => <span className="pill" key={entry.variant}>{entry.variant} · {entry.count} écran(s)</span>)
              : <>
                  <span className="pill">A · {hostname(study.urlA)}</span>
                  {study.urlB && <span className="pill">B · {hostname(study.urlB)}</span>}
                </>}
          </div>
        </div>
        <div className="grid">
          <RunStudyButton studyId={study.id} />
          {study.sessions.length > 0 && <Link className="button secondary" href={`/studies/${study.id}/report`}>Voir le rapport</Link>}
        </div>
      </section>
      <section className="grid form-grid">
        <div className="card grid">
          <h2>Personas</h2>
          {study.personas.map((persona) => <div className="subcard" key={persona.id}><h3>{persona.name}</h3><p>{persona.brief}</p><span className="meta">{persona.constraints}</span></div>)}
        </div>
        <div className="card grid">
          <h2>Tâches</h2>
          {study.tasks.map((task) => <div className="subcard" key={task.id}><h3>{task.title}</h3><p>{task.successCriteria}</p><span className="meta">{task.maxSteps} étapes maximum</span></div>)}
        </div>
      </section>
      {study.sessions.length > 0 && (
        <section className="section card grid">
          <h2>Sessions</h2>
          {study.sessions.map((session) => (
            <div className="row subcard" key={session.id}>
              <span><i className={`status ${session.status}`} /> &nbsp;Variante {session.variant} · {session.persona.name} · {session.task.title}</span>
              <span className="meta">{session.success == null ? session.status : session.success ? "Succès" : "Échec"} · {session.stepCount} étapes</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
