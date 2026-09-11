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
      sessions: { include: { persona: true, task: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!study) notFound();
  return (
    <div style={{ paddingBottom: 70 }}>
      <section className="hero">
        <div>
          <div className="eyebrow">{study.urlB ? "Expérience A/B" : "Test synthétique"}</div>
          <h1>{study.name}</h1>
          <p className="lead">{study.hypothesis}</p>
          <div className="meta"><span className="pill">A · {new URL(study.urlA).hostname}</span>{study.urlB && <span className="pill">B · {new URL(study.urlB).hostname}</span>}</div>
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
