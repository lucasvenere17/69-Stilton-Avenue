"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import roomsData from "@/data/rooms.json";
import type { RoomPolygon } from "@/lib/types";

const SceneViewer = dynamic(
  () => import("@/components/model3d/SceneViewer"),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-gray-400">Loading 3D viewer...</div> }
);

const rooms = roomsData.rooms as RoomPolygon[];

export default function ModelPage() {
  const [floor, setFloor] = useState<"main" | "upper">("main");
  const [focusRoom, setFocusRoom] = useState<string | null>(null);

  const floorRooms = rooms.filter((r) => r.floor === floor);

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-lg font-semibold mb-3">3D Model Viewer</h1>

          {/* Floor toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              onClick={() => { setFloor("main"); setFocusRoom(null); }}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                floor === "main"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              Main Floor
            </button>
            <button
              onClick={() => { setFloor("upper"); setFocusRoom(null); }}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                floor === "upper"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              Upper Floor
            </button>
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="px-2 py-1 text-xs text-gray-500 uppercase tracking-wider">
            Rooms
          </p>
          {floorRooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setFocusRoom(room.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                focusRoom === room.id
                  ? "bg-blue-600/20 text-blue-300"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: room.color }}
              />
              {room.name}
            </button>
          ))}
        </div>
      </aside>

      {/* 3D Canvas area */}
      <main className="flex-1 relative">
        <SceneViewer
          floor={floor}
          focusRoom={focusRoom}
          onRoomClick={(id) => setFocusRoom(id)}
        />
      </main>
    </div>
  );
}
