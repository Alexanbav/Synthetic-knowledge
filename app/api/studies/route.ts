import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const studySchema = z.object({
  name: z.string().min(2),
  hypothesis: z.string().min(3),
  urlA: z.string().url(),
  urlB: z.union([z.string().url(), z.literal("")]).optional(),
  accessHint: z.string().optional(),
  personas: z.array(
    z.object({
      name: z.string().min(2),
      brief: z.string().min(3),
      constraints: z.string().optional(),
    }),
  ).min(1),
  tasks: z.array(
    z.object({
      title: z.string().min(2),
      successCriteria: z.string().min(3),
      maxSteps: z.number().int().min(2).max(25),
    }),
  ).min(1),
});

export async function POST(request: Request) {
  const parsed = studySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { personas, tasks, urlB, ...study } = parsed.data;
  const created = await db.study.create({
    data: {
      ...study,
      urlB: urlB || null,
      personas: { create: personas },
      tasks: { create: tasks },
    },
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
