import { create } from "zustand";
import type {
  Scenario,
  BudgetLineItem,
  BudgetItem,
  BudgetsData,
  RenovationProject,
  Contractor,
  EmailDraft,
  ProjectCommunication,
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

  // Budget-Project sync
  updateSubTaskCost: (projectId: string, subTaskId: string, field: "estimatedCost" | "actualCost", value: number) => Promise<void>;
  updateBudgetItemCost: (budgetItemId: string, field: "estimatedCost" | "actualCost", value: number) => Promise<void>;
  acceptQuoteAndSyncBudget: (projectId: string, quoteId: string) => Promise<void>;

  // Toast
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;

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

  // Communications
  drafts: EmailDraft[];
  getAllCommunications: () => (ProjectCommunication & { projectId: string; projectName: string })[];
  addDraft: (draft: EmailDraft) => void;
  updateDraft: (draft: EmailDraft) => void;
  deleteDraft: (id: string) => void;
  sendDraft: (draft: EmailDraft) => Promise<void>;
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

  // Toast
  toastMessage: null,
  setToastMessage: (msg) => set({ toastMessage: msg }),

  // Budget-Project sync
  updateSubTaskCost: async (projectId, subTaskId, field, value) => {
    const { projects, budgetData } = get();
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const subTask = project.subTasks.find((st) => st.id === subTaskId);
    if (!subTask) return;

    // Update the sub-task
    const updatedSubTask = { ...subTask, [field]: value, updatedAt: new Date().toISOString() };
    const updatedProject = {
      ...project,
      subTasks: project.subTasks.map((st) => (st.id === subTaskId ? updatedSubTask : st)),
      updatedAt: new Date().toISOString(),
    };

    // Update in store and persist projects
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? updatedProject : p)),
    }));
    await fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "project", project: updatedProject }),
    });

    // Sync to linked budget item
    if (subTask.budgetItemId) {
      const allItems = [...budgetData.renovation, ...budgetData.furniture];
      const budgetItem = allItems.find((b) => b.id === subTask.budgetItemId);
      if (budgetItem) {
        const updatedBudgetItem = { ...budgetItem, [field]: value };
        const key = budgetItem.budgetType === "renovation" ? "renovation" : "furniture";
        const newBudgetData = {
          ...budgetData,
          [key]: budgetData[key].map((b) => (b.id === budgetItem.id ? updatedBudgetItem : b)),
        };
        set({ budgetData: newBudgetData });
        await fetch("/api/budgets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "bulk", renovation: newBudgetData.renovation, furniture: newBudgetData.furniture }),
        });
      }
    }
  },

  updateBudgetItemCost: async (budgetItemId, field, value) => {
    const { budgetData, projects } = get();
    const allItems = [...budgetData.renovation, ...budgetData.furniture];
    const budgetItem = allItems.find((b) => b.id === budgetItemId);
    if (!budgetItem) return;

    // Update the budget item
    const updatedBudgetItem = { ...budgetItem, [field]: value };
    const key = budgetItem.budgetType === "renovation" ? "renovation" : "furniture";
    const newBudgetData = {
      ...budgetData,
      [key]: budgetData[key].map((b) => (b.id === budgetItemId ? updatedBudgetItem : b)),
    };
    set({ budgetData: newBudgetData });
    await fetch("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "bulk", renovation: newBudgetData.renovation, furniture: newBudgetData.furniture }),
    });

    // Sync to linked sub-task
    if (budgetItem.subTaskId && budgetItem.projectId) {
      const project = projects.find((p) => p.id === budgetItem.projectId);
      if (project) {
        const updatedProject = {
          ...project,
          subTasks: project.subTasks.map((st) =>
            st.id === budgetItem.subTaskId
              ? { ...st, [field]: value, updatedAt: new Date().toISOString() }
              : st
          ),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          projects: s.projects.map((p) => (p.id === budgetItem.projectId ? updatedProject : p)),
        }));
        await fetch("/api/projects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "project", project: updatedProject }),
        });
      }
    }
  },

  acceptQuoteAndSyncBudget: async (projectId, quoteId) => {
    const { projects, budgetData, contractors } = get();
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const quote = project.quotes.find((q) => q.id === quoteId);
    if (!quote) return;

    const contractor = contractors.find((c) => c.id === quote.contractorId);
    const contractorName = contractor?.name || "Unknown";

    // Accept the quote on the project
    const updatedProject = {
      ...project,
      acceptedQuoteId: quoteId,
      quotes: project.quotes.map((q) => ({ ...q, accepted: q.id === quoteId })),
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? updatedProject : p)),
    }));
    await fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "project", project: updatedProject }),
    });

    // Distribute quote amount across linked budget items proportionally
    const linkedSubTasks = project.subTasks.filter((st) => st.budgetItemId);
    if (linkedSubTasks.length > 0) {
      const totalEstimated = linkedSubTasks.reduce((sum, st) => sum + st.estimatedCost, 0);
      const newBudgetData = { ...budgetData };

      for (const st of linkedSubTasks) {
        if (!st.budgetItemId) continue;
        // Proportional share of the quote
        const share = totalEstimated > 0
          ? Math.round((st.estimatedCost / totalEstimated) * quote.amount)
          : Math.round(quote.amount / linkedSubTasks.length);

        const key: "renovation" | "furniture" = "renovation"; // renovation budget items are linked
        newBudgetData[key] = newBudgetData[key].map((b) =>
          b.id === st.budgetItemId
            ? { ...b, actualCost: share, acceptedQuoteContractor: contractorName, acceptedQuoteAmount: quote.amount }
            : b
        );
      }

      // Also update sub-task actual costs proportionally
      const updatedProjectWithCosts = {
        ...updatedProject,
        subTasks: updatedProject.subTasks.map((st) => {
          if (!st.budgetItemId || !linkedSubTasks.find((ls) => ls.id === st.id)) return st;
          const share = totalEstimated > 0
            ? Math.round((st.estimatedCost / totalEstimated) * quote.amount)
            : Math.round(quote.amount / linkedSubTasks.length);
          return { ...st, actualCost: share, updatedAt: new Date().toISOString() };
        }),
      };

      set((s) => ({
        budgetData: newBudgetData,
        projects: s.projects.map((p) => (p.id === projectId ? updatedProjectWithCosts : p)),
      }));

      await fetch("/api/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "bulk", renovation: newBudgetData.renovation, furniture: newBudgetData.furniture }),
      });
      await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "project", project: updatedProjectWithCosts }),
      });

      set({ toastMessage: `Quote accepted! Budget updated with ${contractorName}'s quote of $${quote.amount.toLocaleString()}.` });
      setTimeout(() => set({ toastMessage: null }), 5000);
    }
  },

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

  // Communications
  drafts: [],

  getAllCommunications: () => {
    const { projects } = get();
    const allComms: (ProjectCommunication & { projectId: string; projectName: string })[] = [];
    for (const project of projects) {
      for (const comm of project.communications) {
        allComms.push({ ...comm, projectId: project.id, projectName: project.name });
      }
    }
    allComms.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return allComms;
  },

  addDraft: (draft) => {
    set((s) => ({ drafts: [...s.drafts, draft] }));
  },

  updateDraft: (draft) => {
    set((s) => ({
      drafts: s.drafts.map((d) => (d.id === draft.id ? { ...draft, updatedAt: new Date().toISOString() } : d)),
    }));
  },

  deleteDraft: (id) => {
    set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) }));
  },

  sendDraft: async (draft) => {
    const { projects, updateProject } = get();
    const project = projects.find((p) => p.id === draft.projectId);
    if (!project) return;

    const comm: ProjectCommunication = {
      id: uuidv4(),
      date: new Date().toISOString(),
      type: "email",
      summary: `Email to ${draft.to}: ${draft.subject}`,
      contractorId: draft.contractorId,
    };

    await updateProject({
      ...project,
      communications: [...project.communications, comm],
    });

    // Mark draft as sent and remove from drafts
    set((s) => ({ drafts: s.drafts.filter((d) => d.id !== draft.id) }));
  },
}));
