"use client";

import Image from "next/image";

/**
 * Hardcoded photo-to-room mapping.
 * Photos 1-6: Exterior, 7-11: Kitchen, 12-15: Living/Great Room,
 * 16-20: Dining Room, 21-28: Bedrooms, 29-35: Bathrooms, 36-43: Other
 */
export function getRoomForPhoto(filename: string): string {
  const match = filename.match(/_(\d+)\.jpg$/);
  if (!match) return "Other";
  const num = parseInt(match[1], 10);
  if (num >= 1 && num <= 6) return "Exterior";
  if (num >= 7 && num <= 11) return "Kitchen";
  if (num >= 12 && num <= 15) return "Living Room";
  if (num >= 16 && num <= 20) return "Dining Room";
  if (num >= 21 && num <= 28) return "Bedroom";
  if (num >= 29 && num <= 35) return "Bathroom";
  return "Other";
}

const ROOM_COLORS: Record<string, string> = {
  Exterior: "bg-green-600",
  Kitchen: "bg-amber-600",
  "Living Room": "bg-blue-600",
  "Dining Room": "bg-purple-600",
  Bedroom: "bg-pink-600",
  Bathroom: "bg-cyan-600",
  Other: "bg-zinc-600",
};

interface PhotoGridProps {
  photos: string[];
  selectedPhoto: string | null;
  onSelect: (photo: string) => void;
  filter: string;
}

export default function PhotoGrid({
  photos,
  selectedPhoto,
  onSelect,
  filter,
}: PhotoGridProps) {
  const filtered =
    filter === "All"
      ? photos
      : photos.filter((p) => getRoomForPhoto(p) === filter);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
      {filtered.map((photo) => {
        const room = getRoomForPhoto(photo);
        const isSelected = selectedPhoto === photo;

        return (
          <button
            key={photo}
            onClick={() => onSelect(photo)}
            className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
              isSelected
                ? "border-blue-500 ring-2 ring-blue-500/50 scale-[1.02]"
                : "border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <Image
              src={`/assets/photos/${photo}`}
              alt={`${room} photo`}
              fill
              sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
              className="object-cover"
            />
            {/* Room tag badge */}
            <span
              className={`absolute bottom-1 left-1 text-[10px] font-medium text-white px-1.5 py-0.5 rounded ${
                ROOM_COLORS[room] ?? "bg-zinc-600"
              }`}
            >
              {room}
            </span>
          </button>
        );
      })}

      {filtered.length === 0 && (
        <p className="col-span-full text-center text-zinc-500 py-8">
          No photos match this filter.
        </p>
      )}
    </div>
  );
}
