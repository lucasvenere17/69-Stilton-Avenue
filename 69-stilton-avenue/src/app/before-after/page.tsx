"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAppStore } from "@/lib/store";
import PhotoGrid, {
  getRoomForPhoto,
} from "@/components/before-after/PhotoGrid";
import CompareSlider from "@/components/before-after/CompareSlider";
import AIEditPanel from "@/components/before-after/AIEditPanel";

// Build the full list of 43 listing photos
const ALL_PHOTOS = Array.from(
  { length: 43 },
  (_, i) => `n12792888_${i + 1}.jpg`
);

const ROOM_FILTERS = [
  "All",
  "Kitchen",
  "Living Room",
  "Bedroom",
  "Bathroom",
  "Exterior",
  "Dining Room",
  "Other",
] as const;

type RoomFilter = (typeof ROOM_FILTERS)[number];

export default function BeforeAfterPage() {
  const selectedPhoto = useAppStore((s) => s.selectedPhoto);
  const setSelectedPhoto = useAppStore((s) => s.setSelectedPhoto);
  const activeScenarioId = useAppStore((s) => s.activeScenarioId);
  const scenarios = useAppStore((s) => s.scenarios);
  const loadScenarios = useAppStore((s) => s.loadScenarios);

  const [filter, setFilter] = useState<RoomFilter>("All");
  const [afterImage, setAfterImage] = useState<string | null>(null);

  // Load scenarios on mount so we have an activeScenarioId
  useEffect(() => {
    if (scenarios.length === 0) {
      loadScenarios();
    }
  }, [scenarios.length, loadScenarios]);

  // Clear after image when selecting a different photo
  useEffect(() => {
    setAfterImage(null);
  }, [selectedPhoto]);

  // Check if current scenario already has an AI edit for this photo
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);
  const existingEdit = activeScenario?.aiEdits.find(
    (e) => e.originalPhoto === selectedPhoto
  );
  const displayAfter = afterImage ?? existingEdit?.editedPhoto ?? null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Before / After Gallery</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Select a listing photo, then use AI or upload an image to visualise
            renovations.
          </p>
        </div>

        {/* Room filter chips */}
        <div className="flex flex-wrap gap-2">
          {ROOM_FILTERS.map((room) => (
            <button
              key={room}
              onClick={() => setFilter(room)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === room
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
            >
              {room}
            </button>
          ))}
        </div>

        {/* Photo grid */}
        <PhotoGrid
          photos={ALL_PHOTOS}
          selectedPhoto={selectedPhoto}
          onSelect={(p) => setSelectedPhoto(p)}
          filter={filter}
        />

        {/* Selected photo detail area */}
        {selectedPhoto && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-zinc-800">
            {/* Left: preview / compare */}
            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {getRoomForPhoto(selectedPhoto)}
                <span className="text-sm font-normal text-zinc-500">
                  {selectedPhoto}
                </span>
              </h2>

              {displayAfter ? (
                <div className="aspect-[4/3]">
                  <CompareSlider
                    beforeSrc={`/assets/photos/${selectedPhoto}`}
                    afterSrc={displayAfter}
                  />
                </div>
              ) : (
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-zinc-700">
                  <Image
                    src={`/assets/photos/${selectedPhoto}`}
                    alt="Selected photo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              )}
            </div>

            {/* Right: AI edit panel */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Edit Photo</h2>
              <AIEditPanel
                selectedPhoto={selectedPhoto}
                scenarioId={activeScenarioId ?? ""}
                onEditComplete={(url) => setAfterImage(url)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
