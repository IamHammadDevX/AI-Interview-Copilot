import { useRef, useState, useCallback, useEffect } from 'react';

export const useAutoMode = (capturing: boolean, takeScreenshot: () => void) => {
  const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const [autoMode, setAutoMode] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const startAutoScreenshots = useCallback(() => {
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
    }

    autoIntervalRef.current = setInterval(() => {
      takeScreenshot();
      setCountdown(60);
    }, 60000);
  }, [takeScreenshot]);

  const stopAutoScreenshots = useCallback(() => {
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    setCountdown(60);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const toggleAutoMode = useCallback(() => {
    const newAutoMode = !autoMode;
    setAutoMode(newAutoMode);

    if (newAutoMode && capturing) {
      startAutoScreenshots();
      startCountdown();
    } else {
      stopAutoScreenshots();
      stopCountdown();
    }
  }, [
    autoMode,
    capturing,
    startAutoScreenshots,
    stopAutoScreenshots,
    startCountdown,
    stopCountdown,
  ]);

  const resetAutoMode = useCallback(() => {
    stopAutoScreenshots();
    stopCountdown();
    setCountdown(60);
    setAutoMode(false);
  }, [stopAutoScreenshots, stopCountdown]);

  useEffect(() => {
    if (capturing && autoMode) {
      startAutoScreenshots();
      startCountdown();
    } else {
      stopAutoScreenshots();
      stopCountdown();
    }
  }, [
    capturing,
    autoMode,
    startAutoScreenshots,
    stopAutoScreenshots,
    startCountdown,
    stopCountdown,
  ]);

  useEffect(() => {
    return () => {
      stopAutoScreenshots();
      stopCountdown();
    };
  }, [stopAutoScreenshots, stopCountdown]);

  return {
    autoMode,
    countdown,
    toggleAutoMode,
    resetAutoMode,
  };
};
