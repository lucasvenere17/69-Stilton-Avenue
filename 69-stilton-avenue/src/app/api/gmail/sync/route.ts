import { NextResponse } from "next/server";
import {
  searchEmails,
  isRenovationRelated,
  detectQuotesAndDates,
  type ParsedGmailMessage,
} from "@/lib/gmail";
import fs from "fs";
import path from "path";

interface SubTaskData {
  id: string;
  title: string;
  description: string;
}

interface ProjectData {
  id: string;
  name: string;
  category: string;
  contractorIds: string[];
  communications: Array<Record<string, unknown>>;
  subTasks: SubTaskData[];
}

interface ProjectsData {
  projects: ProjectData[];
  contractors: Array<{
    id: string;
    name: string;
    email: string;
    trade: string;
  }>;
}

function loadProjectsData(): ProjectsData {
  try {
    const filePath = path.join(process.cwd(), "src", "data", "projects.json");
    if (!fs.existsSync(filePath)) return { projects: [], contractors: [] };
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { projects: [], contractors: [] };
  }
}

// ── Project-level keyword matching rules ──
interface MatchRule {
  keywords: string[];
  projectCategory: string; // matches against project.category or project.name (lowercased)
}

const PROJECT_MATCH_RULES: MatchRule[] = [
  { keywords: ["kitchen"], projectCategory: "kitchen" },
  { keywords: ["living room", "wall unit"], projectCategory: "living room" },
  { keywords: ["paint", "painting", "door handles"], projectCategory: "throughout house" },
  { keywords: ["master bedroom", "closet", "walk-in", "wic", "ikea closet"], projectCategory: "master bedroom" },
  { keywords: ["ensuite", "bathroom", "vanity", "showerhead", "shower"], projectCategory: "ensuite" },
  { keywords: ["mudroom", "mud room"], projectCategory: "mudroom" },
  { keywords: ["laundry"], projectCategory: "laundry room" },
  { keywords: ["powder room", "wallpaper"], projectCategory: "powder room" },
];

// ── Sub-task level keyword matching rules ──
interface SubTaskMatchRule {
  keywords: string[];
  projectCategory: string;
  subTaskTitleIncludes: string; // partial match on sub-task title (lowercased)
}

const SUBTASK_MATCH_RULES: SubTaskMatchRule[] = [
  // Kitchen
  { keywords: ["cabinet resurfacing", "cabinets"], projectCategory: "kitchen", subTaskTitleIncludes: "cabinet resurfacing" },
  { keywords: ["island", "counter", "backsplash"], projectCategory: "kitchen", subTaskTitleIncludes: "island" },
  { keywords: ["hood fan", "slats"], projectCategory: "kitchen", subTaskTitleIncludes: "hood fan" },
  // Living Room
  { keywords: ["wall unit"], projectCategory: "living room", subTaskTitleIncludes: "wall unit" },
  // Throughout House
  { keywords: ["painting"], projectCategory: "throughout house", subTaskTitleIncludes: "painting" },
  { keywords: ["door handles"], projectCategory: "throughout house", subTaskTitleIncludes: "door handles" },
  // Master Bedroom
  { keywords: ["demo", "demolition", "his and hers"], projectCategory: "master bedroom", subTaskTitleIncludes: "demo" },
  { keywords: ["construct closet", "taping", "sanding", "half wall", "ensuite wall"], projectCategory: "master bedroom", subTaskTitleIncludes: "construct closet" },
  { keywords: ["ikea closet"], projectCategory: "master bedroom", subTaskTitleIncludes: "ikea closet" },
  { keywords: ["closet lighting", "electrical"], projectCategory: "master bedroom", subTaskTitleIncludes: "closet lighting" },
  { keywords: ["window"], projectCategory: "master bedroom", subTaskTitleIncludes: "window" },
  // Ensuite
  { keywords: ["vanity"], projectCategory: "ensuite", subTaskTitleIncludes: "vanity" },
  { keywords: ["showerhead", "shower head"], projectCategory: "ensuite", subTaskTitleIncludes: "showerhead" },
  // Mudroom
  { keywords: ["built-in", "built in"], projectCategory: "mudroom", subTaskTitleIncludes: "built in" },
  // Laundry
  { keywords: ["built-in", "built in"], projectCategory: "laundry room", subTaskTitleIncludes: "built-in" },
  // Powder Room
  { keywords: ["wallpaper"], projectCategory: "powder room", subTaskTitleIncludes: "wallpaper" },
];

