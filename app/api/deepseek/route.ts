import { defaultPrompt } from '@/libs/copilotPromptStore';
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

type Turn = { role: 'user' | 'assistant'; content: string };

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.DEEP_SEEK_API_KEY;
    if (!apiKey) {
      return new NextResponse(
        JSON.stringify({
          error: {
            code: 'missing_api_key',
            message:
              'DEEP_SEEK_API_KEY is not set. Add it to .env.local to use the DeepSeek provider.',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey,
    });

    /* ──────────────────────────────────────────────────────────────
      1. Parse incoming payload
       ───────────────────────────────────────────────────────────── */
    const body = await req.json();
    const {
      transcript,
      history = [],
      customPrompt,
      includeHistory = true,
    } = body;

    /* ──────────────────────────────────────────────────────────────
      2. Build SYSTEM prompt
       ────────────────────────────────────────────────────────────── */
    let systemPrompt = (customPrompt?.trim() || defaultPrompt).trim();

    if (includeHistory && history.length) {
      systemPrompt +=
        '\n\nUse the conversation history provided to give more contextually relevant answers.';
    }

    /* ──────────────────────────────────────────────────────────────
      3. Build USER message (image vs. text)
       ────────────────────────────────────────────────────────────── */
    const userMessage = { role: 'user', content: `Question: "${transcript}".` };

    /* ──────────────────────────────────────────────────────────────
      4. Assemble final message array for OpenAI
       ────────────────────────────────────────────────────────────── */
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...(includeHistory
        ? (history as Turn[]).map((t) => ({ role: t.role, content: t.content }))
        : []),
      userMessage,
    ];

    /* ──────────────────────────────────────────────────────────────
      5. Stream completion back to the client
       ────────────────────────────────────────────────────────────── */
    const stream = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      stream: true,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Copilot API error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to generate response' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
