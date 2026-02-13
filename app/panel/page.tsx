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
      color: 'text-blue-600 hover:bg-blue-50',
    },
    {
      label: 'Export Chat',
      icon: Download,
      onClick: handleExportChat,
      description: 'Download conversation as JSON',
      color: 'text-green-600 hover:bg-green-50',
    },
    {
      label: 'Delete Chat',
      icon: Trash2,
      onClick: openDeleteHistoryModal,
      description: 'Clear all conversation history',
      color: 'text-red-600 hover:bg-red-50',
    },
  ];

  return (
    <div className="h-screen overflow-scroll w-screen grid grid-cols-1 lg:grid-cols-2 grid-rows-[auto_1fr_auto] gap-2 lg:gap-4 bg-gray-100 p-2 lg:p-6">
      <UpdatePromptModal modalRef={updatePromptModalRef} />
      <ConfirmDeleteModal
        modalRef={deleteHistoryModalRef}
        handleClick={clearChatHistory}
      />
      <div className="rounded-xl shadow flex items-center justify-center text-white max-h-64 lg:max-h-96 overflow-scroll">
        <ScreenCapture
          handleScreenshot={handleScreenshot}
          onStreamAvailable={setCaptureStream}
          externalStop={shouldStopCapture}
          onExternalStopHandled={handleExternalStopHandled}
        />
      </div>

      <div className="flex flex-col row-span-2 bg-white p-2 lg:p-4 rounded-xl shadow-lg overflow-hidden">
        <header className="flex items-center justify-between text-xl font-bold mb-4">
          <span className="hidden lg:block">🤖 Interview Copilot</span>
          <span className="lg:hidden">🤖 Copilot</span>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`cursor-pointer
                flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 
                bg-white hover:bg-gray-50 active:bg-gray-100 
                transition-all duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                shadow-sm hover:shadow-md
                ${
                  isDropdownOpen
                    ? 'ring-2 ring-blue-500 ring-offset-1 bg-gray-50'
                    : ''
                }
              `}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <Settings className="w-4 h-4 text-gray-600" />
              <span className="hidden sm:inline text-sm font-medium text-gray-700">
                Settings
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div
                className={`
                absolute right-0 top-full mt-2 w-72 bg-white rounded-xl 
                shadow-lg border border-gray-200 z-50
                transform transition-all duration-200 ease-out
                ${
                  isDropdownOpen
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-95'
                }
              `}
              >
                <div className="py-2">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">
                      Actions
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
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
                        hover:bg-gray-50 active:bg-gray-100
                        focus:outline-none focus:bg-gray-50
                        ${item.color.split(' ')[1]}
                        group
                      `}
                    >
                      <item.icon
                        className={`w-4 h-4 mt-0.5 ${
                          item.color.split(' ')[0]
                        } group-hover:scale-110 transition-transform duration-150`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-gray-800">
                          {item.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                  <p className="text-xs text-gray-500 text-center">
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
                    ? ' text-gray-900 border border-gray-200'
                    : 'bg-accent text-black font-medium border border-orange-400'
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
                    <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
                  )}
              </div>
            </div>
          ))}

          {isTranscribing && <TranscribingAnimation />}
          {isThinking && <ThinkingAnimation />}
          <span ref={bottomRef} />
        </div>

        <div className="border-t bg-white p-2">
          <ChatInput
            onSend={handleTranscript}
            isLoading={isThinking}
            isStreaming={isStreaming}
            placeholder="Type your question here…"
            disabled={isTranscribing}
          />
        </div>
      </div>

      <div className="bg-white p-2 lg:p-4 rounded-xl shadow-lg flex flex-col gap-4">
        <Recorder
          audioStream={captureStream}
          onAddUserTurn={(text) => handleTranscript(text)}
          onTranscribingChange={setIsTranscribing}
        />
      </div>
    </div>
  );
}
