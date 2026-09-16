import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runSyntheticSession } from "@/lib/synthetic-runner/agent";
import { runStaticReview } from "@/lib/static-review/runner";

export const maxDuration = 300;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const study = await db.study.findUnique({
    where: { id },
    include: { personas: true, tasks: true, screens: true },
  });
  if (!study) return NextResponse.json({ error: "Étude introuvable" }, { status: 404 });
  if (study.status === "RUNNING") {
    return NextResponse.json({ error: "Une exécution est déjà en cours" }, { status: 409 });
  }

  if (study.mode === "STATIC") {
    if (!study.screens.length) {
      return NextResponse.json(
        { error: "Ajoutez au moins un écran (PDF ou images) avant de lancer la revue." },
        { status: 400 },
      );
    }
    await runStaticReview(id);
    return NextResponse.json({ ok: true });
  }

  if (!study.urlA) {
    return NextResponse.json({ error: "Aucune URL de prototype définie." }, { status: 400 });
  }

  await db.step.deleteMany({ where: { session: { studyId: id } } });
  await db.session.deleteMany({ where: { studyId: id } });
  await db.study.update({ where: { id }, data: { status: "RUNNING" } });

  const variants = [
    { variant: "A", url: study.urlA },
    ...(study.urlB ? [{ variant: "B", url: study.urlB }] : []),
  ];

  for (const persona of study.personas) {
    for (const task of study.tasks) {
      for (const { variant, url } of variants) {
        const session = await db.session.create({
          data: { studyId: id, personaId: persona.id, taskId: task.id, variant },
        });
        await runSyntheticSession({
          sessionId: session.id,
          url,
          persona,
          task,
          accessHint: study.accessHint,
        });
      }
    }
  }
  await db.study.update({ where: { id }, data: { status: "COMPLETED" } });
  return NextResponse.json({ ok: true });
}
