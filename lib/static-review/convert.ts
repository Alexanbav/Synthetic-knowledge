import fs from "node:fs/promises";
import path from "node:path";

export type UploadedFile = {
  buffer: Buffer;
  filename: string;
  type: string;
};

export type SavedScreen = {
  index: number;
  imageUrl: string;
  label: string;
};

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

function isPdf(file: UploadedFile) {
  return file.type === "application/pdf" || file.filename.toLowerCase().endsWith(".pdf");
}

function isImage(file: UploadedFile) {
  if (IMAGE_TYPES.has(file.type)) return true;
  return IMAGE_EXTENSIONS.has(path.extname(file.filename).toLowerCase());
}

async function pdfToPngBuffers(buffer: Buffer): Promise<Buffer[]> {
  const { pdf } = await import("pdf-to-img");
  const document = await pdf(buffer, { scale: 2 });
  const pages: Buffer[] = [];
  for await (const page of document) {
    pages.push(page);
  }
  return pages;
}

/**
 * Converts uploaded PDF/image files into stored PNG/image screens for a variant.
 * PDFs are rasterised one screen per page; images are kept as-is. Any previously
 * stored screens for the same study/variant are removed so re-uploads replace them.
 */
export async function convertFilesToScreens(
  studyId: string,
  variant: string,
  files: UploadedFile[],
): Promise<SavedScreen[]> {
  const relativeDir = path.join("uploads", studyId, variant.toLowerCase());
  const outputDir = path.join(process.cwd(), "public", relativeDir);
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const screens: SavedScreen[] = [];
  let index = 0;

  for (const file of files) {
    if (isPdf(file)) {
      const pages = await pdfToPngBuffers(file.buffer);
      for (let page = 0; page < pages.length; page += 1) {
        index += 1;
        const name = `${String(index).padStart(2, "0")}.png`;
        await fs.writeFile(path.join(outputDir, name), pages[page]);
        screens.push({
          index,
          imageUrl: `/${relativeDir}/${name}`,
          label: `${file.filename} · page ${page + 1}`,
        });
      }
    } else if (isImage(file)) {
      index += 1;
      const extension = path.extname(file.filename).toLowerCase() || ".png";
      const name = `${String(index).padStart(2, "0")}${extension}`;
      await fs.writeFile(path.join(outputDir, name), file.buffer);
      screens.push({ index, imageUrl: `/${relativeDir}/${name}`, label: file.filename });
    } else {
      throw new Error(`Format non supporté : ${file.filename}. Utilisez un PDF ou des images.`);
    }
  }

  if (!screens.length) {
    throw new Error("Aucun écran exploitable n'a été extrait des fichiers fournis.");
  }
  return screens;
}
