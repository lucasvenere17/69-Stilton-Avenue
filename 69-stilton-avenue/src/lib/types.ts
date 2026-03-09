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

export interface BudgetItem {
  id: string;
  category: string;
  name: string;
  estimatedCost: number;
  actualCost: number;
  budgetType: "renovation" | "furniture";
  link?: string;
  subTaskId?: string;
  projectId?: string;
  acceptedQuoteContractor?: string;
  acceptedQuoteAmount?: number;
}

export interface BudgetsData {
  renovation: BudgetItem[];
  furniture: BudgetItem[];
}

// Project Tracker Types
export type ProjectStatus =
  | "not_started"
  | "getting_quotes"
  | "quoted"
  | "scheduled"
  | "in_progress"
  | "inspection_needed"
  | "on_hold"
  | "completed";

export interface Contractor {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  trade: string;
  notes: string;
  website?: string;
  rating?: number;
}

export interface EmailDraft {
  id: string;
  projectId: string;
  contractorId?: string;
  to: string;
  subject: string;
  body: string;
  template?: string;
  status: "draft" | "sent";
  createdAt: string;
  updatedAt: string;
}

export interface ProjectQuote {
  id: string;
  contractorId: string;
  amount: number;
  receivedDate: string;
  expiryDate?: string;
  accepted: boolean;
  notes: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate?: string;
  completedDate?: string;
  status: "pending" | "completed" | "overdue";
}

export interface ProjectCommunication {
  id: string;
  date: string;
  type: "email" | "phone" | "in_person" | "note";
  summary: string;
  contractorId?: string;
}

export type SubTaskStatus = "not_started" | "in_progress" | "completed";

export interface SubTask {
  id: string;
  title: string;
  description: string;
  status: SubTaskStatus;
  estimatedCost: number;
  actualCost: number;
  assignedContractorId?: string;
  budgetItemId?: string;
  link?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface RenovationProject {
  id: string;
  name: string;
  category: string;
  status: ProjectStatus;
  priority: "low" | "medium" | "high" | "critical";
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  subTasks: SubTask[];
  milestones: ProjectMilestone[];
  contractorIds: string[];
  quotes: ProjectQuote[];
  acceptedQuoteId?: string;
  budgetItemIds: string[];
  communications: ProjectCommunication[];
  notes: string;
  estimatedCost?: number;
  createdAt: string;
  updatedAt: string;
  dependsOn: string[];
}

export interface ProjectTrackerData {
  projects: RenovationProject[];
  contractors: Contractor[];
}

// ── Gmail Integration Types ──

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  labels: string[];
  hasAttachments: boolean;
}

export interface EmailSuggestion {
  id: string;
  emailId: string;
  type: "quote_detected" | "schedule_update" | "status_change" | "new_contractor";
  description: string;
  suggestedAction: string;
  projectId?: string;
  contractorId?: string;
  detectedAmount?: number;
  detectedDate?: string;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
}

export interface GmailConnectionStatus {
  connected: boolean;
  email?: string;
  lastSynced?: string;
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
