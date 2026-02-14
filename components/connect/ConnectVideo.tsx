'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ConnectVideo = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleJoinMeet = () => {
    window.open(
      'https://meet.google.com/efa-ugrq-hcc',
      '_blank'
    );

    router.push('/panel');

  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center border-b border-border space-y-6 px-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-extrabold">Connect Video ⚡️</h1>
        <p className="text-lg opacity-80">
          Start a video call with your team in seconds.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={() => setOpen(true)}>
          Open details
        </Button>
        <Button onClick={handleJoinMeet}>Join Meet with Copilot</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect to Google Meet</DialogTitle>
            <DialogDescription>
              This opens Google Meet in a new tab and then takes you to the panel.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                handleJoinMeet();
              }}
            >
              Join
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConnectVideo;
