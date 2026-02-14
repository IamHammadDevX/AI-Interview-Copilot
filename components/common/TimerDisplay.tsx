import React from 'react';
import { Clock, Circle } from 'lucide-react';

interface TimerDisplayProps {
  formattedTime: string;
  recording: boolean;
  isCompact?: boolean;
}

const TimerDisplay = ({ formattedTime, recording, isCompact }: TimerDisplayProps) => {

  if (isCompact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-card/70 backdrop-blur rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-1">
          {recording ? (
            <div className="relative">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <div className="absolute inset-0 w-2 h-2 bg-red-500 rounded-full animate-ping opacity-75" />
            </div>
          ) : (
            <Clock className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
        <div className={`font-mono text-sm font-bold transition-colors ${
          recording ? 'text-destructive' : 'text-foreground'
        }`}>
          {formattedTime}
        </div>
      </div>
    );
  }

  return (
    <div className="flex lg:w-full lg:justify-between p-2 bg-muted/40 rounded-2xl border border-border">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center justify-center lg:gap-3">
          <div className="flex items-center gap-2">
            {recording ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Circle className="w-3 h-3 text-red-500 fill-current" />
                  <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
                </div>
                <span className="hidden lg:block text-destructive font-medium">
                  Recording
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 opacity-60" />
                <span className="hidden text-sm lg:block text-muted-foreground">
                  Ready to record
                </span>
              </div>
            )}
          </div>
          <div
            className={`font-mono text-sm  lg:text-lg font-bold px-2 lg:px-3 lg:py-1 rounded transition-colors ${
              recording ? 'text-destructive bg-destructive/10' : 'text-foreground bg-background/60'
            }`}
          >
            {formattedTime}
          </div>
        </div>
      </div>
    </div>
  );
};


export default TimerDisplay;
