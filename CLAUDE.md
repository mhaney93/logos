# Logos

@AGENTS.md

A structured argument graph platform where users publish reusable logical clauses and compose them into arguments. Think Kialo meets formal logic, built for philosophers and curious thinkers alike.

## What Logos is

Users build arguments from composable primitives:

- **Clause** — a single proposition (e.g. "All humans are mortal"). Can serve as a premise or conclusion. Has a unique ID, author, and timestamp.
- **Argument** — one or more clauses as premises + one clause as conclusion. Can itself be used as a premise in another argument, enabling arbitrarily deep argument graphs.
- **Citation** — when your argument is used as a premise by someone else. Powers the reputation system.

The result is a DAG (directed acyclic graph) of logical dependencies across the entire user base.

## Core Features

Planned and built features (check the code before assuming one exists):

- **Argument builder** — drag clauses into premise slots or type new ones with AI suggestions
- **AI similarity detection** (planned) — real-time semantic search as users type, surfacing existing clauses to prevent duplicates. Will use pgvector + embeddings.
- **Reputation system** — citation count is your reputation score. Non-transferable, identity-bound. Displayed on profiles.
- **Weighted voting** — thumbs up/down on clauses and arguments, weighted by the voter's citation count
- **Governance & feature gating** — certain features require a citation threshold
- **Private DM workspaces** — private debates between 2+ users using the same argument tools. Nothing hits the public graph unless participants choose to promote it.

## Architecture Decisions

- **Clause uniqueness is enforced socially + by AI** — not technically. The AI suggests existing clauses; users decide. The AI deduplication layer is the main guard against fragmentation.
- **Arguments are composable recursively** — an Argument can be used as a premise in another Argument. This is load-bearing for the platform's value.

## Tech Stack

- **Framework** — Next.js (App Router)
- **Database** — Postgres with pgvector for semantic similarity search
- **Auth** — none yet: a single local user (clerkId "solo-user") and an ACTION_PASSWORD gate in `src/lib/auth.ts`; Clerk is planned
- **AI** — not built; `Clause.embedding` (pgvector) exists in the schema but nothing fills it. Claude embeddings + similarity suggestions are planned
- **Hosting** — Vercel

## Coding Conventions

- TypeScript everywhere
- App Router conventions — server components by default, client components only when needed
- Tailwind for styling
- Prisma as ORM
- Keep components small and focused
- No comments unless the WHY is non-obvious
