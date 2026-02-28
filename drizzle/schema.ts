import {
  foreignKey,
  index,
  int,
  unique,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// --- Content Articles --------------------------------------------------------

export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  url: varchar("url", { length: 2048 }),
  source: varchar("source", { length: 256 }),
  author: varchar("author", { length: 256 }),
  fullText: text("fullText"),
  summary: text("summary"),
  keyInsights: text("keyInsights"), // JSON array of strings
  publicationDate: timestamp("publicationDate"),
  importedAt: timestamp("importedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  isFavourite: boolean("isFavourite").default(false).notNull(),
  wordCount: int("wordCount").default(0),
}, (table) => ({
  importedAtIdx: index("articles_imported_at_idx").on(table.importedAt),
  sourceIdx: index("articles_source_idx").on(table.source),
}));

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

// --- Tags --------------------------------------------------------------------

export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  colour: varchar("colour", { length: 32 }).default("#6366f1").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

// --- Article ↔ Tag join ------------------------------------------------------

export const articleTags = mysqlTable("article_tags", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  tagId: int("tagId").notNull(),
}, (table) => ({
  articleIdIdx: index("article_tags_article_id_idx").on(table.articleId),
  tagIdIdx: index("article_tags_tag_id_idx").on(table.tagId),
  articleFk: foreignKey({
    columns: [table.articleId],
    foreignColumns: [articles.id],
    name: "article_tags_article_id_fk",
  }).onDelete("cascade"),
  tagFk: foreignKey({
    columns: [table.tagId],
    foreignColumns: [tags.id],
    name: "article_tags_tag_id_fk",
  }).onDelete("cascade"),
}));

export type ArticleTag = typeof articleTags.$inferSelect;

// --- Generated Content Drafts ------------------------------------------------

export const generatedDrafts = mysqlTable("generated_drafts", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  format: mysqlEnum("format", [
    "video_script",
    "linkedin_post",
    "instagram_caption",
    "blog_post",
  ]).notNull(),
  title: varchar("title", { length: 512 }),
  content: text("content").notNull(),
  angle: varchar("angle", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  articleCreatedAtIdx: index("generated_drafts_article_created_at_idx").on(table.articleId, table.createdAt),
  articleFormatIdx: index("generated_drafts_article_format_idx").on(table.articleId, table.format),
  articleFk: foreignKey({
    columns: [table.articleId],
    foreignColumns: [articles.id],
    name: "generated_drafts_article_id_fk",
  }).onDelete("cascade"),
}));

export type GeneratedDraft = typeof generatedDrafts.$inferSelect;
export type InsertGeneratedDraft = typeof generatedDrafts.$inferInsert;

// --- Content Repurposing Status ---------------------------------------------

export const contentRepurposing = mysqlTable(
  "content_repurposing",
  {
    id: int("id").autoincrement().primaryKey(),
    articleId: int("articleId").notNull(),
    format: mysqlEnum("format", [
      "video_script",
      "linkedin_post",
      "instagram_caption",
      "blog_post",
    ]).notNull(),
    status: mysqlEnum("status", ["untouched", "in_progress", "done"])
      .default("untouched")
      .notNull(),
    notes: text("notes"),
    draftId: int("draftId"), // optional link to generated_drafts
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    articleFormatUnique: unique("content_repurposing_article_format_unique").on(
      table.articleId,
      table.format
    ),
    articleStatusIdx: index("content_repurposing_article_status_idx").on(table.articleId, table.status),
    articleUpdatedAtIdx: index("content_repurposing_article_updated_at_idx").on(table.articleId, table.updatedAt),
    articleFk: foreignKey({
      columns: [table.articleId],
      foreignColumns: [articles.id],
      name: "content_repurposing_article_id_fk",
    }).onDelete("cascade"),
    draftFk: foreignKey({
      columns: [table.draftId],
      foreignColumns: [generatedDrafts.id],
      name: "content_repurposing_draft_id_fk",
    }).onDelete("set null"),
  })
);

export type ContentRepurposing = typeof contentRepurposing.$inferSelect;
export type InsertContentRepurposing = typeof contentRepurposing.$inferInsert;

// --- Raw Email Inbox ---------------------------------------------------------
// Every email forwarded to monkhouse-newsletter@manus.bot lands here first.
// status: 'pending' = awaiting review, 'approved' = ingested as article,
//         'discarded' = not useful content, 'error' = ingestion failed