interface MatchResult {
  projectId: string;
  subTaskId?: string;
  score: number;
}

function matchEmailToProject(
  subject: string,
  body: string,
  fromEmail: string,
  projects: ProjectData[],
  contractorEmails: Map<string, { id: string; name: string }>
): MatchResult | null {
  const text = `${subject} ${body}`.toLowerCase();
  const results: MatchResult[] = [];

  // 1. Contractor email match (high priority)
  const fromContractor = contractorEmails.get(fromEmail.toLowerCase());
  if (fromContractor) {
    const project = projects.find((p) =>
      p.contractorIds.includes(fromContractor.id)
    );
    if (project) {
      results.push({ projectId: project.id, score: 100 });
    }
  }

  // 2. Project-level keyword matching
  for (const project of projects) {
    const projectCat = project.category.toLowerCase();
    const projectName = project.name.toLowerCase();
    let projectScore = 0;
    let matchedProjectByRule = false;

    for (const rule of PROJECT_MATCH_RULES) {
      if (projectCat.includes(rule.projectCategory) || projectName.includes(rule.projectCategory)) {
        const hits = rule.keywords.filter((kw) => text.includes(kw)).length;
        if (hits > 0) {
          projectScore += hits * 10;
          matchedProjectByRule = true;
        }
      }
    }

    if (!matchedProjectByRule) continue;

    // 3. Sub-task level matching (adds to the score)
    let bestSubTaskId: string | undefined;
    let bestSubTaskScore = 0;

    for (const rule of SUBTASK_MATCH_RULES) {
      if (!projectCat.includes(rule.projectCategory) && !projectName.includes(rule.projectCategory)) continue;

      const hits = rule.keywords.filter((kw) => text.includes(kw)).length;
      if (hits > 0) {
        // Find the matching sub-task
        const subTask = project.subTasks.find((st) =>
          st.title.toLowerCase().includes(rule.subTaskTitleIncludes)
        );
        if (subTask && hits > bestSubTaskScore) {
          bestSubTaskScore = hits;
          bestSubTaskId = subTask.id;
        }
      }
    }

    results.push({
      projectId: project.id,
      subTaskId: bestSubTaskId,
      score: projectScore + bestSubTaskScore * 5,
    });
  }

  if (results.length === 0) return null;

  // Return the best match (highest score)
  results.sort((a, b) => b.score - a.score);
  return results[0];
}

