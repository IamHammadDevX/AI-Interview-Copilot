import "server-only";

import { generateEmbedding } from "@/lib/embeddings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SimilarChunk = {
  documentId: string;
  content: string;
  similarity: number;
};

function toPgVector(vec: number[]) {
  return `[${vec.join(",")}]`;
}

export async function searchSimilarChunks(
  projectId: string,
  query: string,
  {
    minSimilarity = 0.75,
    matchCount = 3,
  }: { minSimilarity?: number; matchCount?: number } = {}
) {
  const supabase = createSupabaseServerClient();

  const embedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("match_project_embeddings", {
    p_project_id: projectId,
    p_query_embedding: toPgVector(embedding),
    p_match_count: matchCount,
    p_min_similarity: minSimilarity,
  });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    document_id: string;
    content: string;
    similarity: number;
  }>;

  return rows.map((r) => ({
    documentId: r.document_id,
    content: r.content,
    similarity: r.similarity,
  })) satisfies SimilarChunk[];
}
