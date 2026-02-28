# Content Intelligence Database - TODO

## Schema & Backend
- [x] Database schema: articles, tags, article_tags, generated_drafts tables
- [x] DB push migration
- [x] Query helpers in server/db.ts
- [x] tRPC routers: articles CRUD, tags, search/filter, URL import, LLM idea generator

## Frontend
- [x] Global dark editorial theme (index.css)
- [x] DashboardLayout with sidebar navigation
- [x] Content Library page with article cards, search, filter
- [x] Article detail / rich text viewer with markdown
- [x] Tag management UI
- [x] Content Idea Generator panel (LLM)
- [x] Bulk import modal (URL + email paste)
- [x] Export / copy to clipboard for generated ideas
- [x] App.tsx routes wiring

## Data Population
- [x] Seed SaaStr email articles into database

## Tests
- [x] Vitest tests for article CRUD procedures (7 tests passing)

## Auth Removal
- [x] Remove auth gate from DashboardLayout (no sign-in required)
- [x] Remove global auth redirect from main.tsx
- [x] All routes now open without login

## Content Calendar
- [x] Add content_repurposing table to track status per article per format
- [x] Build ContentCalendar page with board view (Untouched / In Progress / Done)
- [x] Track status per format: Video Script, LinkedIn, Instagram, Blog Post
- [x] Add route and sidebar nav link for Content Calendar
- [x] Push to GitHub after completion

## Email Ingest Pipeline
- [ ] Build email ingest webhook endpoint in the app (POST /api/ingest/email)
- [ ] Generate a secret token to secure the ingest endpoint
- [ ] Update Alan Whitman Gmail filter: remove "Alan" label, add forward to ingest endpoint
- [ ] Pull all existing Alan-tagged emails from Gmail and import into content library
- [ ] Save checkpoint and push to GitHub

## Email Inbox Intercept
- [ ] Add raw_emails table to DB schema
- [ ] Build /api/email-ingest webhook endpoint to receive forwarded emails
- [ ] Build Email Inbox page showing raw captured emails with Approve/Discard actions
- [ ] Auto-detect article vs non-article emails and route accordingly
- [ ] Show clickable links in raw email view (for Gmail verification URL)
- [ ] Add Inbox nav item to sidebar
- [ ] Set up Alan Gmail filter to forward to monkhouse-newsletter@manus.bot

## Gmail Ingest Automation
- [x] Add newsletter_sources and ingest_log tables to DB schema
- [x] Seed 6 newsletter sources (Alan Whitman, Eric Partaker, Not Another CEO, OnlyCFO, Ryan Deiss, Scot Chisholm)
- [x] Build server/gmailIngest.ts: Gmail MCP search + dedup by gmailMessageId + insert to raw_emails
- [x] Add ingest tRPC router: listSources, addSource, toggleSource, deleteSource, listLogs, getLastRun, runNow
- [x] Build Ingest Settings page: status cards, sources table, ingest history log, manual trigger
- [x] Add Ingest Settings nav item to sidebar
- [x] Bulk-ingest 180 historical newsletter emails from Gmail (194 found, 14 excluded as non-newsletter)

## AI Enrichment Pipeline + Daily Scheduler
- [x] Process 180 pending inbox emails through AI enrichment (extract article, auto-tag, save to library) — 75 saved, 94 discarded as promotional/sales
- [x] Set up daily automatic Gmail ingest scheduler (runs every morning at 7am UK time)

## Ingest-Queue Gmail Label
- [x] Create "ingest-queue" label in Gmail
- [x] Update gmailIngest.ts to also search label:ingest-queue (in addition to sender-based search)
- [ ] Remove the ingest-queue label from emails after successful processing (prevent re-ingestion) — NOTE: Gmail MCP has no label-removal tool; deduplication via gmailMessageId prevents re-ingestion instead

## Focus Topics Feature (3-Cluster LinkedIn Strategy)
- [x] Add focus_topics and article_focus_topics tables to DB schema
- [x] Seed 3 focus topic clusters (Day 1: Hiring/Topgrading, Day 2: Founder CEO, Day 3: Self-Running Team)
- [x] AI-tag all 486 articles against 3 focus topics - 439 pairs tagged, 27 skipped (rate limits)
- [x] Build Focus Topics page with per-cluster article lists, relevance filter, and tagging progress
- [x] Add Focus Topics nav item to sidebar (Target icon)
- [ ] Build Day 1/2/3 rotation queue view: next 30 days of content mapped to clusters
- [ ] Auto-tag new articles against focus topics during bulk process pipeline

## GitHub Sync + Google OAuth + Auto-Processing
- [x] Pull latest GitHub code and merge into project
- [ ] Set up Google OAuth credentials (client ID + secret) for Gmail API label/delete management
- [ ] Implement post-ingest label removal: strip ingest-queue label; delete email if it was the only label
- [x] Auto-process pending emails without manual trigger (never ask Dom to process)
- [x] Add all new newsletter senders as named sources (15 senders total now in Ingest Settings)
