'use client';

import React, { useCallback, useRef, useState } from 'react';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSizeMB?: number;
}

export default function FileUpload({
  onUpload,
  accept,
  maxSizeMB = 25,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);
      setUploaded(false);

      if (file.size > maxSizeBytes) {
        setError(
          `File exceeds the ${maxSizeMB}MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB).`,
        );
        return;
      }

      setSelectedFile(file);
    },
    [maxSizeBytes, maxSizeMB],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dragActive) setDragActive(true);
    },
    [dragActive],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setError(null);
    setProgress(0);

    // Simulate progress ticking while the actual upload runs
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev === null || prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      await onUpload(selectedFile);
      clearInterval(interval);
      setProgress(100);
      setUploaded(true);
    } catch (err) {
      clearInterval(interval);
      setProgress(null);
      setError(
        err instanceof Error ? err.message : 'Upload failed. Please try again.',
      );
    }
  }, [selectedFile, onUpload]);

  const reset = useCallback(() => {
    setSelectedFile(null);
    setProgress(null);
    setError(null);
    setUploaded(false);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      {/* Drop zone */}
      {!selectedFile && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            flex cursor-pointer flex-col items-center justify-center
            rounded-lg border-2 border-dashed px-6 py-10 transition-colors
            ${
              dragActive
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }
          `}
        >
          <svg
            className="mb-3 h-10 w-10 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16v-8m0 0l-3 3m3-3l3 3M3 16.5V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18v-1.5M7.5 12.75L12 8.25l4.5 4.5"
            />
          </svg>
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-purple-600">
              Click to upload
            </span>{' '}
            or drag and drop
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {accept ? `Accepted: ${accept}` : 'Any file type'} &middot; Max{' '}
            {maxSizeMB}MB
          </p>

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* File preview */}
      {selectedFile && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatSize(selectedFile.size)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={reset}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Remove
            </button>
          </div>

          {/* Progress bar */}
          {progress !== null && (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    uploaded ? 'bg-green-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {uploaded ? 'Upload complete' : `${progress}%`}
              </p>
            </div>
          )}

          {/* Upload button */}
          {!uploaded && progress === null && (
            <button
              type="button"
              onClick={handleUpload}
              className="mt-3 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
            >
              Upload
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
