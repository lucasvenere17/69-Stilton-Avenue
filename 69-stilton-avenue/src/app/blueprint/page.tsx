"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/lib/store";
import {
  MousePointer2,
  Minus,
  DoorOpen,
  AppWindow,
  MessageSquare,
  Eraser,
  Undo2,
  Redo2,
} from "lucide-react";

// Konva requires the browser DOM, so we must disable SSR
const BlueprintCanvas = dynamic(
  () => import("@/components/blueprint/BlueprintCanvas"),
  { ssr: false },
);

type ToolId = "select" | "wall" | "door" | "window" | "annotate" | "erase";

const TOOLS: { id: ToolId; label: string; icon: React.ReactNode }[] = [
  { id: "select", label: "Select", icon: <MousePointer2 size={18} /> },
  { id: "wall", label: "Wall", icon: <Minus size={18} /> },
  { id: "door", label: "Door", icon: <DoorOpen size={18} /> },
  { id: "window", label: "Window", icon: <AppWindow size={18} /> },
  { id: "annotate", label: "Annotate", icon: <MessageSquare size={18} /> },
  { id: "erase", label: "Erase", icon: <Eraser size={18} /> },
];

export default function BlueprintPage() {
  const scenarios = useAppStore((s) => s.scenarios);
  const activeScenarioId = useAppStore((s) => s.activeScenarioId);
  const loadScenarios = useAppStore((s) => s.loadScenarios);
  const currentFloor = useAppStore((s) => s.currentFloor);
  const setCurrentFloor = useAppStore((s) => s.setCurrentFloor);
  const activeTool = useAppStore((s) => s.activeTool);
  const setActiveTool = useAppStore((s) => s.setActiveTool);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const undoStack = useAppStore((s) => s.undoStack);
  const redoStack = useAppStore((s) => s.redoStack);

  const scenario = scenarios.find((s) => s.id === activeScenarioId);
  const blueprintData = scenario?.blueprintData[currentFloor];

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  // ---- No active scenario ----
  if (!scenario) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-semibold text-gray-700">No Scenario Selected</h2>
          <p className="text-gray-500">Create a scenario first to start editing blueprints.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-64px)]">
      {/* ---------- Top bar ---------- */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-2 gap-4 flex-wrap">
        {/* Floor toggle */}
        <div className="flex rounded-lg border overflow-hidden text-sm">
          <button
            className={`px-4 py-1.5 font-medium transition-colors ${
              currentFloor === "main"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => setCurrentFloor("main")}
          >
            Main Floor
          </button>
          <button
            className={`px-4 py-1.5 font-medium transition-colors ${
              currentFloor === "upper"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => setCurrentFloor("upper")}
          >
            Upstairs
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 rounded-lg border p-1 bg-gray-50">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              title={tool.label}
              onClick={() => setActiveTool(tool.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTool === tool.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tool.icon}
              <span className="hidden md:inline">{tool.label}</span>
            </button>
          ))}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo2 size={18} />
          </button>
        </div>
      </div>

      {/* ---------- Main area ---------- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative bg-gray-100">
          <BlueprintCanvas />
        </div>

        {/* Side panel: annotations list */}
        <aside className="w-64 border-l bg-white overflow-y-auto hidden lg:block">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm text-gray-700">Annotations</h3>
          </div>
          <div className="p-2 space-y-1">
            {blueprintData && blueprintData.annotations.length > 0 ? (
              blueprintData.annotations.map((ann) => (
                <div
                  key={ann.id}
                  className="flex items-start gap-2 rounded-md p-2 hover:bg-gray-50 text-sm"
                >
                  <span
                    className="mt-0.5 inline-block h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ann.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-gray-800 break-words">{ann.text}</p>
                    <p className="text-gray-400 text-xs">
                      ({Math.round(ann.position.x)}, {Math.round(ann.position.y)})
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-xs p-2">
                No annotations on this floor yet. Select the Annotate tool and click on the
                canvas to add one.
              </p>
            )}
          </div>

          {/* Summary counts */}
          {blueprintData && (
            <div className="border-t p-4 space-y-2 text-xs text-gray-500">
              <h4 className="font-semibold text-gray-700 text-sm">Elements</h4>
              <p>Walls: {blueprintData.walls.length}</p>
              <p>Doors: {blueprintData.doors.length}</p>
              <p>Windows: {blueprintData.windows.length}</p>
              <p>Annotations: {blueprintData.annotations.length}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
