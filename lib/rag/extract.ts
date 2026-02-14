import "server-only";

import mammoth from "mammoth";

export type SupportedDocumentType = "pdf" | "docx" | "txt";

export function getSupportedDocumentType(
  fileName: string,
  mimeType?: string | null
): SupportedDocumentType | null {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".txt")) return "txt";

  if (!mimeType) return null;

  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (mimeType === "text/plain") return "txt";

  return null;
}

export async function extractTextFromBuffer(
  type: SupportedDocumentType,
  buffer: Buffer
) {
  if (type === "pdf") {
    const mod: any = await import("pdf-parse");
    const pdfParse: any = mod?.default ?? mod;
    const parsed = await pdfParse(buffer);
    return parsed.text ?? "";
  }

  if (type === "docx") {
    const res = await mammoth.extractRawText({ buffer });
    return res.value ?? "";
  }

  return buffer.toString("utf8");
}
