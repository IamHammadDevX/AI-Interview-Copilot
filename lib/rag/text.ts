import "server-only";

export function cleanExtractedText(input: string) {
  const normalized = input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\u0000").join("")
    .replace(/\t/g, " ")
    .replace(/[ \f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized;
}

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function chunkTextByApproxTokens(
  text: string,
  {
    minTokens = 800,
    maxTokens = 1000,
    hardMaxTokens = 1200,
    maxChunks = 300,
  }: {
    minTokens?: number;
    maxTokens?: number;
    hardMaxTokens?: number;
    maxChunks?: number;
  } = {}
) {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  const chunks: { content: string; tokenEstimate: number }[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  const flush = () => {
    const content = current.join("\n\n").trim();
    if (!content) return;
    chunks.push({ content, tokenEstimate: estimateTokens(content) });
    current = [];
    currentTokens = 0;
  };

  for (const para of paragraphs) {
    const t = estimateTokens(para);

    if (t > hardMaxTokens) {
      flush();
      const words = para.split(/\s+/).filter(Boolean);
      let acc: string[] = [];
      for (const w of words) {
        acc.push(w);
        const cand = acc.join(" ");
        if (estimateTokens(cand) >= maxTokens) {
          chunks.push({ content: cand, tokenEstimate: estimateTokens(cand) });
          acc = [];
          if (chunks.length >= maxChunks) return chunks;
        }
      }
      if (acc.length) {
        const rest = acc.join(" ");
        chunks.push({ content: rest, tokenEstimate: estimateTokens(rest) });
      }
      if (chunks.length >= maxChunks) return chunks;
      continue;
    }

    if (currentTokens + t > maxTokens && currentTokens >= minTokens) {
      flush();
      if (chunks.length >= maxChunks) return chunks;
    }

    current.push(para);
    currentTokens += t;

    if (currentTokens >= hardMaxTokens) {
      flush();
      if (chunks.length >= maxChunks) return chunks;
    }
  }

  flush();
  return chunks.slice(0, maxChunks);
}