export async function GET() {
  try {
    // Fetch emails from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const afterDate = thirtyDaysAgo.toISOString().split("T")[0].replace(/-/g, "/");

    const query = `after:${afterDate}`;
    const allEmails = await searchEmails(query, 100);

    if (allEmails.length === 0) {
      return NextResponse.json({
        emails: [],
        suggestions: [],
        synced: true,
        lastSynced: new Date().toISOString(),
      });
    }

    // Load project data to match contractors
    const projectsData = loadProjectsData();
    const contractorEmails = new Map<string, { id: string; name: string }>();
    for (const c of projectsData.contractors) {
      if (c.email) {
        contractorEmails.set(c.email.toLowerCase(), { id: c.id, name: c.name });
      }
    }

    // Filter and categorize
    const relevantEmails: (ParsedGmailMessage & { matchedProjectId?: string; matchedSubTaskId?: string })[] = [];
    const suggestions: Array<{
      id: string;
      emailId: string;
      type: "quote_detected" | "schedule_update" | "status_change" | "new_contractor";
      description: string;
      suggestedAction: string;
      projectId?: string;
      contractorId?: string;
      detectedAmount?: number;
      detectedDate?: string;
      status: "pending";
      createdAt: string;
    }> = [];

    let suggestionCounter = 0;

    for (const email of allEmails) {
      const fromContractor = contractorEmails.get(email.fromEmail.toLowerCase());
      const isRelevant = fromContractor || isRenovationRelated(email.subject, email.body);

      if (!isRelevant) continue;

      // Auto-match email to project/sub-task
      const match = matchEmailToProject(
        email.subject,
        email.body,
        email.fromEmail,
        projectsData.projects,
        contractorEmails
      );

      const enrichedEmail = {
        ...email,
        matchedProjectId: match?.projectId,
        matchedSubTaskId: match?.subTaskId,
      };
      relevantEmails.push(enrichedEmail);

      // Detect quotes, dates, status
      const detected = detectQuotesAndDates(email.body);

      // Match to a project (for suggestions)
      let matchedProjectId: string | undefined = match?.projectId;
      if (!matchedProjectId && fromContractor) {
        const project = projectsData.projects.find((p) =>
          p.contractorIds.includes(fromContractor.id)
        );
        if (project) matchedProjectId = project.id;
      }

      // Generate suggestions
      if (detected.amounts.length > 0) {
        suggestionCounter++;
        suggestions.push({
          id: `suggestion-${suggestionCounter}-${Date.now()}`,
          emailId: email.id,
          type: "quote_detected",
          description: `Quote of $${detected.amounts[0].toLocaleString()} detected from ${email.from}`,
          suggestedAction: `Add quote of $${detected.amounts[0].toLocaleString()} to project`,
          projectId: matchedProjectId,
          contractorId: fromContractor?.id,
          detectedAmount: detected.amounts[0],
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }

      if (detected.dates.length > 0 && detected.statusKeywords.includes("schedule_confirmed")) {
        suggestionCounter++;
        suggestions.push({
          id: `suggestion-${suggestionCounter}-${Date.now()}`,
          emailId: email.id,
          type: "schedule_update",
          description: `Schedule update from ${email.from}: ${detected.dates[0]}`,
          suggestedAction: `Update project schedule with date: ${detected.dates[0]}`,
          projectId: matchedProjectId,
          contractorId: fromContractor?.id,
          detectedDate: detected.dates[0],
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }

      if (detected.statusKeywords.length > 0 && !detected.amounts.length) {
        for (const keyword of detected.statusKeywords) {
          if (keyword === "schedule_confirmed") continue; // Already handled
          suggestionCounter++;
          suggestions.push({
            id: `suggestion-${suggestionCounter}-${Date.now()}`,
            emailId: email.id,
            type: "status_change",
            description: `Status update from ${email.from}: ${keyword.replace(/_/g, " ")}`,
            suggestedAction: `Review and update project status`,
            projectId: matchedProjectId,
            contractorId: fromContractor?.id,
            status: "pending",
            createdAt: new Date().toISOString(),
          });
        }
      }

      // If email is from unknown sender but renovation-related, suggest adding as contractor
      if (!fromContractor && isRenovationRelated(email.subject, email.body)) {
        const alreadySuggested = suggestions.some(
          (s) => s.type === "new_contractor" && s.description.includes(email.fromEmail)
        );
        if (!alreadySuggested) {
          suggestionCounter++;
          suggestions.push({
            id: `suggestion-${suggestionCounter}-${Date.now()}`,
            emailId: email.id,
            type: "new_contractor",
            description: `Renovation-related email from ${email.from} (${email.fromEmail})`,
            suggestedAction: `Add ${email.from} as a new contractor`,
            status: "pending",
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    return NextResponse.json({
      emails: relevantEmails,
      suggestions,
      synced: true,
      lastSynced: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Gmail sync error:", err);
    return NextResponse.json(
      { error: "Failed to sync Gmail. Please check your connection." },
      { status: 500 }
    );
  }
}
