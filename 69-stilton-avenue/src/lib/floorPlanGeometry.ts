import type { RoomPolygon } from "./types";
import * as THREE from "three";

const FT_TO_UNITS = 1; // 1 foot = 1 unit in 3D space
const WALL_HEIGHT = 9; // 9 feet ceiling
const WALL_THICKNESS = 0.5;

export function createRoomFloor(room: RoomPolygon): THREE.Shape {
  const shape = new THREE.Shape();
  const pts = room.points;
  if (pts.length < 3) return shape;

  shape.moveTo(pts[0].x * FT_TO_UNITS, pts[0].y * FT_TO_UNITS);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i].x * FT_TO_UNITS, pts[i].y * FT_TO_UNITS);
  }
  shape.closePath();
  return shape;
}

export function createWallSegments(room: RoomPolygon): Array<{
  start: [number, number];
  end: [number, number];
  height: number;
  thickness: number;
}> {
  const walls: Array<{
    start: [number, number];
    end: [number, number];
    height: number;
    thickness: number;
  }> = [];
  const pts = room.points;

  for (let i = 0; i < pts.length; i++) {
    const next = (i + 1) % pts.length;
    walls.push({
      start: [pts[i].x * FT_TO_UNITS, pts[i].y * FT_TO_UNITS],
      end: [pts[next].x * FT_TO_UNITS, pts[next].y * FT_TO_UNITS],
      height: WALL_HEIGHT,
      thickness: WALL_THICKNESS,
    });
  }

  return walls;
}

export function createWallGeometry(
  start: [number, number],
  end: [number, number],
  height: number,
  thickness: number
): THREE.BufferGeometry {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  const geometry = new THREE.BoxGeometry(length, height, thickness);
  const matrix = new THREE.Matrix4();

  matrix.makeRotationY(-angle);
  matrix.setPosition(
    (start[0] + end[0]) / 2,
    height / 2,
    (start[1] + end[1]) / 2
  );

  geometry.applyMatrix4(matrix);
  return geometry;
}

export { WALL_HEIGHT, FT_TO_UNITS };
