import { useEffect } from 'react';

export function useGlobalShortcut(
  code: string, // e.g. 'KeyX'
  callback: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.code === code) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [code, callback, enabled]);
}
