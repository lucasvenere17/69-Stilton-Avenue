"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import type {
  ProjectCommunication,
  RenovationProject,
  Contractor,
  EmailDraft,
} from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Mail,
  Phone,
  User,
  FileText,
  Plus,
  Send,
  X,
  Sparkles,
  Filter,
  Inbox,
  MessageSquare,
  PenSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Communication type icons ──
const COMM_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  email: {
    label: "Email",
    icon: <Mail className="w-4 h-4" />,
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  phone: {
    label: "Phone",
    icon: <Phone className="w-4 h-4" />,
    color: "text-green-700",
    bg: "bg-green-50",
  },
  in_person: {
    label: "In Person",
    icon: <User className="w-4 h-4" />,
    color: "text-purple-700",
    bg: "bg-purple-50",
  },
  note: {
    label: "Note",
    icon: <FileText className="w-4 h-4" />,
    color: "text-gray-700",
    bg: "bg-gray-50",
  },
};

// ── Email Templates ──
const EMAIL_TEMPLATES: {
  id: string;
  name: string;
  subject: string;
  body: string;
}[] = [
  {
    id: "requesting_quote",
    name: "Requesting a Quote",
    subject: "Quote Request - {{projectName}} at 69 Stilton Avenue, Kleinburg",
    body: `Dear {{contractorName}},

I hope this message finds you well. I am reaching out regarding a renovation project at 69 Stilton Avenue, Kleinburg, Ontario.

We are looking for a qualified professional to assist with {{projectName}}. I would appreciate it if you could provide a detailed quote for the work involved.

The scope of work includes:
- [Please describe specific requirements]

Could you please provide:
1. A detailed cost breakdown
2. Estimated timeline for completion
3. References from similar projects

I would be happy to arrange a site visit at your convenience to discuss the project in detail.

Thank you for your time, and I look forward to hearing from you.

Best regards,
Lucas`,
  },
  {
    id: "following_up",
    name: "Following Up",
    subject: "Follow-Up: {{projectName}} - 69 Stilton Avenue",
    body: `Dear {{contractorName}},

I hope you are doing well. I am following up on our previous conversation regarding {{projectName}} at 69 Stilton Avenue, Kleinburg, Ontario.

I wanted to check in on the status of the quote / next steps and see if you need any additional information from my end.

Please let me know if there is anything I can provide to help move things forward.

Thank you for your time.

Best regards,
Lucas`,
  },
  {
    id: "scheduling_visit",
    name: "Scheduling Site Visit",
    subject: "Site Visit Request - {{projectName}} at 69 Stilton Avenue",
    body: `Dear {{contractorName}},

I would like to schedule a site visit for {{projectName}} at 69 Stilton Avenue, Kleinburg, Ontario.

Would any of the following times work for you?
- [Option 1]
- [Option 2]
- [Option 3]

The visit would allow you to assess the space and provide a more accurate estimate for the work required.

Please let me know your availability and I will confirm the appointment.

Best regards,
Lucas`,
  },
  {
    id: "confirming_details",
    name: "Confirming Details",
    subject: "Confirmation - {{projectName}} at 69 Stilton Avenue",
    body: `Dear {{contractorName}},

Thank you for our recent discussion regarding {{projectName}} at 69 Stilton Avenue, Kleinburg, Ontario.

I am writing to confirm the following details:

- Scope of work: [Details]
- Start date: [Date]
- Estimated completion: [Date]
- Agreed price: $[Amount]

Please let me know if any of the above needs to be adjusted. If everything looks correct, I am ready to proceed.

Best regards,
Lucas`,
  },
  {
    id: "thank_you",
    name: "Thank You",
    subject: "Thank You - {{projectName}}",
    body: `Dear {{contractorName}},

I wanted to take a moment to thank you for your excellent work on {{projectName}} at 69 Stilton Avenue, Kleinburg, Ontario.

The quality of workmanship and professionalism you demonstrated throughout the project was truly appreciated. I would be happy to recommend your services to others.

Thank you again, and I look forward to working with you on future projects.

Best regards,
Lucas`,
  },
];

function fillTemplate(
  text: string,
  projectName: string,
  contractorName: string
): string {
  return text
    .replace(/\{\{projectName\}\}/g, projectName)
    .replace(/\{\{contractorName\}\}/g, contractorName || "[Contractor Name]");
}

// ── Main Page ──
export default function CommunicationsPageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-6 text-muted-foreground">Loading...</div>}>
      <CommunicationsPage />
    </Suspense>
  );
}

