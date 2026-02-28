import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createArticle,
  deleteArticle,
  deleteDraft,
  deleteTag,
  getAllTags,
  getArticleById,
  getDraftsByArticle,
  listArticles,
  saveDraft,
  toggleFavourite,
  updateArticle,
  upsertTag,
  getCalendarData,
  upsertRepurposingStatus,
  insertRawEmail,
  listRawEmails,
  updateRawEmailStatus,
  getRawEmailById,
  listNewsletterSources,
  upsertNewsletterSource,
  toggleNewsletterSource,
  deleteNewsletterSource,
  listIngestLogs,
  getLastIngestRun,
} from "./db";
import { runGmailIngest } from "./gmailIngest";
import { invokeLLM } from "./_core/llm";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

// ─── Tags Router ──────────────────────────────────────────────────────────────

const tagsRouter = router({
  list: publicProcedure.query(() => getAllTags()),

  upsert: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(128), colour: z.string().optional() }))
    .mutation(({ input }) => upsertTag(input.name, input.colour)),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteTag(input.id)),
});

// ─── Articles Router ──────────────────────────────────────────────────────────

const articlesRouter = router({
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        tagIds: z.array(z.number()).optional(),
        source: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        favouritesOnly: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(24),
        offset: z.number().min(0).default(0),
      })
    )
    .query(({ input }) => listArticles(input)),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const article = await getArticleById(input.id);
      if (!article) throw new TRPCError({ code: "NOT_FOUND" });
      return article;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(512),
        url: z.string().max(2048).optional(),
        source: z.string().max(256).optional(),
        author: z.string().max(256).optional(),
        fullText: z.string().optional(),
        summary: z.string().optional(),
        keyInsights: z.string().optional(), // JSON string
        publicationDate: z.date().optional(),
        tagIds: z.array(z.number()).default([]),
      })
    )
    .mutation(({ input }) => {
      const { tagIds, ...data } = input;
      const wordCount = data.fullText ? data.fullText.split(/\s+/).length : 0;
      return createArticle({ ...data, wordCount }, tagIds);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(512).optional(),
        url: z.string().max(2048).optional(),
        source: z.string().max(256).optional(),
        author: z.string().max(256).optional(),
        fullText: z.string().optional(),
        summary: z.string().optional(),
        keyInsights: z.string().optional(),
        publicationDate: z.date().optional(),
        tagIds: z.array(z.number()).optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, tagIds, ...data } = input;
      if (data.fullText !== undefined) {
        (data as Record<string, unknown>).wordCount = data.fullText.split(/\s+/).length;
      }
      return updateArticle(id, data, tagIds);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteArticle(input.id)),

  toggleFavourite: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => toggleFavourite(input.id)),

  // ── URL Import ──────────────────────────────────────────────────────────────
  importFromUrl: protectedProcedure
    .input(z.object({ url: z.string().url(), tagIds: z.array(z.number()).default([]) }))
    .mutation(async ({ input }) => {
      // Use LLM to extract article metadata from the URL content
      const extractionPrompt = `You are a content extraction assistant. Given the URL below, extract the article information and return a JSON object with these exact fields:
- title: string (article title)
- source: string (publication/website name, e.g. "SaaStr", "Harvard Business Review")
- author: string (author name, or empty string if unknown)
- summary: string (2-3 sentence summary)
- keyInsights: array of strings (3-5 key takeaways as bullet points)
- fullText: string (the main article body text, cleaned of navigation/ads)
- publicationDate: string (ISO date string, or empty string if unknown)

URL: ${input.url}

Return ONLY valid JSON, no markdown fences.`;

      let extracted: {
        title: string;
        source: string;
        author: string;
        summary: string;
        keyInsights: string[];
        fullText: string;
        publicationDate: string;
      };

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You extract article content from URLs and return structured JSON." },
            { role: "user", content: extractionPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "article_extraction",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  source: { type: "string" },
                  author: { type: "string" },
                  summary: { type: "string" },
                  keyInsights: { type: "array", items: { type: "string" } },
                  fullText: { type: "string" },
                  publicationDate: { type: "string" },
                },
                required: ["title", "source", "author", "summary", "keyInsights", "fullText", "publicationDate"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0]?.message?.content ?? "{}";
        extracted = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to extract article content" });
      }

      const pubDate = extracted.publicationDate ? new Date(extracted.publicationDate) : undefined;
      const wordCount = extracted.fullText ? extracted.fullText.split(/\s+/).length : 0;

      return createArticle(
        {
          title: extracted.title || "Untitled",
          url: input.url,
          source: extracted.source,
          author: extracted.author,
          fullText: extracted.fullText,
          summary: extracted.summary,
          keyInsights: JSON.stringify(extracted.keyInsights),
          publicationDate: pubDate,
          wordCount,
        },
        input.tagIds
      );
    }),

  // ── Bulk import from pasted text (email/newsletter) ─────────────────────────
  importFromText: protectedProcedure
    .input(
      z.object({
        rawText: z.string().min(10),
        defaultTagIds: z.array(z.number()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      const extractionPrompt = `You are a content extraction assistant. The following is raw text from a newsletter email. Extract ALL distinct articles/posts mentioned in it. For each article return:
- title: string
- url: string (the article URL if present, otherwise empty string)
- source: string (publication name)
- author: string (or empty string)
- summary: string (2-3 sentences)
- keyInsights: array of 3-5 strings
- fullText: string (the full body text for that article)
- publicationDate: string (ISO date or empty string)

Return a JSON object with a single key "articles" containing an array of these objects.

RAW TEXT:
${input.rawText.slice(0, 12000)}

Return ONLY valid JSON.`;

      let extracted: {
        articles: {
          title: string;
          url: string;
          source: string;
          author: string;
          summary: string;
          keyInsights: string[];
          fullText: string;
          publicationDate: string;
        }[];
      };

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You extract multiple articles from newsletter emails and return structured JSON." },
            { role: "user", content: extractionPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "bulk_extraction",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  articles: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        url: { type: "string" },
                        source: { type: "string" },
                        author: { type: "string" },
                        summary: { type: "string" },
                        keyInsights: { type: "array", items: { type: "string" } },
                        fullText: { type: "string" },
                        publicationDate: { type: "string" },
                      },
                      required: ["title", "url", "source", "author", "summary", "keyInsights", "fullText", "publicationDate"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["articles"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0]?.message?.content ?? '{"articles":[]}';
        extracted = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to extract articles from text" });
      }

      const created = [];
      for (const item of extracted.articles) {
        const pubDate = item.publicationDate ? new Date(item.publicationDate) : undefined;
        const wordCount = item.fullText ? item.fullText.split(/\s+/).length : 0;
        const article = await createArticle(
          {
            title: item.title || "Untitled",
            url: item.url || undefined,
            source: item.source,
            author: item.author,
            fullText: item.fullText,
            summary: item.summary,
            keyInsights: JSON.stringify(item.keyInsights),
            publicationDate: pubDate,
            wordCount,
          },
          input.defaultTagIds
        );
        created.push(article);
      }
      return { count: created.length, articles: created };
    }),
});

