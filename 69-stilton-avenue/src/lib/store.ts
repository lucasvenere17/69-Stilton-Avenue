import { create } from "zustand";
import type {
  Scenario,
  BlueprintData,
  BudgetLineItem,
  WallSegment,
  DoorPlacement,
  WindowPlacement,
  Annotation,
} from "./types";
import { v4 as uuidv4 } from "uuid";

interface HistoryEntry {
  blueprintData: { main: BlueprintData; upper: BlueprintData };
}

interface AppState {
  // Scenarios
  scenarios: Scenario[];
  activeScenarioId: string | null;
  setActiveScenario: (id: string) => void;
  loadScenarios: () => Promise<void>;
  saveScenario: (scenario: Scenario) => Promise<void>;
  createScenario: (name: string) => Promise<Scenario>;
  duplicateScenario: (id: string, newName: string) => Promise<Scenario>;

  // Blueprint
  currentFloor: "main" | "upper";
  setCurrentFloor: (floor: "main" | "upper") => void;
  activeTool: "select" | "wall" | "door" | "window" | "annotate" | "erase";
  setActiveTool: (tool: AppState["activeTool"]) => void;
  addWall: (wall: WallSegment) => void;
  addDoor: (door: DoorPlacement) => void;
  addWindow: (win: WindowPlacement) => void;
  addAnnotation: (ann: Annotation) => void;
  removeElement: (type: string, id: string) => void;
  updateWall: (id: string, updates: Partial<WallSegment>) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;

  // Undo/Redo
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;

  // Budget
  updateBudgetItem: (item: BudgetLineItem) => void;
  addBudgetItem: (item: BudgetLineItem) => void;
  removeBudgetItem: (id: string) => void;

  // Photos
  selectedPhoto: string | null;
  setSelectedPhoto: (photo: string | null) => void;
}

const emptyBlueprint: BlueprintData = {
  walls: [],
  doors: [],
  windows: [],
  annotations: [],
  floor: "main",
};

const createEmptyScenario = (name: string): Scenario => ({
  id: uuidv4(),
  name,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  blueprintData: {
    main: { ...emptyBlueprint, floor: "main" },
    upper: { ...emptyBlueprint, floor: "upper" },
  },
  aiEdits: [],
  kitchenEdits: [],
  budgetItems: [],
  notes: "",
});

