import { getCurrentPrompt } from '@/libs/copilotPromptStore';

interface ApiRequestParams {
  question: string;
  history: any[];
  imageDataUrl?: string;
  signal: AbortSignal;
}

export async function makeCopilotRequest({
  question,
  history,
  imageDataUrl,
  signal,
}: ApiRequestParams): Promise<Response> {
  const customPrompt = getCurrentPrompt();
  const llmProvider = process.env.NEXT_PUBLIC_LLM_PROVIDER || 'openai';

  const endpoint =
    llmProvider === 'deepseek' ? '/api/deepseek' : '/api/openai';

  const shouldIncludeImage = llmProvider === 'openai' && imageDataUrl;

  const requestBody = {
    transcript: question,
    history,
    customPrompt,
    ...(shouldIncludeImage && { image: imageDataUrl }),
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal,
  });

  return res;
}
