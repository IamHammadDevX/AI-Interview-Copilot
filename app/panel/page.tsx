'use client';

import Recorder from '@/components/Recorder';
import ScreenCapture from '@/components/ScreenCapture';
import ThinkingAnimation from '@/components/ThinkingAnimation';
import TranscribingAnimation from '@/components/TranscribingAnimation';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import ChatInput from '@/components/common/ChatInput';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import UpdatePromptModal from '@/components/common/UpdatePromptModal';
import useChatService from '@/hooks/useChatService';
import useMicPermission from '@/hooks/useMicPermission';
import { ChevronDown, Download, Edit3, Settings, Trash2 } from 'lucide-react';
import PreWithCopy from '@/components/PreWithCopy';

export default function CopilotPanel() {
  const { requestMic } = useMicPermission();
  const [captureStream, setCaptureStream] = useState<MediaStream | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const bottomRef = useRef<HTMLSpanElement | null>(null);
  const updatePromptModalRef = useRef<HTMLDialogElement>(null);
  const deleteHistoryModalRef = useRef<HTMLDialogElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    chatHistory,
    isThinking,
    isStreaming,
    handleTranscript,
    clearChatHistory,
  } = useChatService();

  const [shouldStopCapture, setShouldStopCapture] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isThinking, isTranscribing, isStreaming]);

  useEffect(() => {
    requestMic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleExternalStopHandled = useCallback(() => {
    setShouldStopCapture(false);
  }, []);

  const handleGoogleAPIDisconnect = useCallback(() => {
    console.log('🚨 Google API disconnected, stopping screen capture...');
    setShouldStopCapture(true);
  }, []);

  useEffect(() => {
    const handleMeetDisconnect = () => {
      handleGoogleAPIDisconnect();
    };
    window.addEventListener('google-api-disconnect', handleMeetDisconnect);

    return () => {
      window.removeEventListener('google-api-disconnect', handleMeetDisconnect);
    };
  }, [handleGoogleAPIDisconnect]);

  const handleScreenshot = async (dataUrl:string, fileName: string) => {
    await handleTranscript(`Image: ${fileName}`, dataUrl);
  };

  const handleExportChat = useCallback(() => {
    const contextData = {
      timestamp: new Date().toISOString(),
      chatHistory: chatHistory,
      totalMessages: chatHistory.length,
    };

    const blob = new Blob([JSON.stringify(contextData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-context-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsDropdownOpen(false);
  }, [chatHistory]);

  const openUpdatePromptModal = () => {
    if (updatePromptModalRef.current) {
      updatePromptModalRef.current.showModal();
    }
    setIsDropdownOpen(false);
  };

  const openDeleteHistoryModal = () => {
    if (deleteHistoryModalRef.current) {
      deleteHistoryModalRef.current.showModal();
    }
    setIsDropdownOpen(false);
  };

  const menuItems = [
    {
      label: 'Update Prompt',
      icon: Edit3,
      onClick: openUpdatePromptModal,
      description: 'Customize the AI assistant behavior',
      tone: 'primary',
    },
    {
      label: 'Export Chat',
      icon: Download,
      onClick: handleExportChat,
      description: 'Download conversation as JSON',
      tone: 'success',
    },
    {
      label: 'Delete Chat',
      icon: Trash2,
      onClick: openDeleteHistoryModal,
      description: 'Clear all conversation history',
      tone: 'error',
    },
  ];

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 grid-rows-[auto_1fr_auto] gap-2 lg:gap-4 p-2 lg:p-6">
      <UpdatePromptModal modalRef={updatePromptModalRef} />
      <ConfirmDeleteModal
        modalRef={deleteHistoryModalRef}
        handleClick={clearChatHistory}
      />
      <div className="rounded-3xl border border-base-300 bg-base-100/70 backdrop-blur shadow-xl flex items-center justify-center text-white max-h-64 lg:max-h-96 overflow-hidden">
        <ScreenCapture
          handleScreenshot={handleScreenshot}
          onStreamAvailable={setCaptureStream}
          externalStop={shouldStopCapture}
          onExternalStopHandled={handleExternalStopHandled}
        />
      </div>

      <div className="flex flex-col row-span-2 bg-base-100/80 backdrop-blur p-2 lg:p-4 rounded-3xl border border-base-300 shadow-xl overflow-hidden">
        <header className="flex items-center justify-between gap-3 text-lg sm:text-xl font-semibold px-2 py-2">
          <span className="truncate">Interview Copilot</span>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`cursor-pointer flex items-center gap-2 px-3 py-2 rounded-2xl border border-base-300 bg-base-100/70 hover:bg-base-100 active:bg-base-200 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary/15 shadow-sm hover:shadow-md ${
                isDropdownOpen ? 'ring-4 ring-primary/15 bg-base-100' : ''
              }`}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <Settings className="w-4 h-4 opacity-70" />
              <span className="hidden sm:inline text-sm font-medium">
                Settings
              </span>
              <ChevronDown
                className={`w-4 h-4 opacity-60 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div
                className={`
                absolute right-0 top-full mt-3 w-72 bg-base-100/90 backdrop-blur rounded-2xl 
                shadow-xl border border-base-300 z-50
                transform transition-all duration-200 ease-out
                ${
                  isDropdownOpen
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-95'
                }
              `}
              >
                <div className="py-2">
                  <div className="px-4 py-2 border-b border-base-300">
                    <h3 className="text-sm font-semibold">
                      Actions
                    </h3>
                    <p className="text-xs opacity-60 mt-0.5">
                      Manage your conversation
                    </p>
                  </div>

                  {menuItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={item.onClick}
                      className={`
                        cursor-pointer
                        w-full px-4 py-3 text-left flex items-start gap-3
                        transition-colors duration-150 ease-in-out
                        hover:bg-base-200/60 active:bg-base-200
                        focus:outline-none focus:bg-base-200/60
                        group
                      `}
                    >
                      <item.icon
                        className={`w-4 h-4 mt-0.5 ${
                          item.tone === 'primary'
                            ? 'text-primary'
                            : item.tone === 'success'
                              ? 'text-success'
                              : 'text-error'
                        } group-hover:scale-110 transition-transform duration-150`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {item.label}
                        </div>
                        <div className="text-xs opacity-60 mt-0.5 leading-relaxed">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="px-4 py-2 border-t border-base-300 bg-base-200/50 rounded-b-2xl">
                  <p className="text-xs opacity-60 text-center">
                    {chatHistory.length} messages in current session
                  </p>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-4">
          {chatHistory.map((t, i) => (
            <div
              key={i}
              className={`chat ${
                t.role === 'assistant' ? 'chat-start' : 'chat-end'
              }`}
            >
              <div
                className={`prose max-w-none prose-compact prose-sm shadow-sm prose-p:my-0 prose-li:my-0 prose-li:py-0 prose-ul:my-0 prose-ul:py-1 prose-pre:my-0 text-sm leading-tighter rounded-xl px-2 py-2 ${
                  t.role === 'assistant'
                    ? 'bg-base-100/70 text-base-content border border-base-300'
                    : 'bg-primary text-white border border-primary prose-invert'
                }`}
              >
                <ReactMarkdown
                  components={{ pre: PreWithCopy }}
                  remarkPlugins={[remarkGfm]}
                >
                  {t.content}
                </ReactMarkdown>
                {t.role === 'assistant' &&
                  isStreaming &&
                  i === chatHistory.length - 1 && (
                    <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1" />
                  )}
              </div>
            </div>
          ))}

          {isTranscribing && <TranscribingAnimation />}
          {isThinking && <ThinkingAnimation />}
          <span ref={bottomRef} />
        </div>

        <div className="border-t border-base-300 bg-base-100/70 backdrop-blur p-2">
          <ChatInput
            onSend={handleTranscript}
            isLoading={isThinking}
            isStreaming={isStreaming}
            placeholder="Type your question here…"
            disabled={isTranscribing}
          />
        </div>
      </div>

      <div className="bg-base-100/80 backdrop-blur p-2 lg:p-4 rounded-3xl border border-base-300 shadow-xl flex flex-col gap-4">
        <Recorder
          audioStream={captureStream}
          onAddUserTurn={(text) => handleTranscript(text)}
          onTranscribingChange={setIsTranscribing}
        />
      </div>
    </div>
  );
}
