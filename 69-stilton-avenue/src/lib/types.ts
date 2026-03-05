export interface Point {
  x: number;
  y: number;
}

export interface WallSegment {
  id: string;
  start: Point;
  end: Point;
  type: "existing" | "demolish" | "new";
  thickness: number;
}

export interface DoorPlacement {
  id: string;
  position: Point;
  rotation: number;
  width: number;
}

export interface WindowPlacement {
  id: string;
  position: Point;
  rotation: number;
  width: number;
}

export interface Annotation {
  id: string;
  position: Point;
  text: string;
  color: string;
}

export interface BlueprintData {
  walls: WallSegment[];
  doors: DoorPlacement[];
  windows: WindowPlacement[];
  annotations: Annotation[];
  floor: "main" | "upper";
}

export interface RoomPolygon {
  id: string;
  name: string;
  floor: "main" | "upper";
  points: Point[];
  widthFt: number;
  depthFt: number;
  color: string;
}

export interface PhotoMeta {
  filename: string;
  room: string;
  description: string;
  tags: string[];
}

export interface AIEditRequest {
  imageUrl: string;
  prompt: string;
  scenarioId: string;
}

export interface KitchenOption {
  id: string;
  component: string;
  name: string;
  color: string;
  imageUrl?: string;
  prompt: string;
}

export interface BudgetLineItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  subtotal: number;
}

export interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  blueprintData: {
    main: BlueprintData;
    upper: BlueprintData;
  };
  aiEdits: Array<{
    originalPhoto: string;
    editedPhoto: string;
    prompt: string;
  }>;
  kitchenEdits: Array<{
    originalPhoto: string;
    editedPhoto: string;
    component: string;
    material: string;
  }>;
  budgetItems: BudgetLineItem[];
  notes: string;
}
