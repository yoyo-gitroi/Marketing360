'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveFormProps {
  children: React.ReactNode;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  debounceMs?: number;
}

export default function AutoSaveForm({
  children,
  onSave,
  debounceMs = 2000,
}: AutoSaveFormProps) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const MAX_RETRIES = 3;

  const collectFormData = useCallback((): Record<string, unknown> => {
    if (!formRef.current) return {};
    const fd = new FormData(formRef.current);
    const data: Record<string, unknown> = {};
    fd.forEach((value, key) => {
      // Handle multiple values for the same key (e.g. checkboxes)
      if (data[key] !== undefined) {
        const existing = data[key];
        data[key] = Array.isArray(existing)
          ? [...existing, value]
          : [existing, value];
      } else {
        data[key] = value;
      }
    });
    return data;
  }, []);

  const executeSave = useCallback(async () => {
    const payload = collectFormData();
    setStatus('saving');

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await onSaveRef.current(payload);
        setStatus('saved');
        return;
      } catch {
        if (attempt < MAX_RETRIES) {
          setStatus('error');
          const backoff = Math.pow(2, attempt) * 1000;
          await new Promise((r) => setTimeout(r, backoff));
          setStatus('saving');
        } else {
          setStatus('error');
        }
      }
    }
  }, [collectFormData]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      executeSave();
    }, debounceMs);
  }, [debounceMs, executeSave]);

  // Listen for input/change events on the form
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const handler = () => scheduleSave();

    form.addEventListener('input', handler);
    form.addEventListener('change', handler);

    return () => {
      form.removeEventListener('input', handler);
      form.removeEventListener('change', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleSave]);

  const statusLabel = {
    idle: null,
    saving: (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-yellow-600">
        <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
        Saving...
      </span>
    ),
    saved: (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Saved
      </span>
    ),
    error: (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Save failed — retrying...
      </span>
    ),
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => e.preventDefault()}
      className="relative"
    >
      {children}

      {status !== 'idle' && (
        <div className="mt-3 flex justify-end">{statusLabel[status]}</div>
      )}
    </form>
  );
}
