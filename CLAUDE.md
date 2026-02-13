# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` - Starts Next.js development server on http://localhost:3000
- **Build**: `npm run build` - Creates production build
- **Production start**: `npm start` - Starts production server
- **Linting**: `npm run lint` - Runs Next.js ESLint checks
- **Install dependencies**: `npm install` or `npm i`

## Environment Setup

The application requires an OpenAI API key:

- Copy `.env.example` to `.env.local` (if exists) or create `.env.local`
- Set `OPENAI_API_KEY=your-openai-api-key-here`

## Architecture Overview

This is a Next.js 14 application for AI-powered interview assistance with real-time voice transcription and AI responses.

### Core Structure

**Main Application Flow:**

- Root page (`/`) → System prompt editor for customizing AI behavior
- Panel page (`/panel`) → Main interview copilot interface with chat, recording, and screen capture

**Key Components:**

- `CopilotPromptForm` - System prompt editor interface
- `CopilotPanel` - Main application with chat history, voice recording, and screen capture
- `Recorder` - Handles voice recording with dual transcription modes (Web Speech API / Whisper)
- `ScreenCapture` - Screen capture functionality for visual context
- `ChatInput` - Text input for manual questions

### API Endpoints

- `/api/copilot` - Streams AI responses using OpenAI GPT-4o with conversation history and image support
- `/api/transcribe` - Transcribes audio files using OpenAI Whisper

### State Management

- `libs/copilotPromptStore.ts` - Manages system prompts in localStorage
- `hooks/useChatService.ts` - Central chat state management
- `hooks/useVoiceRecorder.tsx` & `hooks/useWebSpeechRecorder.tsx` - Voice recording logic

### Technology Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: TailwindCSS with DaisyUI components
- **AI Integration**: OpenAI API (GPT-4o for chat, Whisper for transcription)
- **UI Components**: Lucide React icons, Framer Motion animations
- **Markdown**: React Markdown with syntax highlighting

### Transcription Architecture

The app supports dual transcription modes:

- **Web Speech API**: Browser-native, fast, free, Chrome/Edge only
- **Whisper**: OpenAI's model, slower but more accurate, requires API calls

Language configuration for Web Speech API is set in `config.ts` via `DEFAULT_WEB_SPEECH_LANGUAGE`.

### Data Flow

1. User inputs via voice (recorded) or text (typed)
2. Voice data transcribed via Web Speech API or Whisper API
3. Transcript + conversation history + optional screenshot sent to `/api/copilot`
4. AI response streamed back and displayed in chat interface
5. All interactions stored in component state for session context
