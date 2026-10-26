import { useEffect, useState } from 'react';
import { receiptApi } from '../services/api';

/** Loads protected receipt media through native HTTP inside the Android shell. */
export function useReceiptUrl(receiptKey: string | undefined): string | null {
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!receiptKey) return;

    void receiptApi.displayUrl(receiptKey)
      .then((nextUrl) => {
        if (!cancelled) setLoaded({ key: receiptKey, url: nextUrl });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [receiptKey]);

  return loaded && loaded.key === receiptKey ? loaded.url : null;
}
