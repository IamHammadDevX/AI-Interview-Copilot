import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No audio file uploaded' },
        { status: 400 }
      );
    }

    const ab = await file.arrayBuffer();
    const uploadable = new File([ab], 'audio.webm', {
      type: file.type || 'audio/webm',
      lastModified: Date.now(),
    });
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const response = await openai.audio.transcriptions.create({
      file: uploadable,
      model: 'whisper-1',
      response_format: 'text',
    });

    return NextResponse.json({ transcript: response });
  } catch (err) {
    console.error('Transcribe API error:', err);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
