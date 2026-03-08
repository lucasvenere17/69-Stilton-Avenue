import { create } from "zustand";
import type {
  Scenario,
  BudgetLineItem,
} from "./types";
import { v4 as uuidv4 } from "uuid";

interface AppState {
  // Scenarios
  scenarios: Scenario[];
  activeScenarioId: string | null;
  setActiveScenario: (id: string) => void;
  loadScenarios: () => Promise<void>;
  saveScenario: (scenario: Scenario) => Promise<void>;
  createScenario: (name: string) => Promise<Scenario>;
  duplicateScenario: (id: string, newName: string) => Promise<Scenario>;

  // Budget
  updateBudgetItem: (item: BudgetLineItem) => void;
  addBudgetItem: (item: BudgetLineItem) => void;
  removeBudgetItem: (id: string) => void;

  // Photos
  selectedPhoto: string | null;
  setSelectedPhoto: (photo: string | null) => void;
}

const createEmptyScenario = (name: string): Scenario => ({
  id: uuidv4(),
  name,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  blueprintData: {
    main: { walls: [], doors: [], windows: [], annotations: [], floor: "main" },
    upper: { walls: [], doors: [], windows: [], annotations: [], floor: "upper" },
  },
  aiEdits: [],
  kitchenEdits: [],
  budgetItems: [],
  notes: "",
});

export const useAppStore = create<AppState>((set, get) => ({
  scenarios: [],
  activeScenarioId: null,
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
