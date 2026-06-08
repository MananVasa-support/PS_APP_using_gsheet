# Productivity Shastra — Project Documentation

Official documentation set for the unified **Productivity Shastra** web application
(internal codename for the merged suite built for the boss). These documents are
the single source of truth for product, architecture, and engineering decisions
and are **kept up to date as the project evolves** (merge → backend → deploy).

| # | Document | Purpose |
|---|----------|---------|
| 01 | [Architecture](./01-Architecture.md) | System & code architecture, folder layout, how the tools are merged |
| 02 | [PRD](./02-PRD.md) | Product Requirements — what the product is, who it's for, the tools |
| 03 | [TRD](./03-TRD.md) | Technical Requirements — stack, conventions, build, routing, styling |
| 04 | [App Flow](./04-App-Flow.md) | End-to-end user & navigation flow across the shell and every tool |
| 05 | [Backend Schema](./05-Backend-Schema.md) | Proposed data model & API for the (future) backend |

## Status snapshot

- **Phase:** Frontend merge ✅ complete and building green. Backend: not started (deliberate).
- **Last updated:** 2026-06-08 (frontend merge of 5 tools into one app).
- **Maintainer note (for Claude):** When you finish a meaningful change — merging a
  tool, adding the backend, learning a tool's deep logic — update the relevant doc
  here and the handoff in `../CLAUDE.md`. Do not let these drift.

## Formats

These are authored in Markdown (version-friendly and easy to keep in sync). They
can be exported to PDF or Word on request — ask Claude to "export the docs to PDF"
and a conversion step will be set up. Markdown remains the editable master.