// ─── Drafts Router ────────────────────────────────────────────────────────────

const draftsRouter = router({
  listByArticle: publicProcedure
    .input(z.object({ articleId: z.number() }))
    .query(({ input }) => getDraftsByArticle(input.articleId)),

  generate: protectedProcedure
    .input(
      z.object({
        articleId: z.number(),
        format: z.enum(["video_script", "linkedin_post", "instagram_caption", "blog_post"]),
        customAngle: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const article = await getArticleById(input.articleId);
      if (!article) throw new TRPCError({ code: "NOT_FOUND" });

      const formatInstructions: Record<string, string> = {
        video_script: `Write a compelling YouTube video script (800-1200 words) for a founder CEO audience. Structure: hook (30s), problem setup, main insights with examples, actionable takeaways, strong CTA. Use conversational, direct language. Include [PAUSE] markers and B-ROLL suggestions in brackets.`,
        linkedin_post: `Write a high-performing LinkedIn post (200-350 words). Start with a bold, scroll-stopping first line. Share a contrarian or surprising insight from the article. Use short paragraphs (1-2 sentences). End with a thought-provoking question to drive comments. No hashtag spam — max 3 relevant hashtags.`,
        instagram_caption: `Write an Instagram caption (150-250 words). Open with a punchy hook. Share one powerful insight in plain language. Use line breaks for readability. End with a call to action. Include 5-8 relevant hashtags on a new line.`,
        blog_post: `Create a detailed blog post outline (600-900 words of outline content). Include: SEO-optimised H1 title, meta description (155 chars), introduction hook, 4-6 H2 sections each with 3-4 bullet points of content to cover, conclusion with CTA. Also suggest 3 internal linking opportunities and 2 external authority sources to cite.`,
      };

      const insights = (() => {
        try { return JSON.parse(article.keyInsights ?? "[]"); } catch { return []; }
      })();

      const prompt = `You are a content strategist writing for Dominic Monkhouse, a UK-based business coach to founder CEOs. His voice is direct, sceptical, experienced, and grounded in real-world business experience. He challenges conventional wisdom and speaks plainly.

ARTICLE DETAILS:
Title: ${article.title}
Source: ${article.source ?? "Unknown"}
Summary: ${article.summary ?? ""}
Key Insights: ${insights.join("; ")}
Full Text (excerpt): ${(article.fullText ?? "").slice(0, 3000)}

${input.customAngle ? `SPECIFIC ANGLE TO TAKE: ${input.customAngle}` : ""}

TASK: ${formatInstructions[input.format]}

Return a JSON object with:
- title: string (headline/title for this piece)
- angle: string (one sentence describing the core angle/hook)
- content: string (the full generated content)`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert content strategist and ghostwriter for B2B thought leaders." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "generated_content",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                angle: { type: "string" },
                content: { type: "string" },
              },
              required: ["title", "angle", "content"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      const generated = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

      return saveDraft({
        articleId: input.articleId,
        format: input.format,
        title: generated.title,
        content: generated.content,
        angle: generated.angle,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteDraft(input.id)),
});

// ─── Calendar Router ─────────────────────────────────────────────────────────

const calendarRouter = router({
  getData: publicProcedure.query(() => getCalendarData()),

  updateStatus: protectedProcedure
    .input(
      z.object({
        articleId: z.number(),
        format: z.enum(["video_script", "linkedin_post", "instagram_caption", "blog_post"]),
        status: z.enum(["untouched", "in_progress", "done"]),
        notes: z.string().optional(),
      })
    )
    .mutation(({ input }) => upsertRepurposingStatus(input)),
});

// ─── Email Inbox Router ─────────────────────────────────────────────────────

const inboxRouter = router({
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "discarded", "error"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(({ input }) => listRawEmails(input)),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const email = await getRawEmailById(input.id);
      if (!email) throw new TRPCError({ code: "NOT_FOUND" });
      return email;
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "approved", "discarded", "error"]),
        errorMessage: z.string().optional(),
        articleId: z.number().optional(),
      })
    )
    .mutation(({ input }) =>
      updateRawEmailStatus(input.id, input.status, {
        errorMessage: input.errorMessage,
        articleId: input.articleId,
      })
    ),

  // Convert a raw email to an article in the library
  approve: publicProcedure
    .input(
      z.object({
        id: z.number(),
        tagIds: z.array(z.number()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      const email = await getRawEmailById(input.id);
      if (!email) throw new TRPCError({ code: "NOT_FOUND" });

      // Use LLM to extract article content from the email
      const extractionPrompt = `You are a content extraction assistant. The following is raw text from a forwarded email/newsletter. Extract the main article or content and return structured JSON.

EMAIL SUBJECT: ${email.subject ?? ""}
FROM: ${email.fromName ?? ""} <${email.fromAddress ?? ""}>

RAW TEXT:
${(email.rawText ?? "").slice(0, 8000)}

Return a JSON object with:
- title: string (article/post title)
- source: string (publication or sender name)
- author: string (author name or empty string)
- summary: string (2-3 sentence summary)
- keyInsights: array of 3-5 strings (key takeaways)
- fullText: string (main content, cleaned)
- publicationDate: string (ISO date or empty string)
- isArticle: boolean (true if this is substantive content worth keeping, false if it's a sales email, booking request, etc.)
- nonArticleReason: string (if isArticle is false, briefly explain why)`;

      let extracted: {
        title: string;
        source: string;
        author: string;
        summary: string;
        keyInsights: string[];
        fullText: string;
        publicationDate: string;
        isArticle: boolean;
        nonArticleReason: string;
      };

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You extract article content from emails and return structured JSON." },
            { role: "user", content: extractionPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "email_extraction",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  source: { type: "string" },
                  author: { type: "string" },
                  summary: { type: "string" },
                  keyInsights: { type: "array", items: { type: "string" } },
                  fullText: { type: "string" },
                  publicationDate: { type: "string" },
                  isArticle: { type: "boolean" },
                  nonArticleReason: { type: "string" },
                },
                required: ["title", "source", "author", "summary", "keyInsights", "fullText", "publicationDate", "isArticle", "nonArticleReason"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0]?.message?.content ?? "{}";
        extracted = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      } catch {
        await updateRawEmailStatus(input.id, "error", { errorMessage: "LLM extraction failed" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to extract content from email" });
      }

      const pubDate = extracted.publicationDate ? new Date(extracted.publicationDate) : undefined;
      const wordCount = extracted.fullText ? extracted.fullText.split(/\s+/).length : 0;

      const article = await createArticle(
        {
          title: extracted.title || email.subject || "Untitled",
          source: extracted.source || email.fromName || email.fromAddress || "",
          author: extracted.author,
          fullText: extracted.fullText,
          summary: extracted.summary,
          keyInsights: JSON.stringify(extracted.keyInsights),
          publicationDate: pubDate,
          wordCount,
        },
        input.tagIds
      );

      await updateRawEmailStatus(input.id, "approved", { articleId: article.id });
      return { article, isArticle: extracted.isArticle, nonArticleReason: extracted.nonArticleReason };
    }),
});

// ─── Ingest Settings Router ──────────────────────────────────────────────────

const ingestRouter = router({
  // Newsletter sources management
  listSources: publicProcedure.query(() => listNewsletterSources()),

  addSource: publicProcedure
    .input(z.object({ name: z.string().min(1).max(256), emailAddress: z.string().email() }))
    .mutation(({ input }) => upsertNewsletterSource(input)),

  toggleSource: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => toggleNewsletterSource(input.id)),

  deleteSource: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteNewsletterSource(input.id)),

  // Ingest log
  listLogs: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(({ input }) => listIngestLogs(input.limit)),

  getLastRun: publicProcedure.query(() => getLastIngestRun()),

  // Manual trigger: run Gmail ingest now
  runNow: publicProcedure
    .input(
      z.object({
        maxPerSource: z.number().min(1).max(200).default(50),
        afterDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await runGmailIngest({
        maxPerSource: input.maxPerSource,
        afterDate: input.afterDate,
      });
      return result;
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: protectedProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  tags: tagsRouter,
  articles: articlesRouter,
  drafts: draftsRouter,
  calendar: calendarRouter,
  inbox: inboxRouter,
  ingest: ingestRouter,
});

export type AppRouter = typeof appRouter;
