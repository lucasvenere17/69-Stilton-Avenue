import { NextResponse } from "next/server";
import {
  searchEmails,
  isRenovationRelated,
  detectQuotesAndDates,
  type ParsedGmailMessage,
} from "@/lib/gmail";
import fs from "fs";
import path from "path";

interface ProjectsData {
  projects: Array<{
    id: string;
    name: string;
    contractorIds: string[];
    communications: Array<Record<string, unknown>>;
  }>;
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
    const relevantEmails: ParsedGmailMessage[] = [];
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
      relevantEmails.push(email);

      // Detect quotes, dates, status
      const detected = detectQuotesAndDates(email.body);

      // Match to a project
      let matchedProjectId: string | undefined;
      if (fromContractor) {
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
