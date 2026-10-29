import { MAX_PAGES, type Page } from "./schema";

export interface PreparedPage extends Page {
  id: string;
  name: string;
  /** Object URL for images; null for PDFs. */
  previewUrl: string | null;
}

const MAX_EDGE = 2000;
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = /^image\//;

export class PrepareError extends Error {}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Phone photos are often 12+ megapixels. Shrink to what the model reads well, as JPEG. */
async function shrinkImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new PrepareError(
      `"${file.name}" couldn't be opened. Try a JPG or PNG, or take a screenshot of it.`,
    );
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new PrepareError("Your browser couldn't process this image.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new PrepareError("Couldn't compress the image."))),
      "image/jpeg",
      0.88,
    ),
  );
}

export async function preparePage(file: File): Promise<PreparedPage> {
  const id = crypto.randomUUID();
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    if (file.size > MAX_PDF_BYTES) {
      throw new PrepareError(`"${file.name}" is over 5 MB. Try uploading just the pages you need.`);
    }
    return {
      id,
      name: file.name,
      mediaType: "application/pdf",
      data: await blobToBase64(file),
      previewUrl: null,
    };
  }
  if (!IMAGE_TYPES.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) {
    throw new PrepareError(`"${file.name}" isn't a photo or PDF.`);
  }
  const blob = await shrinkImage(file);
  return {
    id,
    name: file.name,
    mediaType: "image/jpeg",
    data: await blobToBase64(blob),
    previewUrl: URL.createObjectURL(blob),
  };
}

export async function preparePages(files: File[], existing: number): Promise<PreparedPage[]> {
  if (existing + files.length > MAX_PAGES) {
    throw new PrepareError(`You can add up to ${MAX_PAGES} pages for one document.`);
  }
  return Promise.all(files.map(preparePage));
}

/** Loads a bundled sample image as if the person had uploaded it. */
export async function prepareSample(url: string, name: string): Promise<PreparedPage> {
  const response = await fetch(url);
  const blob = await response.blob();
  return {
    id: crypto.randomUUID(),
    name,
    mediaType: "image/png",
    data: await blobToBase64(blob),
    previewUrl: url,
  };
}

export function releasePages(pages: PreparedPage[]): void {
  for (const page of pages) {
    if (page.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(page.previewUrl);
  }
}
