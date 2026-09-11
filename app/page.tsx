import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const studies = await db.study.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { personas: true, tasks: true, sessions: true } } },
  });
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Laboratoire UX augmenté</div>
          <h1>Testez vos maquettes<br />avant vos utilisateurs.</h1>
          <p className="lead">
            Des personas synthétiques explorent vos prototypes dans un vrai navigateur.
            Comparez A et B, observez les frictions, puis décidez avec plus de contexte.
          </p>
        </div>
        <Link className="button" href="/studies/new">Créer une étude →</Link>
      </section>
      {studies.length ? (
        <section className="grid study-grid">
          {studies.map((study) => (
            <Link className="card" href={`/studies/${study.id}`} key={study.id}>
              <div className="row">
                <span className="pill">{study.urlB ? "Test A/B" : "Test synthétique"}</span>
                <span className="meta"><i className={`status ${study.status}`} />{study.status}</span>
              </div>
              <h2 style={{ marginTop: 20 }}>{study.name}</h2>
              <p>{study.hypothesis}</p>
              <div className="meta">
                <span>{study._count.personas} personas</span>
                <span>•</span><span>{study._count.tasks} tâches</span>
                <span>•</span><span>{study._count.sessions} sessions</span>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <div className="empty">Aucune étude pour le moment. Commencez avec le prototype de démonstration.</div>
      )}
    </>
  );
}
