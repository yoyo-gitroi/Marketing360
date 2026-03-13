'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  /** Function that persists the data */
  saveFn: (data: Record<string, unknown>) => Promise<void>;
  /** The data object to watch for changes */
  data: Record<string, unknown>;
  /** Debounce delay in milliseconds (default 2000) */
  debounceMs?: number;
  /** Maximum retry attempts on failure (default 3) */
  maxRetries?: number;
}

interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  forceSave: () => Promise<void>;
}

export function useAutoSave({
  saveFn,
  data,
  debounceMs = 2000,
  maxRetries = 3,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);
  const dataRef = useRef(data);
  const isMountedRef = useRef(true);

  // Keep refs current without triggering re-renders
  saveFnRef.current = saveFn;
  dataRef.current = data;

  const executeSave = useCallback(
    async (payload: Record<string, unknown>) => {
      setStatus('saving');

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await saveFnRef.current(payload);
          if (isMountedRef.current) {
            setStatus('saved');
            setLastSavedAt(new Date());
          }
          return;
        } catch {
          if (attempt < maxRetries) {
            // Exponential backoff: 1s, 2s, 4s
            const backoff = Math.pow(2, attempt) * 1000;
            if (isMountedRef.current) {
              setStatus('error');
            }
            await new Promise((resolve) => setTimeout(resolve, backoff));
          } else {
            if (isMountedRef.current) {
              setStatus('error');
            }
          }
        }
      }
    },
    [maxRetries],
  );

  const forceSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await executeSave({ ...dataRef.current });
  }, [executeSave]);

  // Debounced save on data changes
  const serialized = JSON.stringify(data);
  const prevSerializedRef = useRef(serialized);

  useEffect(() => {
    // Skip the initial render — only save when data actually changes
    if (prevSerializedRef.current === serialized) return;
    prevSerializedRef.current = serialized;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      executeSave({ ...dataRef.current });
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [serialized, debounceMs, executeSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { status, lastSavedAt, forceSave };
}
