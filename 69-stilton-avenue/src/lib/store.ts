import { create } from "zustand";
import type {
  Scenario,
  BudgetLineItem,
  BudgetItem,
  BudgetsData,
  RenovationProject,
  Contractor,
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

  // Budgets (renovation + furniture line items)
  budgetData: BudgetsData;
  loadBudgets: () => Promise<void>;
  saveBudgets: () => Promise<void>;
  updateBudgetDataItem: (item: BudgetItem) => void;
  addBudgetDataItem: (item: BudgetItem) => void;
  removeBudgetDataItem: (id: string) => void;

  // Projects
  projects: RenovationProject[];
  contractors: Contractor[];
  loadProjects: () => Promise<void>;
  saveProjects: () => Promise<void>;
  addProject: (project: RenovationProject) => Promise<void>;
  updateProject: (project: RenovationProject) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addContractor: (contractor: Contractor) => Promise<void>;
  updateContractor: (contractor: Contractor) => Promise<void>;
  deleteContractor: (id: string) => Promise<void>;
  updateProjectStatus: (id: string, status: RenovationProject["status"]) => Promise<void>;
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

  // Budgets
  budgetData: { renovation: [], furniture: [] },

  loadBudgets: async () => {
    try {
      const res = await fetch("/api/budgets");
      const data = await res.json();
      set({ budgetData: { renovation: data.renovation || [], furniture: data.furniture || [] } });
    } catch {
      console.error("Failed to load budgets");
    }
  },

  saveBudgets: async () => {
    const { budgetData } = get();
    await fetch("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "bulk", renovation: budgetData.renovation, furniture: budgetData.furniture }),
    });
  },

  updateBudgetDataItem: (item) => {
    set((s) => {
      const key = item.budgetType === "renovation" ? "renovation" : "furniture";
      return {
        budgetData: {
          ...s.budgetData,
          [key]: s.budgetData[key].map((b) => (b.id === item.id ? item : b)),
        },
      };
    });
  },

  addBudgetDataItem: (item) => {
    set((s) => {
      const key = item.budgetType === "renovation" ? "renovation" : "furniture";
      return {
        budgetData: {
          ...s.budgetData,
          [key]: [...s.budgetData[key], item],
        },
      };
    });
  },

  removeBudgetDataItem: (id) => {
    set((s) => ({
      budgetData: {
        renovation: s.budgetData.renovation.filter((b) => b.id !== id),
        furniture: s.budgetData.furniture.filter((b) => b.id !== id),
      },
    }));
  },

  // Projects
  projects: [],
  contractors: [],

  loadProjects: async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      set({ projects: data.projects || [], contractors: data.contractors || [] });
    } catch {
      console.error("Failed to load projects");
    }
  },

  saveProjects: async () => {
    const { projects, contractors } = get();
    await fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects, contractors }),
    });
  },

  addProject: async (project) => {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "project", project }),
    });
    set((s) => ({ projects: [...s.projects, project] }));
  },

  updateProject: async (project) => {
    const updated = { ...project, updatedAt: new Date().toISOString() };
    await fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "project", project: updated }),
    });
    set((s) => ({
      projects: s.projects.map((p) => (p.id === updated.id ? updated : p)),
    }));
  },

  deleteProject: async (id) => {
    await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "project", id }),
    });
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  },

  addContractor: async (contractor) => {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "contractor", contractor }),
    });
    set((s) => ({ contractors: [...s.contractors, contractor] }));
  },

  updateContractor: async (contractor) => {
    await fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "contractor", contractor }),
    });
    set((s) => ({
      contractors: s.contractors.map((c) => (c.id === contractor.id ? contractor : c)),
    }));
  },

  deleteContractor: async (id) => {
    await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "contractor", id }),
    });
    set((s) => ({ contractors: s.contractors.filter((c) => c.id !== id) }));
  },

  updateProjectStatus: async (id, status) => {
    const project = get().projects.find((p) => p.id === id);
    if (!project) return;
    const updated = { ...project, status, updatedAt: new Date().toISOString() };
    await fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "project", project: updated }),
    });
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? updated : p)),
    }));
  },
}));