function CommunicationsPage() {
  const searchParams = useSearchParams();
  const {
    projects,
    contractors,
    loadProjects,
    getAllCommunications,
    drafts,
    addDraft,
    updateDraft,
    deleteDraft,
    sendDraft,
    updateProject,
  } = useAppStore();

  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [aiDraftOpen, setAiDraftOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<EmailDraft | null>(null);
  const [addCommOpen, setAddCommOpen] = useState(false);

  // Pre-selected from URL params (from "Draft Outreach" on projects page)
  const preselectedProjectId = searchParams.get("projectId") || "";
  const preselectedContractorId = searchParams.get("contractorId") || "";

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Auto-open AI draft modal if navigated with params
  useEffect(() => {
    if (preselectedProjectId && preselectedContractorId && projects.length > 0) {
      const project = projects.find((p) => p.id === preselectedProjectId);
      const contractor = contractors.find(
        (c) => c.id === preselectedContractorId
      );
      if (project && contractor) {
        const template = EMAIL_TEMPLATES[0]; // "Requesting a Quote" default
        const now = new Date().toISOString();
        const draft: EmailDraft = {
          id: uuidv4(),
          projectId: project.id,
          contractorId: contractor.id,
          to: contractor.email || "",
          subject: fillTemplate(template.subject, project.name, contractor.name),
          body: fillTemplate(template.body, project.name, contractor.name),
          template: template.id,
          status: "draft",
          createdAt: now,
          updatedAt: now,
        };
        setEditingDraft(draft);
        setComposeOpen(true);
      }
    }
    // Only run once when projects load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allComms = useMemo(() => getAllCommunications(), [projects, getAllCommunications]);

  const filteredComms = useMemo(() => {
    let result = allComms;
    if (filterProject !== "all") {
      result = result.filter((c) => c.projectId === filterProject);
    }
    if (filterType !== "all") {
      result = result.filter((c) => c.type === filterType);
    }
    return result;
  }, [allComms, filterProject, filterType]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Inbox className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Communications Hub</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setAddCommOpen(true)}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition"
          >
            <Plus className="w-4 h-4" />
            Log Communication
          </button>
          <button
            onClick={() => {
              setEditingDraft(null);
              setComposeOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            <PenSquare className="w-4 h-4" />
            Compose
          </button>
          <button
            onClick={() => setAiDraftOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            <Sparkles className="w-4 h-4" />
            AI Draft Outreach
          </button>
          <button
            onClick={() => setTemplateOpen(true)}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition"
          >
            <FileText className="w-4 h-4" />
            Templates
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filters:</span>
        </div>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5"
        >
          <option value="all">All Types</option>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="in_person">In Person</option>
          <option value="note">Note</option>
        </select>
        {(filterProject !== "all" || filterType !== "all") && (
          <button
            onClick={() => {
              setFilterProject("all");
              setFilterType("all");
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Drafts Section */}
      {drafts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Drafts ({drafts.length})
          </h3>
          <div className="space-y-2">
            {drafts.map((draft) => {
              const project = projects.find((p) => p.id === draft.projectId);
              return (
                <div
                  key={draft.id}
                  className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm cursor-pointer hover:bg-amber-100 transition"
                  onClick={() => {
                    setEditingDraft(draft);
                    setComposeOpen(true);
                  }}
                >
                  <PenSquare className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{draft.subject || "(No subject)"}</div>
                    <div className="text-xs text-muted-foreground">
                      To: {draft.to || "(No recipient)"} {project && `| ${project.name}`}
                    </div>
                  </div>
                  <span className="text-xs text-amber-600 font-medium">Draft</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDraft(draft.id);
                    }}
                    className="text-muted-foreground hover:text-red-500 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Communications List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Inbox ({filteredComms.length})
        </h3>
        {filteredComms.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-white">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No communications yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Log a communication or compose a new email to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredComms.map((comm) => {
              const typeCfg = COMM_TYPE_CONFIG[comm.type] || COMM_TYPE_CONFIG.note;
              const contractor = comm.contractorId
                ? contractors.find((c) => c.id === comm.contractorId)
                : null;

              return (
                <div
                  key={comm.id}
                  className="flex items-start gap-3 p-3 bg-white border rounded-lg text-sm hover:bg-accent/30 transition"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      typeCfg.bg,
                      typeCfg.color
                    )}
                  >
                    {typeCfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{comm.summary}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium"
                      >
                        {comm.projectName}
                      </span>
                      <span>{new Date(comm.date).toLocaleDateString()}</span>
                      {contractor && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {contractor.name}
                        </span>
                      )}
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-xs font-medium",
                          typeCfg.bg,
                          typeCfg.color
                        )}
                      >
                        {typeCfg.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose / Edit Draft Modal */}
      <ComposeModal
        open={composeOpen}
        onOpenChange={setComposeOpen}
        draft={editingDraft}
        projects={projects}
        contractors={contractors}
        onSaveDraft={(draft) => {
          if (drafts.find((d) => d.id === draft.id)) {
            updateDraft(draft);
          } else {
            addDraft(draft);
          }
          setComposeOpen(false);
          setEditingDraft(null);
        }}
        onSend={async (draft) => {
          await sendDraft(draft);
          setComposeOpen(false);
          setEditingDraft(null);
        }}
      />

      {/* AI Draft Outreach Modal */}
      <AiDraftModal
        open={aiDraftOpen}
        onOpenChange={setAiDraftOpen}
        projects={projects}
        contractors={contractors}
        onGenerateDraft={(draft) => {
          setEditingDraft(draft);
          setAiDraftOpen(false);
          setComposeOpen(true);
        }}
      />

      {/* Templates Modal */}
      <TemplatesModal
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        projects={projects}
        contractors={contractors}
        onSelectTemplate={(draft) => {
          setEditingDraft(draft);
          setTemplateOpen(false);
          setComposeOpen(true);
        }}
      />

      {/* Log Communication Modal */}
      <LogCommunicationModal
        open={addCommOpen}
        onOpenChange={setAddCommOpen}
        projects={projects}
        contractors={contractors}
        onSave={async (projectId, comm) => {
          const project = projects.find((p) => p.id === projectId);
          if (!project) return;
          await updateProject({
            ...project,
            communications: [...project.communications, comm],
          });
          setAddCommOpen(false);
        }}
      />
    </div>
  );
}

// ── Compose Modal ──
function ComposeModal({
  open,
  onOpenChange,
  draft,
  projects,
  contractors,
  onSaveDraft,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: EmailDraft | null;
  projects: RenovationProject[];
  contractors: Contractor[];
  onSaveDraft: (draft: EmailDraft) => void;
  onSend: (draft: EmailDraft) => void;
}) {
  const now = new Date().toISOString();
  const [form, setForm] = useState<EmailDraft>({
    id: "",
    projectId: "",
    contractorId: "",
    to: "",
    subject: "",
    body: "",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  useEffect(() => {
    if (draft) {
      setForm(draft);
    } else {
      const now = new Date().toISOString();
      setForm({
        id: uuidv4(),
        projectId: "",
        contractorId: "",
        to: "",
        subject: "",
        body: "",
        status: "draft",
        createdAt: now,
        updatedAt: now,
      });
    }
  }, [draft, open]);

  useEffect(() => {
    if (form.contractorId && !form.to) {
      const c = contractors.find((ct) => ct.id === form.contractorId);
      if (c?.email) {
        setForm((f) => ({ ...f, to: c.email }));
      }
    }
  }, [form.contractorId, form.to, contractors]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-full max-w-2xl z-50 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <Dialog.Title className="text-lg font-semibold">
              {draft ? "Edit Draft" : "Compose Email"}
            </Dialog.Title>
            <Dialog.Close className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Project</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                >
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Contractor (optional)</label>
                <select
                  value={form.contractorId || ""}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const c = contractors.find((ct) => ct.id === cId);
                    setForm({
                      ...form,
                      contractorId: cId || undefined,
                      to: c?.email || form.to,
                    });
                  }}
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                >
                  <option value="">Select contractor...</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.trade}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <input
                type="email"
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                placeholder="recipient@email.com"
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Email subject..."
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Body</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Write your email..."
                rows={12}
                className="w-full border rounded px-3 py-2 text-sm mt-1 resize-y font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border-t">
            <button
              onClick={() => onSaveDraft(form)}
              className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition"
            >
              Save as Draft
            </button>
            <button
              onClick={() => {
                if (!form.projectId) {
                  alert("Please select a project.");
                  return;
                }
                onSend(form);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── AI Draft Modal ──
function AiDraftModal({
  open,
  onOpenChange,
  projects,
  contractors,
  onGenerateDraft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: RenovationProject[];
  contractors: Contractor[];
  onGenerateDraft: (draft: EmailDraft) => void;
}) {
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedContractor, setSelectedContractor] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedProject("");
      setSelectedContractor("");
    }
  }, [open]);

  const handleGenerate = () => {
    const project = projects.find((p) => p.id === selectedProject);
    const contractor = contractors.find((c) => c.id === selectedContractor);
    if (!project) return;

    const contractorName = contractor?.name || "[Contractor Name]";
    const contractorEmail = contractor?.email || "";
    const projectDescription = project.name;

    // Template-based AI draft
    const subject = `Inquiry: ${projectDescription} at 69 Stilton Avenue, Kleinburg`;
    const body = `Dear ${contractorName},

I hope this message finds you well. My name is Lucas, and I am the owner of 69 Stilton Avenue, Kleinburg, Ontario.

I am currently planning renovation work and am reaching out regarding ${projectDescription}. I came across your services and believe your expertise would be an excellent fit for this project.

The property is a residential home in Kleinburg, and the scope of work for this particular project involves:
- ${projectDescription}
${project.notes ? `- Additional details: ${project.notes}` : ""}
${project.estimatedCost ? `- Our estimated budget for this work is approximately $${project.estimatedCost.toLocaleString()}` : ""}

I would greatly appreciate the opportunity to discuss this project with you further. Specifically, I am interested in:
1. Your availability for a site visit to assess the work
2. A detailed quote including materials and labor
3. Your estimated timeline for completion
4. References from similar residential renovation projects

Would you be available for a brief call or site visit in the coming weeks? I am flexible with scheduling and happy to accommodate your availability.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
Lucas
69 Stilton Avenue
Kleinburg, Ontario`;

    const now = new Date().toISOString();
    const draft: EmailDraft = {
      id: uuidv4(),
      projectId: project.id,
      contractorId: contractor?.id,
      to: contractorEmail,
      subject,
      body,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };

    onGenerateDraft(draft);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 w-full max-w-md z-50">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-600" />
              AI Draft Outreach
            </Dialog.Title>
            <Dialog.Close className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Select a project and contractor to generate a professional outreach email draft.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Project *</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              >
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Contractor</label>
              <select
                value={selectedContractor}
                onChange={(e) => setSelectedContractor(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              >
                <option value="">Select contractor (optional)...</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.trade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Dialog.Close className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition">
              Cancel
            </Dialog.Close>
            <button
              onClick={handleGenerate}
              disabled={!selectedProject}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              Generate Draft
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Templates Modal ──
function TemplatesModal({
  open,
  onOpenChange,
  projects,
  contractors,
  onSelectTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: RenovationProject[];
  contractors: Contractor[];
  onSelectTemplate: (draft: EmailDraft) => void;
}) {
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedContractor, setSelectedContractor] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedProject("");
      setSelectedContractor("");
    }
  }, [open]);

  const handleSelect = (template: (typeof EMAIL_TEMPLATES)[0]) => {
    const project = projects.find((p) => p.id === selectedProject);
    const contractor = contractors.find((c) => c.id === selectedContractor);
    const projectName = project?.name || "[Project Name]";
    const contractorName = contractor?.name || "[Contractor Name]";

    const now = new Date().toISOString();
    const draft: EmailDraft = {
      id: uuidv4(),
      projectId: project?.id || "",
      contractorId: contractor?.id,
      to: contractor?.email || "",
      subject: fillTemplate(template.subject, projectName, contractorName),
      body: fillTemplate(template.body, projectName, contractorName),
      template: template.id,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };

    onSelectTemplate(draft);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 w-full max-w-lg z-50 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">Email Templates</Dialog.Title>
            <Dialog.Close className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="text-sm font-medium">Project (optional)</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              >
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Contractor (optional)</label>
              <select
                value={selectedContractor}
                onChange={(e) => setSelectedContractor(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              >
                <option value="">Select contractor...</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.trade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {EMAIL_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                className="w-full text-left p-3 border rounded-lg hover:bg-accent/50 transition"
              >
                <div className="font-medium text-sm">{template.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {template.subject}
                </div>
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Log Communication Modal ──
function LogCommunicationModal({
  open,
  onOpenChange,
  projects,
  contractors,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: RenovationProject[];
  contractors: Contractor[];
  onSave: (projectId: string, comm: ProjectCommunication) => void;
}) {
  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState<ProjectCommunication["type"]>("note");
  const [summary, setSummary] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!open) {
      setProjectId("");
      setType("note");
      setSummary("");
      setContractorId("");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const handleSave = () => {
    if (!projectId || !summary.trim()) return;
    const comm: ProjectCommunication = {
      id: uuidv4(),
      date: new Date(date).toISOString(),
      type,
      summary: summary.trim(),
      contractorId: contractorId || undefined,
    };
    onSave(projectId, comm);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 w-full max-w-md z-50">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">Log Communication</Dialog.Title>
            <Dialog.Close className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Project *</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              >
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as ProjectCommunication["type"])
                }
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="in_person">In Person</option>
                <option value="note">Note</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Contractor (optional)</label>
              <select
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              >
                <option value="">None</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.trade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Summary *</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe the communication..."
                rows={3}
                className="w-full border rounded px-3 py-2 text-sm mt-1 resize-y"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Dialog.Close className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition">
              Cancel
            </Dialog.Close>
            <button
              onClick={handleSave}
              disabled={!projectId || !summary.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
