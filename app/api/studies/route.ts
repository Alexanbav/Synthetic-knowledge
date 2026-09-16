import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const studySchema = z
  .object({
    name: z.string().min(2),
    hypothesis: z.string().min(3),
    mode: z.enum(["INTERACTIVE", "STATIC"]).default("INTERACTIVE"),
    urlA: z.union([z.string().url(), z.literal("")]).optional(),
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
  })
  .refine((data) => data.mode === "STATIC" || Boolean(data.urlA), {
    message: "L'URL de la variante A est requise pour un test interactif.",
    path: ["urlA"],
  });

export async function POST(request: Request) {
  const parsed = studySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { personas, tasks, urlA, urlB, ...study } = parsed.data;
  const created = await db.study.create({
    data: {
      ...study,
      urlA: urlA || null,
      urlB: urlB || null,
      personas: { create: personas },
      tasks: { create: tasks },
    },
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
