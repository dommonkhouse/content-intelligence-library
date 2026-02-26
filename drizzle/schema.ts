import {
  int,
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

// ─── Content Articles ────────────────────────────────────────────────────────

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
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

// ─── Tags ────────────────────────────────────────────────────────────────────

export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  colour: varchar("colour", { length: 32 }).default("#6366f1").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

// ─── Article ↔ Tag join ──────────────────────────────────────────────────────

export const articleTags = mysqlTable("article_tags", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  tagId: int("tagId").notNull(),
});

export type ArticleTag = typeof articleTags.$inferSelect;

// ─── Generated Content Drafts ────────────────────────────────────────────────

export const generatedDrafts = mysqlTable("generated_drafts", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  format: mysqlEnum("format", [
    "video_script",
    "linkedin_post",
    "instagram_caption",
    "blog_outline",
  ]).notNull(),
  title: varchar("title", { length: 512 }),
  content: text("content").notNull(),
  angle: varchar("angle", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeneratedDraft = typeof generatedDrafts.$inferSelect;
export type InsertGeneratedDraft = typeof generatedDrafts.$inferInsert;
