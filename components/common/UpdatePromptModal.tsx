/* eslint-disable no-unused-vars */
import {
  getCurrentPrompt,
  handleSaveNewPrompt,
} from '@/libs/copilotPromptStore';
import { FileText, Save, Sparkles, X } from 'lucide-react';
import { RefObject, useEffect, useState } from 'react';

interface ModalProps {
  modalRef: RefObject<HTMLDialogElement>;
}

const UpdatePromptModal = ({ modalRef }: ModalProps) => {
  const [prompt, setPrompt] = useState<string>('');

  useEffect(() => {
    const dialog = modalRef.current;

    const handleOpen = async () => {
      if (dialog?.open) {
        const currentPrompt = getCurrentPrompt();
        if (!currentPrompt) {
          setPrompt('You are a helpful AI assistant.');
          return;
        }
        setPrompt(currentPrompt);
      }
    };

    if (dialog?.open) {
      handleOpen();
    }

    const observer = new MutationObserver(() => {
      if (dialog?.open) {
        handleOpen();
      }
    });

    if (dialog) {
      observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    }

    return () => observer.disconnect();
  }, [modalRef]);


  const savePrompt = async () => {
    const isSaved = handleSaveNewPrompt(prompt);
    if (!isSaved) {
      console.error('Failed to save prompt');
      return;
    }
    modalRef.current?.close();
  };

  const handleCancel = () => {
    setPrompt(prompt);
    modalRef.current?.close();
  };

  return (
    <dialog ref={modalRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box max-w-4xl w-full max-h-[90vh] p-0 overflow-hidden bg-base-100/90 backdrop-blur border border-base-300 rounded-3xl">
        <div className="bg-gradient-to-r from-[#FF6B00] to-[#FFA63D] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg mr-3">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Update System Prompt
              </h3>
              <p className="text-white/90 text-sm">
                Quick edit your AI assistant&apos;s behavior
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="modal-prompt"
                className="flex items-center text-sm font-semibold text-base-content mb-2"
              >
                <FileText className="h-4 w-4 mr-2" />
                System Prompt
              </label>
              <div className="relative">
                <textarea
                  id="modal-prompt"
                  className="w-full p-3 pb-8 border border-base-300 rounded-2xl text-sm font-mono leading-relaxed resize-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10 transition-all duration-200 bg-base-100/80"
                  rows={12}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your system prompt here..."
                />
                <div className="absolute bottom-3 right-3 text-xs opacity-60 bg-base-100 px-2 py-1 rounded-md shadow-sm">
                  {prompt.length} characters
                </div>
              </div>
              <p className="text-xs opacity-70 mt-1">
                💡 Tip: Include your target role, years of experience, and key
                skills in your prompt
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-base-300 px-6 py-4 bg-base-200/40">
          <div className="flex justify-between items-center gap-3">
            <button
              onClick={handleCancel}
              className="btn btn-ghost"
            >
              Close
            </button>

            <button
              onClick={savePrompt}
              className="btn btn-primary"
            >
              <Save className="h-4 w-4 mr-2" />
              Update Prompt
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};

export default UpdatePromptModal;
