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
