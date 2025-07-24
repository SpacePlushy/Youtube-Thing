import { useState, useCallback } from 'react';

interface UseClipboardReturn {
  copyNotification: string | null;
  copyToClipboard: (text: string, label: string) => Promise<void>;
}

export function useClipboard(): UseClipboardReturn {
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotification(`${label} copied to clipboard!`);
      setTimeout(() => setCopyNotification(null), 2000);
    } catch {
      setCopyNotification('Failed to copy');
      setTimeout(() => setCopyNotification(null), 2000);
    }
  }, []);

  return {
    copyNotification,
    copyToClipboard
  };
}