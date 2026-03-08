"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import type {
  RenovationProject,
  Contractor,
  ProjectStatus,
  ProjectQuote,
  ProjectCommunication,
  SubTask,
  SubTaskStatus,
} from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ClipboardCheck,
  Users,
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  FileText,
  Phone,
  Mail,
  User,
  Trash2,
  ExternalLink,
  DollarSign,
  Loader2,
  GripVertical,
  Pencil,
  Search,
  Star,
  Globe,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Status config ──
const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; color: string; bg: string }
> = {
  not_started: { label: "Not Started", color: "text-gray-700", bg: "bg-gray-100" },
  getting_quotes: { label: "Getting Quotes", color: "text-blue-700", bg: "bg-blue-100" },
  quoted: { label: "Quoted", color: "text-indigo-700", bg: "bg-indigo-100" },
  scheduled: { label: "Scheduled", color: "text-yellow-700", bg: "bg-yellow-100" },
  in_progress: { label: "In Progress", color: "text-orange-700", bg: "bg-orange-100" },
  inspection_needed: { label: "Inspection Needed", color: "text-purple-700", bg: "bg-purple-100" },
  on_hold: { label: "On Hold", color: "text-red-700", bg: "bg-red-100" },
  completed: { label: "Completed", color: "text-green-700", bg: "bg-green-100" },
};

