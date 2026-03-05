"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Stage, Layer, Line, Circle, Group, Text, Rect, Image as KonvaImage, Arc } from "react-konva";
import { useAppStore } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import type { Point } from "@/lib/types";

// ---------- helpers ----------

const WALL_COLORS: Record<string, string> = {
  existing: "#888888",
  demolish: "#ef4444",
  new: "#22c55e",
};

function useFloorImage(floor: "main" | "upper") {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.src =
      floor === "main"
        ? "/assets/blueprints/main_floor_plan.jpeg"
        : "/assets/blueprints/upstairs_floor_plan.jpeg";
    img.onload = () => setImage(img);
    return () => {
      img.onload = null;
    };
  }, [floor]);

  return image;
}

// ---------- component ----------

export default function BlueprintCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // store selectors
  const currentFloor = useAppStore((s) => s.currentFloor);
  const activeTool = useAppStore((s) => s.activeTool);
  const scenarios = useAppStore((s) => s.scenarios);
  const activeScenarioId = useAppStore((s) => s.activeScenarioId);
  const addWall = useAppStore((s) => s.addWall);
  const addDoor = useAppStore((s) => s.addDoor);
  const addWindow = useAppStore((s) => s.addWindow);
  const addAnnotation = useAppStore((s) => s.addAnnotation);
  const removeElement = useAppStore((s) => s.removeElement);
  const updateWall = useAppStore((s) => s.updateWall);

  const scenario = scenarios.find((s) => s.id === activeScenarioId);
  const blueprintData = scenario?.blueprintData[currentFloor];
  const floorImage = useFloorImage(currentFloor);

  // wall-drawing state: first click sets pendingStart, second click completes wall
  const [pendingStart, setPendingStart] = useState<Point | null>(null);
  // annotation popup
  const [annotationPopup, setAnnotationPopup] = useState<{ position: Point } | null>(null);
  const [annotationText, setAnnotationText] = useState("");
  // wall type selector
  const [wallType, setWallType] = useState<"existing" | "demolish" | "new">("new");

  // responsive sizing
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ---- zoom / pan helpers ----
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const scaleBy = 1.08;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.1, Math.min(10, newScale));
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    stage.scale({ x: clampedScale, y: clampedScale });
    stage.position({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
    stage.batchDraw();
  }, []);

  // ---- pointer position in stage coords ----
  const getStagePointerPos = useCallback((): Point | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    const scale = stage.scaleX();
    return {
      x: (pos.x - stage.x()) / scale,
      y: (pos.y - stage.y()) / scale,
    };
  }, []);

  // ---- stage click handler ----
  const handleStageClick = useCallback(
    () => {
      if (!scenario) return;

      const pos = getStagePointerPos();
      if (!pos) return;

      // --- Erase tool: handled at element level, but also stop here ---
      if (activeTool === "erase") return;

      // --- Wall tool ---
      if (activeTool === "wall") {
        if (!pendingStart) {
          setPendingStart(pos);
        } else {
          addWall({
            id: uuidv4(),
            start: pendingStart,
            end: pos,
            type: wallType,
            thickness: 6,
          });
          setPendingStart(null);
        }
        return;
      }

      // --- Door tool ---
      if (activeTool === "door") {
        addDoor({
          id: uuidv4(),
          position: pos,
          rotation: 0,
          width: 40,
        });
        return;
      }

      // --- Window tool ---
      if (activeTool === "window") {
        addWindow({
          id: uuidv4(),
          position: pos,
          rotation: 0,
          width: 50,
        });
        return;
      }

      // --- Annotate tool ---
      if (activeTool === "annotate") {
        setAnnotationPopup({ position: pos });
        setAnnotationText("");
        return;
      }
    },
    [activeTool, pendingStart, wallType, scenario, addWall, addDoor, addWindow, getStagePointerPos],
  );

  // ---- submit annotation ----
  const submitAnnotation = useCallback(() => {
    if (!annotationPopup || !annotationText.trim()) {
      setAnnotationPopup(null);
      return;
    }
    addAnnotation({
      id: uuidv4(),
      position: annotationPopup.position,
      text: annotationText.trim(),
      color: "#facc15",
    });
    setAnnotationPopup(null);
    setAnnotationText("");
  }, [annotationPopup, annotationText, addAnnotation]);

  // ---- erase helper ----
  const handleEraseClick = useCallback(
    (type: string, id: string) => {
      if (activeTool !== "erase") return;
      removeElement(type, id);
    },
    [activeTool, removeElement],
  );

  // ---- wall endpoint drag ----
  const handleWallEndpointDrag = useCallback(
    (wallId: string, endpoint: "start" | "end", newPos: Point) => {
      updateWall(wallId, { [endpoint]: newPos });
    },
    [updateWall],
  );

  // ---- render helpers ----
  const cursorStyle =
    activeTool === "select"
      ? "default"
      : activeTool === "erase"
        ? "crosshair"
        : "crosshair";

  const isDraggable = activeTool === "select";

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px]" style={{ cursor: cursorStyle }}>
      {/* Wall type selector shown when wall tool is active */}
      {activeTool === "wall" && (
        <div className="absolute top-2 left-2 z-20 flex gap-1 rounded bg-white/90 p-1 shadow text-xs">
          {(["new", "demolish", "existing"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setWallType(t)}
              className={`px-2 py-1 rounded capitalize ${
                wallType === t
                  ? "text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={wallType === t ? { backgroundColor: WALL_COLORS[t] } : undefined}
            >
              {t}
            </button>
          ))}
          {pendingStart && (
            <span className="ml-2 text-gray-500 self-center">Click to set end point...</span>
          )}
        </div>
      )}

      {/* Annotation text input popup */}
      {annotationPopup && (
        <div className="absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-4 min-w-[280px]">
          <p className="text-sm font-medium mb-2 text-gray-700">Add Annotation</p>
          <input
            autoFocus
            className="w-full border rounded px-2 py-1 text-sm mb-2"
            placeholder="Enter annotation text..."
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitAnnotation();
              if (e.key === "Escape") setAnnotationPopup(null);
            }}
          />
          <div className="flex gap-2 justify-end">
            <button
              className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200"
              onClick={() => setAnnotationPopup(null)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={submitAnnotation}
            >
              Add
            </button>
          </div>
        </div>
      )}

      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        draggable={activeTool === "select"}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        {/* Background image layer */}
        <Layer listening={false}>
          {floorImage && (
            <KonvaImage
              image={floorImage}
              x={0}
              y={0}
              width={floorImage.naturalWidth || stageSize.width}
              height={floorImage.naturalHeight || stageSize.height}
            />
          )}
        </Layer>

        {/* Elements layer */}
        <Layer>
          {/* ---------- Walls ---------- */}
          {blueprintData?.walls.map((wall) => (
            <Group key={wall.id} onClick={() => handleEraseClick("wall", wall.id)}>
              <Line
                points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
                stroke={WALL_COLORS[wall.type]}
                strokeWidth={wall.thickness}
                hitStrokeWidth={16}
                lineCap="round"
              />
              {/* Draggable endpoints (only in select mode) */}
              <Circle
                x={wall.start.x}
                y={wall.start.y}
                radius={6}
                fill={WALL_COLORS[wall.type]}
                stroke="#fff"
                strokeWidth={1}
                draggable={isDraggable}
                onDragEnd={(e) =>
                  handleWallEndpointDrag(wall.id, "start", {
                    x: e.target.x(),
                    y: e.target.y(),
                  })
                }
              />
              <Circle
                x={wall.end.x}
                y={wall.end.y}
                radius={6}
                fill={WALL_COLORS[wall.type]}
                stroke="#fff"
                strokeWidth={1}
                draggable={isDraggable}
                onDragEnd={(e) =>
                  handleWallEndpointDrag(wall.id, "end", {
                    x: e.target.x(),
                    y: e.target.y(),
                  })
                }
              />
            </Group>
          ))}

          {/* ---------- Doors ---------- */}
          {blueprintData?.doors.map((door) => (
            <Group
              key={door.id}
              x={door.position.x}
              y={door.position.y}
              rotation={door.rotation}
              onClick={() => handleEraseClick("door", door.id)}
              draggable={isDraggable}
            >
              {/* Door line */}
              <Line
                points={[0, 0, door.width, 0]}
                stroke="#854d0e"
                strokeWidth={3}
                lineCap="round"
              />
              {/* Door arc (swing) */}
              <Arc
                x={0}
                y={0}
                innerRadius={door.width - 2}
                outerRadius={door.width}
                angle={90}
                rotation={-90}
                fill="#854d0e"
                opacity={0.5}
              />
              {/* Small circle at hinge */}
              <Circle x={0} y={0} radius={3} fill="#854d0e" />
            </Group>
          ))}

          {/* ---------- Windows ---------- */}
          {blueprintData?.windows.map((win) => (
            <Group
              key={win.id}
              x={win.position.x}
              y={win.position.y}
              rotation={win.rotation}
              onClick={() => handleEraseClick("window", win.id)}
              draggable={isDraggable}
            >
              {/* Double line representing window */}
              <Line
                points={[0, -3, win.width, -3]}
                stroke="#3b82f6"
                strokeWidth={2}
              />
              <Line
                points={[0, 3, win.width, 3]}
                stroke="#3b82f6"
                strokeWidth={2}
              />
              {/* Center glass line */}
              <Line
                points={[0, 0, win.width, 0]}
                stroke="#93c5fd"
                strokeWidth={1}
                dash={[4, 4]}
              />
            </Group>
          ))}

          {/* ---------- Annotations ---------- */}
          {blueprintData?.annotations.map((ann) => (
            <Group
              key={ann.id}
              x={ann.position.x}
              y={ann.position.y}
              onClick={() => handleEraseClick("annotation", ann.id)}
              draggable={isDraggable}
            >
              {/* Pin circle */}
              <Circle x={0} y={0} radius={10} fill={ann.color} stroke="#fff" strokeWidth={2} />
              {/* Pin inner dot */}
              <Circle x={0} y={0} radius={3} fill="#fff" />
              {/* Label background */}
              <Rect
                x={14}
                y={-12}
                width={Math.max(ann.text.length * 7 + 12, 40)}
                height={24}
                fill="white"
                stroke={ann.color}
                strokeWidth={1}
                cornerRadius={4}
                shadowColor="rgba(0,0,0,0.15)"
                shadowBlur={4}
                shadowOffsetY={2}
              />
              {/* Label text */}
              <Text
                x={20}
                y={-8}
                text={ann.text}
                fontSize={12}
                fill="#1f2937"
                fontFamily="sans-serif"
              />
            </Group>
          ))}

          {/* Pending wall start indicator */}
          {pendingStart && activeTool === "wall" && (
            <Circle
              x={pendingStart.x}
              y={pendingStart.y}
              radius={6}
              fill={WALL_COLORS[wallType]}
              stroke="#fff"
              strokeWidth={2}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
