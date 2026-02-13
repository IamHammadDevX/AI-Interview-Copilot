'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';

const ConnectVideo = () => {
  const connectVideoModal = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  const handleJoinMeet = () => {
    window.open(
      'https://meet.google.com/efa-ugrq-hcc',
      '_blank'
    );

    router.push('/panel');

  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center border-b border-base-300 space-y-6 px-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-extrabold">Connect Video ⚡️</h1>
        <p className="text-lg opacity-80">
          Start a video call with your team in seconds.
        </p>
      </div>

      <button
        className="btn"
        onClick={() => connectVideoModal.current?.showModal()}
      >
        Open Modal
      </button>
      <button className="btn btn-primary" onClick={handleJoinMeet}>
        Join Meet with Copilot
      </button>

      {/* Modal */}
      <dialog ref={connectVideoModal} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Connect to Google Meet</h3>
          <p className="py-4">
            This will open Google Meet and your Copilot assistant.
          </p>
          <div className="modal-action">
            <button
              className="btn"
              onClick={() => {
                connectVideoModal.current?.close();
                handleJoinMeet();  
              }}
            >
              Join
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>Close</button>
        </form>
      </dialog>
    </div>
  );
};

export default ConnectVideo;
