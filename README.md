# Logos

A structured argument graph. You publish short, reusable **clauses** and compose them into **arguments**. Any argument's conclusion can be a premise in another argument, so the whole thing grows into a directed acyclic graph of logical dependencies.

Live: https://logos-sandy-tau.vercel.app

## Concepts

- **Clause** — one proposition, e.g. "Logic depends on nothing." It can serve as a premise, a conclusion, or both. Each clause has optional **Notes** (summaries, quotes, examples) and a display-only **category** path like `Ethics/Virtues/Love`.
- **Argument** — ordered premises plus exactly one conclusion. A clause can conclude at most one argument.
- **Citation** — created automatically when an argument uses another argument's conclusion as a premise.

## Pages

- `/` — the full graph. Every clause is a node, and every argument draws colored edges from its premises to its conclusion. Categories fold and unfold, and search matches both clause text and category names.
- `/clauses` — list and search clauses. Click one to edit its category and Notes.
- `/arguments` — build an argument by picking premises in order, then a conclusion. Includes a reference panel of valid argument forms.

## Stack

- Next.js (App Router), TypeScript, Tailwind
- Postgres (Neon) via Prisma 7 with `@prisma/adapter-pg`
- `@xyflow/react` + `dagre` for the graph layout
- Hosted on Vercel

There is no sign-in. The app runs as a single user, and every write is gated by an action password.

## Running locally

1. Install dependencies. This also generates the Prisma client.

   ```bash
   npm install
   ```

2. Create `.env` with:

   ```bash
   DATABASE_URL="postgresql://..."
   ACTION_PASSWORD="..."
   ```

3. Apply migrations and start the dev server.

   ```bash
   npx prisma migrate deploy
   npm run dev
   ```

4. Open http://localhost:3000.

## Deploying

```bash
git push
npx vercel --prod --yes
```