export const rawEmails = mysqlTable("raw_emails", {
  id: int("id").autoincrement().primaryKey(),
  subject: varchar("subject", { length: 512 }),
  fromAddress: varchar("fromAddress", { length: 320 }),
  fromName: varchar("fromName", { length: 256 }),
  rawText: text("rawText"),
  rawHtml: text("rawHtml"),
  gmailMessageId: varchar("gmailMessageId", { length: 128 }), // Gmail message ID for dedup
  gmailThreadId: varchar("gmailThreadId", { length: 128 }),
  status: mysqlEnum("status", ["pending", "approved", "discarded", "error"])
    .default("pending")
    .notNull(),
  errorMessage: text("errorMessage"),
  articleId: int("articleId"), // set when approved and converted to article
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
}, (table) => ({
  statusReceivedAtIdx: index("raw_emails_status_received_at_idx").on(table.status, table.receivedAt),
  articleIdIdx: index("raw_emails_article_id_idx").on(table.articleId),
  articleFk: foreignKey({
    columns: [table.articleId],
    foreignColumns: [articles.id],
    name: "raw_emails_article_id_fk",
  }).onDelete("set null"),
}));

export type RawEmail = typeof rawEmails.$inferSelect;
export type InsertRawEmail = typeof rawEmails.$inferInsert;

// --- Newsletter Sources -------------------------------------------------------
// Tracks which email senders to monitor for newsletter ingestion

export const newsletterSources = mysqlTable("newsletter_sources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  emailAddress: varchar("emailAddress", { length: 320 }).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  lastIngestedAt: timestamp("lastIngestedAt"),
  totalIngested: int("totalIngested").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NewsletterSource = typeof newsletterSources.$inferSelect;
export type InsertNewsletterSource = typeof newsletterSources.$inferInsert;

// --- Ingest Log ---------------------------------------------------------------
// Records each scheduled ingest run

export const ingestLog = mysqlTable("ingest_log", {
  id: int("id").autoincrement().primaryKey(),
  runAt: timestamp("runAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["success", "partial", "error"]).notNull(),
  emailsFound: int("emailsFound").default(0).notNull(),
  emailsNew: int("emailsNew").default(0).notNull(),
  emailsSkipped: int("emailsSkipped").default(0).notNull(),
  errorMessage: text("errorMessage"),
  durationMs: int("durationMs"),
});

export type IngestLog = typeof ingestLog.$inferSelect;
export type InsertIngestLog = typeof ingestLog.$inferInsert;

// --- Focus Topics ------------------------------------------------------------
// The 3 content clusters Dom rotates through on LinkedIn (Day 1 / Day 2 / Day 3)
export const focusTopics = mysqlTable("focus_topics", {
  id: int("id").autoincrement().primaryKey(),
  dayNumber: int("dayNumber").notNull(), // 1, 2, or 3
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  keywords: text("keywords"), // JSON array of keyword strings for AI matching
  color: varchar("color", { length: 32 }), // UI accent colour e.g. "#00b4ff"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FocusTopic = typeof focusTopics.$inferSelect;
export type InsertFocusTopic = typeof focusTopics.$inferInsert;

// Junction table: which articles map to which focus topics (many-to-many)
export const articleFocusTopics = mysqlTable("article_focus_topics", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  focusTopicId: int("focusTopicId").notNull(),
  relevanceScore: int("relevanceScore").default(0).notNull(), // 0-100
  aiReason: text("aiReason"), // brief explanation from the LLM
  taggedAt: timestamp("taggedAt").defaultNow().notNull(),
}, (table) => ({
  articleFocusTopicUnique: unique("article_focus_topic_unique").on(table.articleId, table.focusTopicId),
  articleFk: foreignKey({
    columns: [table.articleId],
    foreignColumns: [articles.id],
    name: "aft_article_id_fk",
  }).onDelete("cascade"),
  focusTopicFk: foreignKey({
    columns: [table.focusTopicId],
    foreignColumns: [focusTopics.id],
    name: "aft_focus_topic_id_fk",
  }).onDelete("cascade"),
}));
export type ArticleFocusTopic = typeof articleFocusTopics.$inferSelect;
export type InsertArticleFocusTopic = typeof articleFocusTopics.$inferInsert;
