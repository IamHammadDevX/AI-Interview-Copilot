import { useEffect } from 'react';

export const useExternalStop = (
  externalStop: boolean,
  capturing: boolean,
  stopCapture: () => void,
  onExternalStopHandled?: () => void
) => {
  useEffect(() => {
    if (externalStop && capturing) {
      stopCapture();
      onExternalStopHandled?.();
    }
  }, [externalStop, capturing, stopCapture, onExternalStopHandled]);
};
