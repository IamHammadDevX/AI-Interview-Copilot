import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { generateEmbeddingsBatch } from "@/lib/embeddings";
import { extractTextFromBuffer, getSupportedDocumentType } from "@/lib/rag/extract";
import { chunkTextByApproxTokens, cleanExtractedText } from "@/lib/rag/text";

const EMBEDDING_DIM = 1536;
const EMBEDDING_BATCH_SIZE = 32;
const INSERT_BATCH_SIZE = 100;

function assertEmbeddingDim(vec: number[]) {
  if (vec.length !== EMBEDDING_DIM) {
    throw new Error(`Unexpected embedding dimension: ${vec.length}`);
  }
}

export async function ingestUploadedDocument(params: {
  documentId: string;
  projectId: string;
  userId: string;
  fileName: string;
  mimeType: string | null;
  buffer: Buffer;
  storeExtractedText?: boolean;
}) {
  const {
    documentId,
    projectId,
    userId,
    fileName,
    mimeType,
    buffer,
    storeExtractedText = true,
  } = params;

  const type = getSupportedDocumentType(fileName, mimeType);
  if (!type) {
    throw new Error("Unsupported file type.");
  }

  const admin = createSupabaseServiceRoleClient();

  const { error: startErr } = await admin
    .from("documents")
    .update({ status: "processing", error: null })
    .eq("id", documentId);

  if (startErr) throw new Error(startErr.message);

  try {
    const rawText = await extractTextFromBuffer(type, buffer);
    const cleaned = cleanExtractedText(rawText);

    const chunks = chunkTextByApproxTokens(cleaned, {
      minTokens: 800,
      maxTokens: 1000,
      hardMaxTokens: 1200,
      maxChunks: 300,
    });

    if (storeExtractedText) {
      await admin
        .from("documents")
        .update({ extracted_text: cleaned })
        .eq("id", documentId);
    }

    await admin.from("embeddings").delete().eq("document_id", documentId);

    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const inputs = batch.map((b) => b.content);
      const vectors = await generateEmbeddingsBatch(inputs);

      vectors.forEach(assertEmbeddingDim);

      const rows = batch.map((b, j) => ({
        document_id: documentId,
        project_id: projectId,
        content: b.content,
        token_count: b.tokenEstimate,
        chunk_index: i + j,
        embedding: vectors[j] as unknown,
      }));

      for (let k = 0; k < rows.length; k += INSERT_BATCH_SIZE) {
        const slice = rows.slice(k, k + INSERT_BATCH_SIZE);
        const { error } = await admin.from("embeddings").insert(slice);
        if (error) throw new Error(error.message);
      }
    }

    const { error: doneErr } = await admin
      .from("documents")
      .update({ status: "ready", error: null, user_id: userId })
      .eq("id", documentId);

    if (doneErr) throw new Error(doneErr.message);
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "Ingestion failed";
    await admin
      .from("documents")
      .update({ status: "error", error: msg, user_id: userId })
      .eq("id", documentId);
    throw e;
  }
}

