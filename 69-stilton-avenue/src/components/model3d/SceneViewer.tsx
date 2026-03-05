"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import FloorModel from "./FloorModel";

interface SceneViewerProps {
  floor: "main" | "upper";
  focusRoom: string | null;
  onRoomClick: (roomId: string) => void;
}

export default function SceneViewer({ floor, focusRoom, onRoomClick }: SceneViewerProps) {
  const cameraY = floor === "upper" ? 50 : 45;
  const cameraZ = floor === "upper" ? 35 : 30;
  const targetY = floor === "upper" ? 9 : 0;

  return (
    <Canvas
      camera={{
        position: [17, cameraY, cameraZ],
        fov: 50,
        near: 0.1,
        far: 500,
      }}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[20, 40, 20]} intensity={0.8} castShadow />
      <directionalLight position={[-10, 20, -10]} intensity={0.3} />

      {/* Ground reference plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[17, targetY - 0.05, 10]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Floor model with rooms */}
      <FloorModel floor={floor} focusRoom={focusRoom} onRoomClick={onRoomClick} />

      {/* Camera controls */}
      <OrbitControls
        target={[17, targetY, 10]}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={10}
        maxDistance={100}
        enableDamping
        dampingFactor={0.1}
      />
    </Canvas>
  );
}
