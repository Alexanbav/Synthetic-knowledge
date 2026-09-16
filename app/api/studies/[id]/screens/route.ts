import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { convertFilesToScreens, type UploadedFile } from "@/lib/static-review/convert";

export const maxDuration = 120;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const study = await db.study.findUnique({ where: { id } });
  if (!study) return NextResponse.json({ error: "Étude introuvable" }, { status: 404 });
  if (study.mode !== "STATIC") {
    return NextResponse.json({ error: "Cette étude n'est pas en mode statique." }, { status: 400 });
  }

  const form = await request.formData();
  const variant = String(form.get("variant") ?? "A").toUpperCase();
  if (!["A", "B"].includes(variant)) {
    return NextResponse.json({ error: "Variante invalide (A ou B)." }, { status: 400 });
  }

  const entries = form.getAll("file").filter((entry): entry is File => entry instanceof File);
  if (!entries.length) {
    return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
  }

  const files: UploadedFile[] = await Promise.all(
    entries.map(async (file) => ({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name || "ecran",
      type: file.type,
    })),
  );

  try {
    const screens = await convertFilesToScreens(id, variant, files);
    await db.screen.deleteMany({ where: { studyId: id, variant } });
    await db.screen.createMany({
      data: screens.map((screen) => ({
        studyId: id,
        variant,
        index: screen.index,
        imageUrl: screen.imageUrl,
        label: screen.label,
      })),
    });
    return NextResponse.json({ variant, count: screens.length }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Conversion impossible." },
      { status: 400 },
    );
  }
}
