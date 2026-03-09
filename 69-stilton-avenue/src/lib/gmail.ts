import { google, gmail_v1 } from "googleapis";
import fs from "fs";
import path from "path";

const TOKENS_PATH = path.join(process.cwd(), "src", "data", "gmail-tokens.json");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
];

// ── OAuth Client ──

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  saveTokens(tokens as unknown as Record<string, unknown>);
  return tokens;
}

// ── Token Management ──

export function saveTokens(tokens: Record<string, unknown>) {
  const dir = path.dirname(TOKENS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
}

export function loadTokens(): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(TOKENS_PATH)) return null;
    const raw = fs.readFileSync(TOKENS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function deleteTokens() {
  try {
    if (fs.existsSync(TOKENS_PATH)) {
      fs.unlinkSync(TOKENS_PATH);
    }
  } catch {
    // ignore
  }
}

export function getAuthedClient() {
  const tokens = loadTokens();
  if (!tokens) return null;

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  // Auto-refresh: save new tokens when refreshed
  oauth2Client.on("tokens", (newTokens) => {
    const existing = loadTokens() || {};
    saveTokens({ ...existing, ...newTokens });
  });

  return oauth2Client;
}

export function getGmailClient(): gmail_v1.Gmail | null {
  const auth = getAuthedClient();
  if (!auth) return null;
  return google.gmail({ version: "v1", auth });
}

// ── Get user email ──

export async function getConnectedEmail(): Promise<string | null> {
  try {
    const gmail = getGmailClient();
    if (!gmail) return null;
    const profile = await gmail.users.getProfile({ userId: "me" });
    return profile.data.emailAddress || null;
  } catch {
    return null;
  }
}

// ── Parse Email Messages ──

function decodeBase64Url(data: string): string {
  const buffer = Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  return buffer.toString("utf-8");
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  if (!headers) return "";
  const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value || "";
}

function extractEmailAddress(fromStr: string): string {
  const match = fromStr.match(/<([^>]+)>/);
  return match ? match[1] : fromStr;
}

function extractDisplayName(fromStr: string): string {
  const match = fromStr.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : fromStr.split("@")[0];
}

function getBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";

  // Simple body
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Multipart
  if (payload.parts) {
    // Prefer text/plain
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Fallback to text/html
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = decodeBase64Url(part.body.data);
        // Strip HTML tags for plain text
        return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
    }
    // Recurse into nested multipart
    for (const part of payload.parts) {
      if (part.parts) {
        const body = getBody(part);
        if (body) return body;
      }
    }
  }

  return "";
}

function hasAttachments(payload: gmail_v1.Schema$MessagePart | undefined): boolean {
  if (!payload) return false;
  if (payload.filename && payload.filename.length > 0 && payload.body?.attachmentId) {
    return true;
  }
  if (payload.parts) {
    return payload.parts.some((p) => hasAttachments(p));
  }
  return false;
}

export interface ParsedGmailMessage {
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

export function parseMessage(msg: gmail_v1.Schema$Message): ParsedGmailMessage {
  const headers = msg.payload?.headers;
  const fromRaw = getHeader(headers, "From");
  const labels = msg.labelIds || [];

  return {
    id: msg.id || "",
    threadId: msg.threadId || "",
    from: extractDisplayName(fromRaw),
    fromEmail: extractEmailAddress(fromRaw),
    to: getHeader(headers, "To"),
    subject: getHeader(headers, "Subject"),
    body: getBody(msg.payload),
    date: getHeader(headers, "Date"),
    isRead: !labels.includes("UNREAD"),
    labels,
    hasAttachments: hasAttachments(msg.payload),
  };
}

// ── Search & Fetch Emails ──

export async function searchEmails(query: string, maxResults = 50): Promise<ParsedGmailMessage[]> {
  const gmail = getGmailClient();
  if (!gmail) return [];

  try {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults,
    });

    const messages = res.data.messages || [];
    const parsed: ParsedGmailMessage[] = [];

    for (const msgRef of messages) {
      if (!msgRef.id) continue;
      try {
        const full = await gmail.users.messages.get({
          userId: "me",
          id: msgRef.id,
          format: "full",
        });
        parsed.push(parseMessage(full.data));
      } catch {
        // Skip messages that fail to fetch
      }
    }

    return parsed;
  } catch (err) {
    console.error("Gmail search error:", err);
    return [];
  }
}

// ── Send Email ──

export async function sendEmail(to: string, subject: string, body: string): Promise<{ id: string; threadId: string } | null> {
  const gmail = getGmailClient();
  if (!gmail) return null;

  try {
    // Get sender email
    const profile = await gmail.users.getProfile({ userId: "me" });
    const from = profile.data.emailAddress || "";

    const rawMessage = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ].join("\r\n");

    const encodedMessage = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    return {
      id: res.data.id || "",
      threadId: res.data.threadId || "",
    };
  } catch (err) {
    console.error("Gmail send error:", err);
    return null;
  }
}

// ── Contractor Content Detection ──

const RENOVATION_KEYWORDS = [
  "quote", "estimate", "bid", "proposal", "invoice",
  "renovation", "remodel", "construction", "contractor",
  "plumbing", "electrical", "hvac", "roofing", "flooring",
  "painting", "carpentry", "demolition", "permit",
  "inspection", "site visit", "schedule", "timeline",
  "stilton", "kleinburg",
  "kitchen", "bathroom", "basement", "deck", "fence",
  "drywall", "insulation", "framing", "tile", "hardwood",
];

export function isRenovationRelated(subject: string, body: string): boolean {
  const text = `${subject} ${body}`.toLowerCase();
  return RENOVATION_KEYWORDS.some((kw) => text.includes(kw));
}

export interface DetectedInfo {
  amounts: number[];
  dates: string[];
  statusKeywords: string[];
}

export function detectQuotesAndDates(body: string): DetectedInfo {
  const amounts: number[] = [];
  const dates: string[] = [];
  const statusKeywords: string[] = [];

  // Detect dollar amounts like $1,234.56 or $1234
  const amountRegex = /\$[\d,]+(?:\.\d{2})?/g;
  const amountMatches = body.match(amountRegex);
  if (amountMatches) {
    for (const match of amountMatches) {
      const num = parseFloat(match.replace(/[$,]/g, ""));
      if (num > 0 && num < 10_000_000) {
        amounts.push(num);
      }
    }
  }

  // Detect dates in various formats
  const datePatterns = [
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
  ];
  for (const pattern of datePatterns) {
    const matches = body.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  }

  // Detect status keywords
  const statusMap: Record<string, string[]> = {
    "quote_ready": ["quote attached", "see attached quote", "our estimate", "our quote", "proposal attached"],
    "schedule_confirmed": ["confirmed for", "scheduled for", "start date", "will begin on"],
    "work_complete": ["work is complete", "project complete", "job is done", "finished the"],
    "needs_approval": ["please approve", "awaiting approval", "need your approval", "confirm to proceed"],
  };

  const lowerBody = body.toLowerCase();
  for (const [status, phrases] of Object.entries(statusMap)) {
    if (phrases.some((p) => lowerBody.includes(p))) {
      statusKeywords.push(status);
    }
  }

  return { amounts, dates, statusKeywords };
}
