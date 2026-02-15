import { NextRequest } from 'next/server';
import { OpenAI } from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/smart-question
 *
 * Lightweight endpoint that cleans up a raw transcript snippet into
 * a clear, well-formed interview question.  Uses gpt-4o-mini with
 * very tight constraints for sub-500ms latency.
 *
 * Body: { text: string }
 * Returns: { question: string }
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  try {
    const { text } = JSON.parse(rawBody) as { text?: string };
    if (!text?.trim()) {
      return Response.json({ question: '' }, { status: 200 });
    }

    const raw = text.trim();

    // ── Fast path: already a clean question ──
    if (raw.endsWith('?') && raw.split(/\s+/).length >= 3) {
      return Response.json({ question: raw });
    }

    // ── Heuristic: starts with a question word → just add "?" ──
    const qPattern =
      /^(what|how|why|when|where|who|which|can|could|would|should|do|does|did|is|are|was|were|have|has|had|will|shall|tell|explain|describe)/i;
    if (qPattern.test(raw)) {
      const cleaned = raw.replace(/[.!,;:]+$/, '').trim();
      if (cleaned.split(/\s+/).length >= 3) {
        return Response.json({ question: cleaned + '?' });
      }
    }

    // ── AI path: use gpt-4o-mini for complex cleanup ──
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback: just append "?"
      return Response.json({
        question: raw.replace(/[.!,;:]+$/, '').trim() + '?',
      });
    }

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a transcript cleaner. Given a raw speech transcript, output ONLY a single clean, grammatically correct interview question ending with "?". Remove filler words, repetitions, and fix grammar. Keep the original meaning. Output ONLY the question, nothing else.',
        },
        { role: 'user', content: raw },
      ],
      max_tokens: 100,
      temperature: 0,
    });

    const question =
      completion.choices[0]?.message?.content?.trim() ||
      raw.replace(/[.!,;:]+$/, '').trim() + '?';

    return Response.json({ question });
  } catch (err: any) {
    console.error('Smart question error:', err?.message);
    // Graceful fallback
    let fallback = '';
    try {
      fallback = JSON.parse(rawBody)?.text || '';
    } catch {
      void 0;
    }
    return Response.json({
      question: fallback.replace(/[.!,;:]+$/, '').trim() + '?',
    });
  }
}