const SUBTASK_STATUS_CONFIG: Record<
  SubTaskStatus,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  not_started: {
    label: "To Do",
    icon: <Circle className="w-4 h-4" />,
    color: "text-gray-500",
    bg: "bg-gray-100",
  },
  in_progress: {
    label: "In Progress",
    icon: <Loader2 className="w-4 h-4" />,
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  completed: {
    label: "Done",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-green-600",
    bg: "bg-green-100",
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-gray-500" },
  medium: { label: "Medium", color: "text-blue-600" },
  high: { label: "High", color: "text-orange-600" },
  critical: { label: "Critical", color: "text-red-600" },
};

const ALL_STATUSES: ProjectStatus[] = [
  "not_started", "getting_quotes", "quoted", "scheduled",
  "in_progress", "inspection_needed", "on_hold", "completed",
];

const ALL_SUBTASK_STATUSES: SubTaskStatus[] = ["not_started", "in_progress", "completed"];

// ── Main Page ──
export default function ProjectsPage() {
  const {
    projects, contractors, loadProjects,
    addProject, updateProject, deleteProject,
    addContractor, updateContractor, deleteContractor,
    updateProjectStatus,
  } = useAppStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [contractorDialogOpen, setContractorDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<RenovationProject | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const notStarted = projects.filter((p) => p.status === "not_started").length;
  const inProgress = projects.filter((p) =>
    ["getting_quotes", "quoted", "scheduled", "in_progress", "inspection_needed"].includes(p.status)
  ).length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const totalBudget = projects.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);

  const openAddProject = () => {
    setEditingProject(null);
    setProjectDialogOpen(true);
  };

  const openEditProject = (p: RenovationProject) => {
    setEditingProject(p);
    setProjectDialogOpen(true);
  };

  const openAddContractor = () => {
    setEditingContractor(null);
    setContractorDialogOpen(true);
  };

  const openEditContractor = (c: Contractor) => {
    setEditingContractor(c);
    setContractorDialogOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 p-4 bg-white border rounded-lg">
          <Circle className="w-5 h-5 text-gray-400" />
          <div>
            <div className="text-2xl font-bold">{notStarted}</div>
            <div className="text-sm text-muted-foreground">Not Started</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white border rounded-lg">
          <Clock className="w-5 h-5 text-orange-500" />
          <div>
            <div className="text-2xl font-bold">{inProgress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white border rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <div>
            <div className="text-2xl font-bold">{completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white border rounded-lg">
          <DollarSign className="w-5 h-5 text-emerald-500" />
          <div>
            <div className="text-2xl font-bold">${totalBudget.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Budget</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={openAddProject}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </button>
        <button
          onClick={openAddContractor}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition text-sm font-medium"
        >
          <Users className="w-4 h-4" />
          Add Contractor
        </button>
      </div>

      {/* Project Cards */}
      <div className="space-y-3">
        {projects.map((project) => {
          const isExpanded = expandedId === project.id;
          const statusCfg = STATUS_CONFIG[project.status];
          const priorityCfg = PRIORITY_CONFIG[project.priority];
          const assignedContractors = contractors.filter((c) =>
            project.contractorIds.includes(c.id)
          );
          const subTasks = project.subTasks || [];
          const completedSubTasks = subTasks.filter((st) => st.status === "completed").length;

          return (
            <div key={project.id} className="bg-white border rounded-lg overflow-hidden">
              {/* Card Header */}
              <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 transition"
                onClick={() => setExpandedId(isExpanded ? null : project.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <ClipboardCheck className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{project.name}</span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          statusCfg.bg,
                          statusCfg.color
                        )}
                      >
                        {statusCfg.label}
                      </span>
                      <span className={cn("text-xs font-medium", priorityCfg.color)}>
                        {priorityCfg.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                      {subTasks.length > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {completedSubTasks}/{subTasks.length} tasks
                        </span>
                      )}
                      {project.estimatedCost ? (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${project.estimatedCost.toLocaleString()}
                        </span>
                      ) : null}
                      {assignedContractors.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {assignedContractors.map((c) => c.name).join(", ")}
                        </span>
                      )}
                      {project.estimatedStartDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {project.estimatedStartDate}
                          {project.estimatedEndDate && ` - ${project.estimatedEndDate}`}
                        </span>
                      )}
                    </div>
                    {/* Sub-task progress bar */}
                    {subTasks.length > 0 && (
                      <div className="mt-2 w-full max-w-xs h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{
                            width: `${(completedSubTasks / subTasks.length) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <ProjectDetail
                  project={project}
                  contractors={contractors}
                  onUpdate={updateProject}
                  onDelete={deleteProject}
                  onEditProject={openEditProject}
                  onEditContractor={openEditContractor}
                  onStatusChange={updateProjectStatus}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Project Dialog */}
      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        project={editingProject}
        contractors={contractors}
        onSave={async (p) => {
          if (editingProject) {
            await updateProject(p);
          } else {
            await addProject(p);
          }
          setProjectDialogOpen(false);
        }}
      />

      {/* Contractor Dialog */}
      <ContractorDialog
        open={contractorDialogOpen}
        onOpenChange={setContractorDialogOpen}
        contractor={editingContractor}
        onSave={async (c) => {
          if (editingContractor) {
            await updateContractor(c);
          } else {
            await addContractor(c);
          }
          setContractorDialogOpen(false);
        }}
        onDelete={editingContractor ? async () => {
          await deleteContractor(editingContractor.id);
          setContractorDialogOpen(false);
        } : undefined}
      />
    </div>
  );
}

// ── Project Detail (expanded card content) ──
function ProjectDetail({
  project,
  contractors,
  onUpdate,
  onDelete,
  onEditProject,
  onEditContractor,
  onStatusChange,
}: {
  project: RenovationProject;
  contractors: Contractor[];
  onUpdate: (p: RenovationProject) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEditProject: (p: RenovationProject) => void;
  onEditContractor: (c: Contractor) => void;
  onStatusChange: (id: string, status: ProjectStatus) => Promise<void>;
}) {
  return (
    <div className="border-t px-4 pb-4">
      {/* Top actions */}
      <div className="flex items-center gap-3 py-3 flex-wrap">
        <label className="text-sm font-medium">Status:</label>
        <select
          value={project.status}
          onChange={(e) => onStatusChange(project.id, e.target.value as ProjectStatus)}
          className="text-sm border rounded px-2 py-1"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_CONFIG[s].label}
            </option>
          ))}
        </select>
        <button
          onClick={() => onEditProject(project)}
          className="text-sm px-3 py-1 border rounded hover:bg-accent transition ml-auto"
        >
          Edit Project
        </button>
        <button
          onClick={() => {
            if (confirm("Delete this project?")) onDelete(project.id);
          }}
          className="text-sm px-3 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <Tabs.Root defaultValue="subtasks">
        <Tabs.List className="flex border-b mb-4">
          <Tabs.Trigger
            value="subtasks"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground"
          >
            Sub-Tasks ({(project.subTasks || []).length})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="quotes"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground"
          >
            Quotes ({project.quotes.length})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="communications"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground"
          >
            Communications ({project.communications.length})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="contractors"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground"
          >
            Contractors
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="subtasks">
          <SubTasksTab
            project={project}
            contractors={contractors}
            onUpdate={onUpdate}
          />
        </Tabs.Content>

        <Tabs.Content value="quotes">
          <QuotesTab
            project={project}
            contractors={contractors}
            onUpdate={onUpdate}
          />
        </Tabs.Content>

        <Tabs.Content value="communications">
          <CommunicationsTab
            project={project}
            onUpdate={onUpdate}
          />
        </Tabs.Content>

        <Tabs.Content value="contractors">
          <ContractorsTab
            project={project}
            contractors={contractors}
            onEditContractor={onEditContractor}
          />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

// ── Sub-Tasks Tab (Notion/Asana style) ──
function SubTasksTab({
  project,
  contractors,
  onUpdate,
}: {
  project: RenovationProject;
  contractors: Contractor[];
  onUpdate: (p: RenovationProject) => Promise<void>;
}) {
  const [expandedSubTaskId, setExpandedSubTaskId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEstCost, setNewEstCost] = useState("");

  const subTasks = project.subTasks || [];
  const completedCount = subTasks.filter((st) => st.status === "completed").length;
  const totalEstimated = subTasks.reduce((sum, st) => sum + st.estimatedCost, 0);
  const totalActual = subTasks.reduce((sum, st) => sum + st.actualCost, 0);

  const addSubTask = () => {
    if (!newTitle.trim()) return;
    const now = new Date().toISOString();
    const st: SubTask = {
      id: uuidv4(),
      title: newTitle.trim(),
      description: "",
      status: "not_started",
      estimatedCost: parseFloat(newEstCost) || 0,
      actualCost: 0,
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
    onUpdate({
      ...project,
      subTasks: [...subTasks, st],
    });
    setNewTitle("");
    setNewEstCost("");
    setShowAddForm(false);
  };

  const updateSubTask = (updated: SubTask) => {
    onUpdate({
      ...project,
      subTasks: subTasks.map((st) => (st.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : st)),
    });
  };

  const deleteSubTask = (id: string) => {
    onUpdate({
      ...project,
      subTasks: subTasks.filter((st) => st.id !== id),
    });
  };

  const cycleStatus = (st: SubTask) => {
    const order: SubTaskStatus[] = ["not_started", "in_progress", "completed"];
    const nextIdx = (order.indexOf(st.status) + 1) % order.length;
    updateSubTask({ ...st, status: order[nextIdx] });
  };

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            {completedCount}/{subTasks.length} completed
          </span>
          {subTasks.length > 0 && (
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(completedCount / subTasks.length) * 100}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span>Est: ${totalEstimated.toLocaleString()}</span>
          {totalActual > 0 && <span>Actual: ${totalActual.toLocaleString()}</span>}
        </div>
      </div>

      {/* Sub-task list */}
      <div className="border rounded-lg divide-y">
        {subTasks.map((st) => {
          const isExpanded = expandedSubTaskId === st.id;
          const statusCfg = SUBTASK_STATUS_CONFIG[st.status];

          return (
            <div key={st.id} className="group">
              {/* Sub-task row */}
              <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition">
                <GripVertical className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition shrink-0 cursor-grab" />

                {/* Status toggle button */}
                <button
                  onClick={() => cycleStatus(st)}
                  className={cn("shrink-0 transition", statusCfg.color)}
                  title={`Status: ${statusCfg.label} (click to change)`}
                >
                  {statusCfg.icon}
                </button>

                {/* Title + expand */}
                <button
                  onClick={() => setExpandedSubTaskId(isExpanded ? null : st.id)}
                  className="flex-1 text-left flex items-center gap-2 min-w-0"
                >
                  <span
                    className={cn(
                      "text-sm font-medium truncate",
                      st.status === "completed" && "line-through text-muted-foreground"
                    )}
                  >
                    {st.title}
                  </span>
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0",
                      isExpanded && "rotate-90"
                    )}
                  />
                </button>

                {/* Cost badge */}
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {st.estimatedCost > 0 ? `$${st.estimatedCost.toLocaleString()}` : "TBD"}
                </span>

                {/* Link icon */}
                {st.link && (
                  <a
                    href={st.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-blue-500 hover:text-blue-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {/* Status badge */}
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium shrink-0 hidden sm:inline",
                    statusCfg.bg,
                    statusCfg.color
                  )}
                >
                  {statusCfg.label}
                </span>
              </div>

              {/* Expanded sub-task detail */}
              {isExpanded && (
                <SubTaskDetail
                  subTask={st}
                  contractors={contractors}
                  onUpdate={updateSubTask}
                  onDelete={() => deleteSubTask(st.id)}
                />
              )}
            </div>
          );
        })}

        {subTasks.length === 0 && !showAddForm && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No sub-tasks yet. Add one to get started.
          </div>
        )}

        {/* Add sub-task row */}
        {showAddForm ? (
          <div className="p-3 bg-accent/20">
            <div className="flex items-center gap-3">
              <Circle className="w-4 h-4 text-gray-300 shrink-0" />
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubTask()}
                placeholder="Sub-task name..."
                className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground"
              />
              <input
                value={newEstCost}
                onChange={(e) => setNewEstCost(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubTask()}
                placeholder="Est. cost"
                type="number"
                className="w-24 text-sm border rounded px-2 py-1"
              />
              <button
                onClick={addSubTask}
                className="text-sm px-3 py-1 bg-primary text-primary-foreground rounded hover:opacity-90 transition"
              >
                Add
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewTitle(""); setNewEstCost(""); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 transition"
          >
            <Plus className="w-4 h-4" />
            Add sub-task
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sub-Task Detail Panel ──
function SubTaskDetail({
  subTask,
  contractors,
  onUpdate,
  onDelete,
}: {
  subTask: SubTask;
  contractors: Contractor[];
  onUpdate: (st: SubTask) => void;
  onDelete: () => void;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");

  const startEdit = (field: string, value: string) => {
    setEditingField(field);
    setTempValue(value);
  };

  const saveEdit = (field: string) => {
    const updates: Partial<SubTask> = {};
    if (field === "description") updates.description = tempValue;
    if (field === "notes") updates.notes = tempValue;
    if (field === "estimatedCost") updates.estimatedCost = parseFloat(tempValue) || 0;
    if (field === "actualCost") updates.actualCost = parseFloat(tempValue) || 0;
    if (field === "link") updates.link = tempValue || undefined;
    onUpdate({ ...subTask, ...updates });
    setEditingField(null);
  };

  return (
    <div className="px-10 pb-4 pt-1 bg-accent/10 border-t border-dashed space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Status */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
          <select
            value={subTask.status}
            onChange={(e) => onUpdate({ ...subTask, status: e.target.value as SubTaskStatus })}
            className="w-full text-sm border rounded px-3 py-1.5 mt-1"
          >
            {ALL_SUBTASK_STATUSES.map((s) => (
              <option key={s} value={s}>{SUBTASK_STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>

        {/* Assigned Contractor */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned To</label>
          <select
            value={subTask.assignedContractorId || ""}
            onChange={(e) => onUpdate({ ...subTask, assignedContractorId: e.target.value || undefined })}
            className="w-full text-sm border rounded px-3 py-1.5 mt-1"
          >
            <option value="">Unassigned</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company && `(${c.company})`}
              </option>
            ))}
          </select>
        </div>

        {/* Estimated Cost */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estimated Cost</label>
          {editingField === "estimatedCost" ? (
            <div className="flex gap-1 mt-1">
              <input
                autoFocus
                type="number"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveEdit("estimatedCost")}
                onBlur={() => saveEdit("estimatedCost")}
                className="flex-1 text-sm border rounded px-3 py-1.5"
              />
            </div>
          ) : (
            <button
              onClick={() => startEdit("estimatedCost", String(subTask.estimatedCost))}
              className="w-full text-left text-sm border rounded px-3 py-1.5 mt-1 hover:bg-white transition group flex items-center justify-between"
            >
              <span>{subTask.estimatedCost > 0 ? `$${subTask.estimatedCost.toLocaleString()}` : "TBD"}</span>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </button>
          )}
        </div>

        {/* Actual Cost */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Actual Cost</label>
          {editingField === "actualCost" ? (
            <div className="flex gap-1 mt-1">
              <input
                autoFocus
                type="number"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveEdit("actualCost")}
                onBlur={() => saveEdit("actualCost")}
                className="flex-1 text-sm border rounded px-3 py-1.5"
              />
            </div>
          ) : (
            <button
              onClick={() => startEdit("actualCost", String(subTask.actualCost))}
              className="w-full text-left text-sm border rounded px-3 py-1.5 mt-1 hover:bg-white transition group flex items-center justify-between"
            >
              <span>{subTask.actualCost > 0 ? `$${subTask.actualCost.toLocaleString()}` : "$0"}</span>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
        {editingField === "description" ? (
          <div className="mt-1">
            <textarea
              autoFocus
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={() => saveEdit("description")}
              className="w-full text-sm border rounded px-3 py-1.5 min-h-[60px]"
            />
          </div>
        ) : (
          <button
            onClick={() => startEdit("description", subTask.description)}
            className="w-full text-left text-sm border rounded px-3 py-1.5 mt-1 min-h-[40px] hover:bg-white transition group"
          >
            {subTask.description || <span className="text-muted-foreground italic">Click to add description...</span>}
            <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 inline ml-2" />
          </button>
        )}
      </div>

      {/* Link */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Product Link</label>
        {editingField === "link" ? (
          <div className="mt-1">
            <input
              autoFocus
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEdit("link")}
              onBlur={() => saveEdit("link")}
              placeholder="https://..."
              className="w-full text-sm border rounded px-3 py-1.5"
            />
          </div>
        ) : subTask.link ? (
          <div className="flex items-center gap-2 mt-1">
            <a
              href={subTask.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline truncate flex-1"
            >
              {subTask.link}
            </a>
            <button
              onClick={() => startEdit("link", subTask.link || "")}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => startEdit("link", "")}
            className="text-sm text-muted-foreground hover:text-foreground mt-1 italic"
          >
            + Add link
          </button>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
        {editingField === "notes" ? (
          <div className="mt-1">
            <textarea
              autoFocus
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={() => saveEdit("notes")}
              className="w-full text-sm border rounded px-3 py-1.5 min-h-[60px]"
            />
          </div>
        ) : (
          <button
            onClick={() => startEdit("notes", subTask.notes)}
            className="w-full text-left text-sm border rounded px-3 py-1.5 mt-1 min-h-[40px] hover:bg-white transition group"
          >
            {subTask.notes || <span className="text-muted-foreground italic">Click to add notes...</span>}
            <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 inline ml-2" />
          </button>
        )}
      </div>

      {/* Delete */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => { if (confirm("Delete this sub-task?")) onDelete(); }}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete sub-task
        </button>
      </div>
    </div>
  );
}

// ── Contractors Tab ──
function ContractorsTab({
  project,
  contractors,
  onEditContractor,
}: {
  project: RenovationProject;
  contractors: Contractor[];
  onEditContractor: (c: Contractor) => void;
}) {
  const router = useRouter();
  const [findModalOpen, setFindModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const assignedContractors = contractors.filter((c) =>
    project.contractorIds.includes(c.id)
  );

  const handleDraftOutreach = (contractorId: string) => {
    router.push(`/communications?projectId=${project.id}&contractorId=${contractorId}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setFindModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-medium"
        >
          <Search className="w-3.5 h-3.5" />
          Find Contractors
        </button>
      </div>

      {assignedContractors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contractors assigned. Edit the project to assign contractors, or use Find Contractors above.</p>
      ) : (
        <div className="space-y-2">
          {assignedContractors.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-3 border rounded-lg text-sm"
            >
              <User className="w-4 h-4 text-muted-foreground" />
              <div
                className="flex-1 min-w-0 cursor-pointer hover:text-primary transition"
                onClick={() => onEditContractor(c)}
              >
                <span className="font-medium">{c.name}</span>
                {c.company && <span className="text-muted-foreground"> - {c.company}</span>}
                {c.rating && (
                  <span className="ml-2 text-yellow-500 inline-flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-current" /> {c.rating}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{c.trade}</span>
              {c.phone && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {c.phone}
                </span>
              )}
              {c.website && (
                <a
                  href={c.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Globe className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={() => handleDraftOutreach(c.id)}
                className="text-xs px-2 py-1 border rounded hover:bg-accent transition flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                Draft Outreach
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Find Contractors Modal */}
      <Dialog.Root open={findModalOpen} onOpenChange={setFindModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 w-full max-w-lg z-50 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold">Find Contractors</Dialog.Title>
              <Dialog.Close className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for contractors by trade, name, or location..."
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition">
                  <Search className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center py-8 border rounded-lg bg-gray-50">
                <Search className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-muted-foreground">AI contractor search coming soon</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use the search above to manually find contractors, or add them from the main contractors list.
                </p>
              </div>

              {/* Recommended Contractors Section */}
              {assignedContractors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Currently Assigned</h4>
                  <div className="space-y-2">
                    {assignedContractors.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <span className="font-medium">{c.name}</span>
                          {c.company && <span className="text-muted-foreground"> - {c.company}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">{c.trade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

// ── Quotes Tab ──
function QuotesTab({
  project,
  contractors,
  onUpdate,
}: {
  project: RenovationProject;
  contractors: Contractor[];
  onUpdate: (p: RenovationProject) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const addQuote = () => {
    if (!amount || !contractorId) return;
    const quote: ProjectQuote = {
      id: uuidv4(),
      contractorId,
      amount: parseFloat(amount),
      receivedDate: date,
      accepted: false,
      notes,
    };
    onUpdate({
      ...project,
      quotes: [...project.quotes, quote],
    });
    setAmount("");
    setContractorId("");
    setNotes("");
    setShowForm(false);
  };

  const acceptQuote = (quoteId: string) => {
    onUpdate({
      ...project,
      acceptedQuoteId: quoteId,
      quotes: project.quotes.map((q) => ({
        ...q,
        accepted: q.id === quoteId,
      })),
    });
  };

  const deleteQuote = (quoteId: string) => {
    onUpdate({
      ...project,
      quotes: project.quotes.filter((q) => q.id !== quoteId),
      acceptedQuoteId:
        project.acceptedQuoteId === quoteId ? undefined : project.acceptedQuoteId,
    });
  };

  return (
    <div className="space-y-4">
      {project.quotes.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">No quotes yet.</p>
      )}

      {project.quotes.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Contractor</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Notes</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {project.quotes.map((q) => {
                const contractor = contractors.find((c) => c.id === q.contractorId);
                return (
                  <tr key={q.id} className="border-b last:border-0">
                    <td className="py-2">{contractor?.name || "Unknown"}</td>
                    <td className="py-2">${q.amount.toLocaleString()}</td>
                    <td className="py-2">{q.receivedDate}</td>
                    <td className="py-2 text-muted-foreground">{q.notes}</td>
                    <td className="py-2">
                      {q.accepted ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                          Accepted
                        </span>
                      ) : (
                        <button
                          onClick={() => acceptQuote(q.id)}
                          className="text-xs px-2 py-0.5 border rounded hover:bg-green-50 transition"
                        >
                          Accept
                        </button>
                      )}
                    </td>
                    <td className="py-2">
                      <button onClick={() => deleteQuote(q.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm ? (
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium">Add Quote</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Amount ($)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Contractor</label>
              <select
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm mt-1"
              >
                <option value="">Select contractor...</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company && `(${c.company})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm mt-1"
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addQuote}
              className="text-sm px-4 py-1.5 bg-primary text-primary-foreground rounded hover:opacity-90 transition"
            >
              Save Quote
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm px-4 py-1.5 border rounded hover:bg-accent transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <Plus className="w-4 h-4" />
          Add Quote
        </button>
      )}
    </div>
  );
}

// ── Communications Tab ──
function CommunicationsTab({
  project,
  onUpdate,
}: {
  project: RenovationProject;
  onUpdate: (p: RenovationProject) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<ProjectCommunication["type"]>("note");
  const [summary, setSummary] = useState("");

  const typeIcons: Record<string, React.ReactNode> = {
    email: <Mail className="w-4 h-4" />,
    phone: <Phone className="w-4 h-4" />,
    in_person: <User className="w-4 h-4" />,
    note: <FileText className="w-4 h-4" />,
  };

  const addComm = () => {
    if (!summary.trim()) return;
    const comm: ProjectCommunication = {
      id: uuidv4(),
      date: new Date().toISOString(),
      type,
      summary: summary.trim(),
    };
    onUpdate({
      ...project,
      communications: [comm, ...project.communications],
    });
    setSummary("");
    setShowForm(false);
  };

  const deleteComm = (id: string) => {
    onUpdate({
      ...project,
      communications: project.communications.filter((c) => c.id !== id),
    });
  };

  return (
    <div className="space-y-4">
      {project.communications.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">No communications logged yet.</p>
      )}

      {showForm ? (
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium">Add Communication</h4>
          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProjectCommunication["type"])}
              className="w-full border rounded px-3 py-1.5 text-sm mt-1"
            >
              <option value="note">Note</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="in_person">In Person</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full border rounded px-3 py-1.5 text-sm mt-1 min-h-[80px]"
              placeholder="What happened..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addComm}
              className="text-sm px-4 py-1.5 bg-primary text-primary-foreground rounded hover:opacity-90 transition"
            >
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm px-4 py-1.5 border rounded hover:bg-accent transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <MessageSquare className="w-4 h-4" />
          Add Note
        </button>
      )}

      <div className="space-y-2">
        {project.communications.map((c) => (
          <div key={c.id} className="flex items-start gap-3 p-3 border rounded group">
            <div className="mt-0.5 text-muted-foreground">{typeIcons[c.type]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {c.type.replace("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm">{c.summary}</p>
            </div>
            <button
              onClick={() => deleteComm(c.id)}
              className="opacity-0 group-hover:opacity-100 transition shrink-0"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Project Dialog ──
function ProjectDialog({
  open,
  onOpenChange,
  project,
  contractors,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: RenovationProject | null;
  contractors: Contractor[];
  onSave: (p: RenovationProject) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("renovation");
  const [status, setStatus] = useState<ProjectStatus>("not_started");
  const [priority, setPriority] = useState<RenovationProject["priority"]>("medium");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedContractorIds, setSelectedContractorIds] = useState<string[]>([]);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setCategory(project.category);
      setStatus(project.status);
      setPriority(project.priority);
      setStartDate(project.estimatedStartDate || "");
      setEndDate(project.estimatedEndDate || "");
      setNotes(project.notes);
      setSelectedContractorIds(project.contractorIds);
    } else {
      setName("");
      setCategory("renovation");
      setStatus("not_started");
      setPriority("medium");
      setStartDate("");
      setEndDate("");
      setNotes("");
      setSelectedContractorIds([]);
    }
  }, [project, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const p: RenovationProject = project
      ? {
          ...project,
          name: name.trim(),
          category,
          status,
          priority,
          estimatedStartDate: startDate || undefined,
          estimatedEndDate: endDate || undefined,
          notes,
          contractorIds: selectedContractorIds,
          updatedAt: now,
        }
      : {
          id: uuidv4(),
          name: name.trim(),
          category,
          status,
          priority,
          estimatedStartDate: startDate || undefined,
          estimatedEndDate: endDate || undefined,
          subTasks: [],
          milestones: [],
          contractorIds: selectedContractorIds,
          quotes: [],
          budgetItemIds: [],
          communications: [],
          notes,
          createdAt: now,
          updatedAt: now,
          dependsOn: [],
        };
    onSave(p);
  };

  const toggleContractor = (id: string) => {
    setSelectedContractorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 z-50">
          <Dialog.Title className="text-lg font-semibold mb-4">
            {project ? "Edit Project" : "Add Project"}
          </Dialog.Title>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
                placeholder="Project name..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as RenovationProject["priority"])
                  }
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Est. Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Est. End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                />
              </div>
            </div>

            {contractors.length > 0 && (
              <div>
                <label className="text-sm font-medium">Assign Contractors</label>
                <div className="mt-1 border rounded p-2 max-h-32 overflow-y-auto space-y-1">
                  {contractors.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedContractorIds.includes(c.id)}
                        onChange={() => toggleContractor(c.id)}
                      />
                      {c.name} {c.company && `(${c.company})`} - {c.trade}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mt-1 min-h-[80px]"
                placeholder="Project notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Dialog.Close asChild>
              <button className="px-4 py-2 text-sm border rounded hover:bg-accent transition">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition"
            >
              {project ? "Save Changes" : "Add Project"}
            </button>
          </div>

          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Contractor Dialog ──
function ContractorDialog({
  open,
  onOpenChange,
  contractor,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractor: Contractor | null;
  onSave: (c: Contractor) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [trade, setTrade] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (contractor) {
      setName(contractor.name);
      setCompany(contractor.company);
      setEmail(contractor.email);
      setPhone(contractor.phone);
      setTrade(contractor.trade);
      setNotes(contractor.notes);
    } else {
      setName("");
      setCompany("");
      setEmail("");
      setPhone("");
      setTrade("");
      setNotes("");
    }
  }, [contractor, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    const c: Contractor = {
      id: contractor?.id || uuidv4(),
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      phone: phone.trim(),
      trade: trade.trim(),
      notes: notes.trim(),
    };
    onSave(c);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6 z-50">
          <Dialog.Title className="text-lg font-semibold mb-4">
            {contractor ? "Edit Contractor" : "Add Contractor"}
          </Dialog.Title>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
                placeholder="Full name..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Company</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
                placeholder="Company name..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Trade</label>
              <input
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
                placeholder="e.g. Electrician, Plumber, GC..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mt-1 min-h-[60px]"
                placeholder="Any notes..."
              />
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <div>
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm("Delete this contractor?")) onDelete();
                  }}
                  className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-sm border rounded hover:bg-accent transition">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition"
              >
                {contractor ? "Save Changes" : "Add Contractor"}
              </button>
            </div>
          </div>

          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
