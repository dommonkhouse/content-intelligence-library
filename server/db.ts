import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Article,
  ArticleTag,
  InsertArticle,
  InsertTag,
  InsertUser,
  Tag,
  articleTags,
  articles,
  generatedDrafts,
  tags,
  users,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function getAllTags(): Promise<Tag[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tags).orderBy(tags.name);
}

export async function upsertTag(name: string, colour?: string): Promise<Tag> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db.select().from(tags).where(eq(tags.name, name)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(tags).values({ name, colour: colour ?? "#6366f1" });
  const created = await db.select().from(tags).where(eq(tags.name, name)).limit(1);
  return created[0]!;
}

export async function deleteTag(tagId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(articleTags).where(eq(articleTags.tagId, tagId));
  await db.delete(tags).where(eq(tags.id, tagId));
}

// ─── Articles ─────────────────────────────────────────────────────────────────

export type ArticleWithTags = Article & { tags: Tag[] };

async function attachTags(db: ReturnType<typeof drizzle>, articleList: Article[]): Promise<ArticleWithTags[]> {
  if (articleList.length === 0) return [];
  const ids = articleList.map((a) => a.id);
  const joins = await db
    .select({ articleId: articleTags.articleId, tagId: articleTags.tagId })
    .from(articleTags)
    .where(inArray(articleTags.articleId, ids));

  const tagIds = Array.from(new Set(joins.map((j) => j.tagId)));
  const tagList: Tag[] = tagIds.length
    ? await db.select().from(tags).where(inArray(tags.id, tagIds))
    : [];

  const tagMap = new Map(tagList.map((t) => [t.id, t]));
  const articleTagMap = new Map<number, Tag[]>();
  for (const j of joins) {
    const t = tagMap.get(j.tagId);
    if (!t) continue;
    if (!articleTagMap.has(j.articleId)) articleTagMap.set(j.articleId, []);
    articleTagMap.get(j.articleId)!.push(t);
  }
  return articleList.map((a) => ({ ...a, tags: articleTagMap.get(a.id) ?? [] }));
}

export async function listArticles(opts: {
  search?: string;
  tagIds?: number[];
  source?: string;
  dateFrom?: Date;
  dateTo?: Date;
  favouritesOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ items: ArticleWithTags[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];

  if (opts.search) {
    const q = `%${opts.search}%`;
    conditions.push(
      or(like(articles.title, q), like(articles.fullText, q), like(articles.summary, q))
    );
  }
  if (opts.source) conditions.push(like(articles.source, `%${opts.source}%`));
  if (opts.favouritesOnly) conditions.push(eq(articles.isFavourite, true));
  if (opts.dateFrom) conditions.push(sql`${articles.importedAt} >= ${opts.dateFrom}`);
  if (opts.dateTo) conditions.push(sql`${articles.importedAt} <= ${opts.dateTo}`);

  // If filtering by tags, find matching article IDs first
  let tagFilteredIds: number[] | null = null;
  if (opts.tagIds && opts.tagIds.length > 0) {
    const rows = await db
      .select({ articleId: articleTags.articleId })
      .from(articleTags)
      .where(inArray(articleTags.tagId, opts.tagIds));
    tagFilteredIds = Array.from(new Set(rows.map((r) => r.articleId)));
    if (tagFilteredIds.length === 0) return { items: [], total: 0 };
    conditions.push(inArray(articles.id, tagFilteredIds));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [countResult, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(articles).where(where),
    db
      .select()
      .from(articles)
      .where(where)
      .orderBy(desc(articles.importedAt))
      .limit(opts.limit ?? 50)
      .offset(opts.offset ?? 0),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const items = await attachTags(db, rows);
  return { items, total };
}

export async function getArticleById(id: number): Promise<ArticleWithTags | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  if (!rows[0]) return null;
  const [withTags] = await attachTags(db, rows);
  return withTags ?? null;
}

export async function createArticle(
  data: InsertArticle,
  tagIds: number[]
): Promise<ArticleWithTags> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(articles).values(data);
  const created = await db
    .select()
    .from(articles)
    .orderBy(desc(articles.id))
    .limit(1);
  const article = created[0]!;
  if (tagIds.length) {
    await db.insert(articleTags).values(tagIds.map((tagId) => ({ articleId: article.id, tagId })));
  }
  const [withTags] = await attachTags(db, [article]);
  return withTags!;
}

export async function updateArticle(
  id: number,
  data: Partial<InsertArticle>,
  tagIds?: number[]
): Promise<ArticleWithTags | null> {
  const db = await getDb();
  if (!db) return null;
  if (Object.keys(data).length) {
    await db.update(articles).set(data).where(eq(articles.id, id));
  }
  if (tagIds !== undefined) {
    await db.delete(articleTags).where(eq(articleTags.articleId, id));
    if (tagIds.length) {
      await db.insert(articleTags).values(tagIds.map((tagId) => ({ articleId: id, tagId })));
    }
  }
  return getArticleById(id);
}

export async function deleteArticle(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(articleTags).where(eq(articleTags.articleId, id));
  await db.delete(generatedDrafts).where(eq(generatedDrafts.articleId, id));
  await db.delete(articles).where(eq(articles.id, id));
}

export async function toggleFavourite(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const row = await db.select({ isFavourite: articles.isFavourite }).from(articles).where(eq(articles.id, id)).limit(1);
  const next = !row[0]?.isFavourite;
  await db.update(articles).set({ isFavourite: next }).where(eq(articles.id, id));
  return next;
}

// ─── Generated Drafts ─────────────────────────────────────────────────────────

export async function getDraftsByArticle(articleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(generatedDrafts)
    .where(eq(generatedDrafts.articleId, articleId))
    .orderBy(desc(generatedDrafts.createdAt));
}

export async function saveDraft(data: {
  articleId: number;
  format: "video_script" | "linkedin_post" | "instagram_caption" | "blog_outline";
  title: string;
  content: string;
  angle: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(generatedDrafts).values(data);
  const saved = await db
    .select()
    .from(generatedDrafts)
    .orderBy(desc(generatedDrafts.id))
    .limit(1);
  return saved[0]!;
}

export async function deleteDraft(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(generatedDrafts).where(eq(generatedDrafts.id, id));
}
