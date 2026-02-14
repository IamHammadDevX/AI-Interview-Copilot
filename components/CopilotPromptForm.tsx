'use client';

import {
  getCurrentPrompt,
  handleSaveNewPrompt,
} from '@/libs/copilotPromptStore';
import { FileText, Save, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CopilotPromptEditor() {
  const router = useRouter();
  const [prompt, setPrompt] = useState<string>('');

  useEffect(() => {
    const prompt = getCurrentPrompt();
    if (!prompt) {
      setPrompt('You are a helpful AI assistant.');
      return;
    }
    setPrompt(prompt);
  }, []);

  const savePrompt = () => {
    const isSaved = handleSaveNewPrompt(prompt);
    if (!isSaved) {
      console.error('Failed to save prompt');
      return;
    }
    router.push('/panel');
  };
  return (
    <div className="w-full">
      <div className="max-w-4xl w-full mx-auto">
        <div className="bg-card/80 backdrop-blur rounded-3xl shadow-xl border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-[#FF6B00] to-[#FFA63D] px-8 py-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-11 h-11 bg-white/20 rounded-2xl mr-4">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  System Prompt Editor
                </h1>
                <p className="text-orange-100 mt-1">
                  Customize your AI assistant&apos;s behavior and personality
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="prompt"
                  className="flex items-center text-sm font-semibold text-foreground mb-3"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  System Prompt
                </label>
                <div className="relative">
                  <textarea
                    id="prompt"
                    className="w-full p-4 pb-8 border border-border rounded-2xl text-sm font-mono leading-relaxed resize-none focus:border-primary/70 focus:ring-4 focus:ring-ring/30 transition-all duration-200 bg-background/80"
                    rows={16}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your system prompt here..."
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-background px-2 py-1 rounded-md shadow-sm">
                    {prompt.length} characters
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Tip: Include your target role, years of experience, and key
                  skills in your prompt
                </p>
              </div>
              <div className="flex w-full justify-end">
                <button
                  type="button"
                  onClick={savePrompt}
                  className="cursor-pointer flex items-center px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-[#FF6B00] to-[#FFA63D] text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Your system prompt defines how the AI assistant behaves and responds
          to questions.
        </p>
      </div>
    </div>
  );
}
