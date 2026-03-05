"use client";

import { useRef, useMemo, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import roomsData from "@/data/rooms.json";
import type { RoomPolygon, Point } from "@/lib/types";

const WALL_HEIGHT = 9;
const WALL_THICKNESS = 0.3;

const allRooms = roomsData.rooms as RoomPolygon[];

interface FloorModelProps {
  floor: "main" | "upper";
  focusRoom: string | null;
  onRoomClick: (roomId: string) => void;
}

/** Compute the center of a set of points. */
function getCenter(points: Point[]): { x: number; z: number } {
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, z: acc.z + p.y }),
    { x: 0, z: 0 }
  );
  return { x: sum.x / points.length, z: sum.z / points.length };
}

/** Build wall segments for a rectangular room defined by its corner points. */
function buildWalls(points: Point[], baseY: number) {
  const walls: {
    position: [number, number, number];
    size: [number, number, number];
  }[] = [];

  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];

    const cx = (a.x + b.x) / 2;
    const cz = (a.y + b.y) / 2;

    const dx = b.x - a.x;
    const dz = b.y - a.y;
    const length = Math.sqrt(dx * dx + dz * dz);

    // Determine wall orientation: horizontal (along x) or vertical (along z)
    const isHorizontal = Math.abs(dz) < 0.01;

    if (isHorizontal) {
      // Wall runs along x axis
      walls.push({
        position: [cx, baseY + WALL_HEIGHT / 2, cz],
        size: [length, WALL_HEIGHT, WALL_THICKNESS],
      });
    } else {
      // Wall runs along z axis
      walls.push({
        position: [cx, baseY + WALL_HEIGHT / 2, cz],
        size: [WALL_THICKNESS, WALL_HEIGHT, length],
      });
    }
  }

  return walls;
}

/** A single room rendered as a floor plane, walls, and a label. */
function Room({
  room,
  baseY,
  onRoomClick,
}: {
  room: RoomPolygon;
  baseY: number;
  onRoomClick: (roomId: string) => void;
}) {
  const center = useMemo(() => getCenter(room.points), [room.points]);
  const walls = useMemo(() => buildWalls(room.points, baseY), [room.points, baseY]);

  // Compute floor dimensions from bounding box of points
  const bounds = useMemo(() => {
    const xs = room.points.map((p) => p.x);
    const zs = room.points.map((p) => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
    };
  }, [room.points]);

  const floorWidth = bounds.maxX - bounds.minX;
  const floorDepth = bounds.maxZ - bounds.minZ;

  return (
    <group>
      {/* Floor plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[center.x, baseY + 0.01, center.z]}
        onClick={(e) => {
          e.stopPropagation();
          onRoomClick(room.id);
        }}
      >
        <planeGeometry args={[floorWidth, floorDepth]} />
        <meshStandardMaterial color={room.color} side={THREE.DoubleSide} />
      </mesh>

      {/* Walls */}
      {walls.map((wall, idx) => (
        <mesh key={`${room.id}-wall-${idx}`} position={wall.position}>
          <boxGeometry args={wall.size} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Room label */}
      <Text
        position={[center.x, baseY + WALL_HEIGHT * 0.55, center.z]}
        fontSize={1.2}
        color="#1a1a1a"
        anchorX="center"
        anchorY="middle"
        maxWidth={floorWidth - 1}
      >
        {room.name}
      </Text>
    </group>
  );
}

/** Camera animator: smoothly moves the camera toward a focused room. */
function CameraAnimator({
  focusRoom,
  floor,
}: {
  focusRoom: string | null;
  floor: "main" | "upper";
}) {
  const { camera } = useThree();
  const targetPos = useRef<THREE.Vector3 | null>(null);
  const targetLook = useRef<THREE.Vector3 | null>(null);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (!focusRoom) {
      isAnimating.current = false;
      return;
    }

    const room = allRooms.find((r) => r.id === focusRoom);
    if (!room) return;

    const center = getCenter(room.points);
    const baseY = floor === "upper" ? 9 : 0;

    // Camera position: above and offset from the room center
    targetPos.current = new THREE.Vector3(
      center.x + 8,
      baseY + 22,
      center.z + 12
    );
    targetLook.current = new THREE.Vector3(
      center.x,
      baseY + WALL_HEIGHT * 0.3,
      center.z
    );
    isAnimating.current = true;
  }, [focusRoom, floor]);

  useFrame(() => {
    if (!isAnimating.current || !targetPos.current || !targetLook.current) return;

    // Smoothly interpolate camera position
    camera.position.lerp(targetPos.current, 0.04);

    // Smoothly look at target
    const currentLook = new THREE.Vector3();
    camera.getWorldDirection(currentLook);
    currentLook.multiplyScalar(20).add(camera.position);
    currentLook.lerp(targetLook.current, 0.04);
    camera.lookAt(targetLook.current);

    // Stop animating when close enough
    if (camera.position.distanceTo(targetPos.current) < 0.1) {
      isAnimating.current = false;
    }
  });

  return null;
}

export default function FloorModel({ floor, focusRoom, onRoomClick }: FloorModelProps) {
  const baseY = floor === "upper" ? 9 : 0;
  const floorRooms = useMemo(
    () => allRooms.filter((r) => r.floor === floor),
    [floor]
  );

  return (
    <group>
      {floorRooms.map((room) => (
        <Room key={room.id} room={room} baseY={baseY} onRoomClick={onRoomClick} />
      ))}
      <CameraAnimator focusRoom={focusRoom} floor={floor} />
    </group>
  );
}