export const useAppStore = create<AppState>((set, get) => ({
  scenarios: [],
  activeScenarioId: null,
  currentFloor: "main",
  activeTool: "select",
  undoStack: [],
  redoStack: [],
  selectedPhoto: null,

  setActiveScenario: (id) => set({ activeScenarioId: id }),

  loadScenarios: async () => {
    try {
      const res = await fetch("/api/scenarios");
      const data = await res.json();
      set({ scenarios: data.scenarios || [] });
      if (data.scenarios?.length && !get().activeScenarioId) {
        set({ activeScenarioId: data.scenarios[0].id });
      }
    } catch {
      console.error("Failed to load scenarios");
    }
  },

  saveScenario: async (scenario) => {
    const updated = { ...scenario, updatedAt: new Date().toISOString() };
    await fetch("/api/scenarios", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    set((state) => ({
      scenarios: state.scenarios.map((s) => (s.id === updated.id ? updated : s)),
    }));
  },

  createScenario: async (name) => {
    const scenario = createEmptyScenario(name);
    await fetch("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scenario),
    });
    set((state) => ({
      scenarios: [...state.scenarios, scenario],
      activeScenarioId: scenario.id,
    }));
    return scenario;
  },

  duplicateScenario: async (id, newName) => {
    const source = get().scenarios.find((s) => s.id === id);
    if (!source) throw new Error("Scenario not found");
    const dup: Scenario = {
      ...JSON.parse(JSON.stringify(source)),
      id: uuidv4(),
      name: newName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await fetch("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dup),
    });
    set((state) => ({
      scenarios: [...state.scenarios, dup],
      activeScenarioId: dup.id,
    }));
    return dup;
  },

  setCurrentFloor: (floor) => set({ currentFloor: floor }),
  setActiveTool: (tool) => set({ activeTool: tool }),

  pushUndo: () => {
    const state = get();
    const scenario = state.scenarios.find((s) => s.id === state.activeScenarioId);
    if (!scenario) return;
    set((s) => ({
      undoStack: [...s.undoStack, { blueprintData: JSON.parse(JSON.stringify(scenario.blueprintData)) }],
      redoStack: [],
    }));
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;
    const scenario = state.scenarios.find((s) => s.id === state.activeScenarioId);
    if (!scenario) return;
    const prev = state.undoStack[state.undoStack.length - 1];
    set((s) => ({
      redoStack: [...s.redoStack, { blueprintData: JSON.parse(JSON.stringify(scenario.blueprintData)) }],
      undoStack: s.undoStack.slice(0, -1),
      scenarios: s.scenarios.map((sc) =>
        sc.id === s.activeScenarioId
          ? { ...sc, blueprintData: prev.blueprintData }
          : sc
      ),
    }));
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;
    const scenario = state.scenarios.find((s) => s.id === state.activeScenarioId);
    if (!scenario) return;
    const next = state.redoStack[state.redoStack.length - 1];
    set((s) => ({
      undoStack: [...s.undoStack, { blueprintData: JSON.parse(JSON.stringify(scenario.blueprintData)) }],
      redoStack: s.redoStack.slice(0, -1),
      scenarios: s.scenarios.map((sc) =>
        sc.id === s.activeScenarioId
          ? { ...sc, blueprintData: next.blueprintData }
          : sc
      ),
    }));
  },

  addWall: (wall) => {
    const state = get();
    const floor = state.currentFloor;
    get().pushUndo();
    set((s) => ({
      scenarios: s.scenarios.map((sc) =>
        sc.id === s.activeScenarioId
          ? {
              ...sc,
              blueprintData: {
                ...sc.blueprintData,
                [floor]: {
                  ...sc.blueprintData[floor],
                  walls: [...sc.blueprintData[floor].walls, wall],
                },
              },
            }
          : sc
      ),
    }));
  },

  addDoor: (door) => {
    const state = get();
    const floor = state.currentFloor;
    get().pushUndo();
    set((s) => ({
      scenarios: s.scenarios.map((sc) =>
        sc.id === s.activeScenarioId
          ? {
              ...sc,
              blueprintData: {
                ...sc.blueprintData,
                [floor]: {
                  ...sc.blueprintData[floor],
                  doors: [...sc.blueprintData[floor].doors, door],
                },
              },
            }
          : sc
      ),
    }));
  },

  addWindow: (win) => {
    const state = get();
    const floor = state.currentFloor;
    get().pushUndo();
    set((s) => ({
      scenarios: s.scenarios.map((sc) =>
        sc.id === s.activeScenarioId
          ? {
              ...sc,
              blueprintData: {
                ...sc.blueprintData,
                [floor]: {
                  ...sc.blueprintData[floor],
                  windows: [...sc.blueprintData[floor].windows, win],
                },
              },
            }
          : sc
      ),
    }));
  },

  addAnnotation: (ann) => {
    const state = get();
    const floor = state.currentFloor;
    get().pushUndo();
    set((s) => ({
      scenarios: s.scenarios.map((sc) =>
        sc.id === s.activeScenarioId
          ? {
              ...sc,
              blueprintData: {
                ...sc.blueprintData,
                [floor]: {
                  ...sc.blueprintData[floor],
                  annotations: [...sc.blueprintData[floor].annotations, ann],
                },
              },
            }
          : sc
      ),
    }));
  },

  removeElement: (type, id) => {
    const state = get();
    const floor = state.currentFloor;
    get().pushUndo();
    set((s) => ({
      scenarios: s.scenarios.map((sc) => {
        if (sc.id !== s.activeScenarioId) return sc;
        const bp = { ...sc.blueprintData[floor] };
        if (type === "wall") bp.walls = bp.walls.filter((w) => w.id !== id);
        if (type === "door") bp.doors = bp.doors.filter((d) => d.id !== id);
        if (type === "window") bp.windows = bp.windows.filter((w) => w.id !== id);
        if (type === "annotation") bp.annotations = bp.annotations.filter((a) => a.id !== id);
        return { ...sc, blueprintData: { ...sc.blueprintData, [floor]: bp } };
      }),
    }));
  },

  updateWall: (id, updates) => {
    const state = get();
    const floor = state.currentFloor;
    set((s) => ({
      scenarios: s.scenarios.map((sc) =>
        sc.id === s.activeScenarioId
          ? {
              ...sc,
              blueprintData: {
                ...sc.blueprintData,
                [floor]: {
                  ...sc.blueprintData[floor],
                  walls: sc.blueprintData[floor].walls.map((w) =>
                    w.id === id ? { ...w, ...updates } : w
                  ),
                },
              },
            }
          : sc
      ),
    }));
  },

  updateAnnotation: (id, updates) => {
    const state = get();
    const floor = state.currentFloor;
    set((s) => ({
      scenarios: s.scenarios.map((sc) =>
        sc.id === s.activeScenarioId
          ? {
              ...sc,
              blueprintData: {
                ...sc.blueprintData,
                [floor]: {
                  ...sc.blueprintData[floor],
                  annotations: sc.blueprintData[floor].annotations.map((a) =>
                    a.id === id ? { ...a, ...updates } : a
                  ),
                },
              },
            }
          : sc
      ),
    }));
  },

  updateBudgetItem: (item) => {
    set((s) => ({
      scenarios: s.scenarios.map((sc) =>
        sc.id === s.activeScenarioId
          ? {
              ...sc,
              budgetItems: sc.budgetItems.map((b) => (b.id === item.id ? item : b)),
            }
          : sc
      ),
    }));
  },

  addBudgetItem: (item) => {
    set((s) => ({
      scenarios: s.scenarios.map((sc) =>
        sc.id === s.activeScenarioId
          ? { ...sc, budgetItems: [...sc.budgetItems, item] }
          : sc
      ),
    }));
  },

  removeBudgetItem: (id) => {
    set((s) => ({
      scenarios: s.scenarios.map((sc) =>
        sc.id === s.activeScenarioId
          ? { ...sc, budgetItems: sc.budgetItems.filter((b) => b.id !== id) }
          : sc
      ),
    }));
  },

  setSelectedPhoto: (photo) => set({ selectedPhoto: photo }),
}));
