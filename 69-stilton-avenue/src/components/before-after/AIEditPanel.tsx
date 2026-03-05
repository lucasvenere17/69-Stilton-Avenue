"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";

interface AIEditPanelProps {
  selectedPhoto: string;
  scenarioId: string;
  onEditComplete: (imageUrl: string) => void;
}

export default function AIEditPanel({
  selectedPhoto,
  scenarioId,
  onEditComplete,
}: AIEditPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --------------- AI Edit ---------------
  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: `/assets/photos/${selectedPhoto}`,
          prompt: prompt.trim(),
          scenarioId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      onEditComplete(data.imageUrl);
      setPrompt("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // --------------- Manual Upload ---------------
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    onEditComplete(url);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-4">
      {/* AI prompt section */}
      <div>
        <label
          htmlFor="ai-prompt"
          className="block text-sm font-medium text-zinc-300 mb-1"
        >
          Describe the renovation
        </label>
        <textarea
          id="ai-prompt"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='e.g. "Replace the countertops with white quartz and add a subway tile backsplash"'
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          disabled={loading}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !prompt.trim()}
          className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Spinner />
              Generating...
            </>
          ) : (
            "Generate AI Edit"
          )}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-md bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-700" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-zinc-900 px-2 text-zinc-500">
            or upload manually
          </span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "border-zinc-700 hover:border-zinc-500 bg-zinc-800/50"
        }`}
      >
        <svg
          className="h-8 w-8 text-zinc-500 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16v-8m0 0l-3 3m3-3l3 3M4.5 19.5h15"
          />
        </svg>
        <p className="text-sm text-zinc-400">
          Drag &amp; drop an &quot;after&quot; image here, or click to browse
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>
    </div>
  );
}

// ---------- tiny spinner ----------
function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
