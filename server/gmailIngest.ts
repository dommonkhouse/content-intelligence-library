/**
 * Gmail Ingest Service
 * Uses the Manus MCP CLI to search Gmail for newsletter emails and insert them
 * into the raw_emails queue for review/approval.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { getDb } from "./db";
import {
  rawEmails,
  newsletterSources,
  ingestLog,
  type InsertRawEmail,
} from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

const execFileAsync = promisify(execFile);

// ─── Types from Gmail MCP ─────────────────────────────────────────────────────

interface GmailMessage {
  id: string;
  threadId: string;
  subject?: string;
  from?: string;
  date?: string;
  snippet?: string;
  body?: string;
  labels?: string[];
}

interface GmailSearchResult {
  messages?: GmailMessage[];
  resultSizeEstimate?: number;
}

// ─── MCP Helper ───────────────────────────────────────────────────────────────

async function callGmailMcp(toolName: string, input: Record<string, unknown>): Promise<unknown> {
  const args = [
    "tool", "call", toolName,
    "--server", "gmail",
    "--input", JSON.stringify(input),
  ];

  const { stdout, stderr } = await execFileAsync("manus-mcp-cli", args, {
    timeout: 60_000,
    maxBuffer: 10 * 1024 * 1024, // 10MB
  });

  if (stderr && stderr.includes("Error")) {
    throw new Error(`MCP error: ${stderr}`);
  }

  // Parse the JSON output from MCP
  const text = stdout.trim();
  // MCP CLI returns JSON after the tool output marker
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Could not parse MCP output: ${text.slice(0, 200)}`);
  }
  return JSON.parse(jsonMatch[0]);
}

// ─── Email Parser ─────────────────────────────────────────────────────────────

function parseFromHeader(from: string): { name: string; address: string } {
  // Handles: "Name <email@example.com>" or "email@example.com"
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^["']|["']$/g, ""), address: match[2].trim().toLowerCase() };
  }
  return { name: "", address: from.trim().toLowerCase() };
}

// ─── Check for existing Gmail message IDs ────────────────────────────────────

async function getExistingGmailIds(gmailIds: string[]): Promise<Set<string>> {
  if (!gmailIds.length) return new Set();
  const db = await getDb();
  if (!db) return new Set();

  const rows = await db
    .select({ gmailMessageId: rawEmails.gmailMessageId })
    .from(rawEmails)
    .where(inArray(rawEmails.gmailMessageId, gmailIds));

  return new Set(rows.map((r) => r.gmailMessageId).filter(Boolean) as string[]);
}

// ─── Main Ingest Function ─────────────────────────────────────────────────────

export interface IngestResult {
  emailsFound: number;
  emailsNew: number;
  emailsSkipped: number;
  errors: string[];
  durationMs: number;
}

export async function runGmailIngest(opts?: {
  maxPerSource?: number;
  afterDate?: Date;
}): Promise<IngestResult> {
  const startTime = Date.now();
  const result: IngestResult = {
    emailsFound: 0,
    emailsNew: 0,
    emailsSkipped: 0,
    errors: [],
    durationMs: 0,
  };

  const db = await getDb();
  if (!db) {
    result.errors.push("Database not available");
    result.durationMs = Date.now() - startTime;
    return result;
  }

  // Load active newsletter sources
  const sources = await db
    .select()
    .from(newsletterSources)
    .where(eq(newsletterSources.isActive, true));

  if (!sources.length) {
    result.durationMs = Date.now() - startTime;
    return result;
  }

  const maxPerSource = opts?.maxPerSource ?? 50;

  // Build Gmail search query: search for emails from any active source
  const fromQuery = sources.map((s) => `from:${s.emailAddress}`).join(" OR ");
  // Optionally restrict to emails after a certain date
  const afterClause = opts?.afterDate
    ? ` after:${Math.floor(opts.afterDate.getTime() / 1000)}`
    : "";
  const query = `(${fromQuery})${afterClause}`;

  let searchResult: GmailSearchResult;
  try {
    searchResult = (await callGmailMcp("gmail_search_messages", {
      q: query,
      max_results: maxPerSource * sources.length,
    })) as GmailSearchResult;
  } catch (err) {
    result.errors.push(`Gmail search failed: ${String(err)}`);
    await logIngestRun(db, "error", result, startTime, result.errors.join("; "));
    result.durationMs = Date.now() - startTime;
    return result;
  }

  const messages = searchResult?.messages ?? [];
  result.emailsFound = messages.length;

  if (!messages.length) {
    await logIngestRun(db, "success", result, startTime);
    result.durationMs = Date.now() - startTime;
    return result;
  }

  // Check which Gmail IDs we already have
  const gmailIds = messages.map((m) => m.id).filter(Boolean);
  const existingIds = await getExistingGmailIds(gmailIds);

  // Filter to new messages only
  const newMessages = messages.filter((m) => m.id && !existingIds.has(m.id));
  result.emailsSkipped = messages.length - newMessages.length;

  if (!newMessages.length) {
    await logIngestRun(db, "success", result, startTime);
    result.durationMs = Date.now() - startTime;
    return result;
  }

  // Read full content for new messages via gmail_read_threads
  const threadIds = Array.from(new Set(newMessages.map((m) => m.threadId).filter(Boolean)));

  let threads: Record<string, GmailMessage[]> = {};
  try {
    // Read in batches of 100 (MCP limit)
    for (let i = 0; i < threadIds.length; i += 100) {
      const batch = threadIds.slice(i, i + 100);
      const threadResult = (await callGmailMcp("gmail_read_threads", {
        thread_ids: batch,
        include_full_messages: true,
      })) as { threads?: Array<{ id: string; messages?: GmailMessage[] }> };

      for (const thread of threadResult?.threads ?? []) {
        threads[thread.id] = thread.messages ?? [];
      }
    }
  } catch (err) {
    // Fall back to using the search result data (snippet only)
    console.warn("[GmailIngest] Failed to read full thread content:", err);
  }

  // Insert new emails
  for (const msg of newMessages) {
    try {
      // Get full message content from thread data if available
      const threadMessages = threads[msg.threadId] ?? [];
      const fullMsg = threadMessages.find((m) => m.id === msg.id) ?? msg;

      const from = fullMsg.from ?? msg.from ?? "";
      const { name: fromName, address: fromAddress } = parseFromHeader(from);

      const rawText = fullMsg.body ?? fullMsg.snippet ?? msg.snippet ?? "";
      const subject = fullMsg.subject ?? msg.subject ?? "(no subject)";
      const dateStr = fullMsg.date ?? msg.date;
      const receivedAt = dateStr ? new Date(dateStr) : new Date();

      const emailData: InsertRawEmail = {
        subject,
        fromAddress,
        fromName,
        rawText,
        gmailMessageId: msg.id,
        gmailThreadId: msg.threadId,
        receivedAt,
      };

      await db.insert(rawEmails).values(emailData);
      result.emailsNew++;

      // Update source's lastIngestedAt and totalIngested
      const source = sources.find(
        (s) => s.emailAddress === fromAddress || fromAddress.includes(s.emailAddress)
      );
      if (source) {
        await db
          .update(newsletterSources)
          .set({
            lastIngestedAt: new Date(),
            totalIngested: source.totalIngested + 1,
          })
          .where(eq(newsletterSources.id, source.id));
      }
    } catch (err) {
      result.errors.push(`Failed to insert message ${msg.id}: ${String(err)}`);
    }
  }

  const status = result.errors.length === 0 ? "success" : result.emailsNew > 0 ? "partial" : "error";
  await logIngestRun(db, status, result, startTime, result.errors.join("; ") || undefined);
  result.durationMs = Date.now() - startTime;
  return result;
}

// ─── Log Helper ───────────────────────────────────────────────────────────────

async function logIngestRun(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  status: "success" | "partial" | "error",
  result: IngestResult,
  startTime: number,
  errorMessage?: string
) {
  try {
    await db.insert(ingestLog).values({
      status,
      emailsFound: result.emailsFound,
      emailsNew: result.emailsNew,
      emailsSkipped: result.emailsSkipped,
      errorMessage: errorMessage ?? null,
      durationMs: Date.now() - startTime,
    });
  } catch (err) {
    console.error("[GmailIngest] Failed to write ingest log:", err);
  }
}
