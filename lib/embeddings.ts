import "server-only";

const OPENROUTER_EMBEDDING_MODEL = "text-embedding-3-small";

type OpenRouterEmbeddingsResponse = {
  data: Array<{ embedding: number[] }>;
};

const EMBEDDING_CACHE_MAX = 200;
const EMBEDDING_CACHE_TTL_MS = 10 * 60 * 1000;
const embeddingCache = new Map<string, { embedding: number[]; expiresAt: number }>();

function getOpenRouterKey() {
  const key = process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "Missing OpenRouter API key. Set OPEN_ROUTER_API_KEY (recommended) or OPENROUTER_API_KEY in server env."
    );
  }
  return key;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const keyText = text.trim();
  if (keyText) {
    const cached = embeddingCache.get(keyText);
    if (cached && cached.expiresAt > Date.now()) {
      embeddingCache.delete(keyText);
      embeddingCache.set(keyText, cached);
      return cached.embedding;
    }
  }

  const key = getOpenRouterKey();

  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: OPENROUTER_EMBEDDING_MODEL, input: text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter embeddings failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as OpenRouterEmbeddingsResponse;
  const embedding = json.data?.[0]?.embedding;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("OpenRouter embeddings returned invalid payload.");
  }

  if (keyText) {
    embeddingCache.set(keyText, {
      embedding,
      expiresAt: Date.now() + EMBEDDING_CACHE_TTL_MS,
    });
    if (embeddingCache.size > EMBEDDING_CACHE_MAX) {
      const first = embeddingCache.keys().next().value as string | undefined;
      if (first) embeddingCache.delete(first);
    }
  }

  return embedding;
}

export async function generateEmbeddingsBatch(texts: string[]) {
  if (texts.length === 0) return [] as number[][];
  const key = getOpenRouterKey();

  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: OPENROUTER_EMBEDDING_MODEL, input: texts }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter embeddings failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as OpenRouterEmbeddingsResponse;
  const out = json.data?.map((d) => d.embedding) ?? [];

  if (out.length !== texts.length) {
    throw new Error(
      `OpenRouter embeddings batch mismatch: expected ${texts.length}, got ${out.length}.`
    );
  }

  return out;
}
