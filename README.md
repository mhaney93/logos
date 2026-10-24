# Logos

A structured argument graph. You publish short, reusable **clauses** and compose them into **arguments**. Any argument's conclusion can be a premise in another argument, so the whole thing grows into a directed acyclic graph of logical dependencies.

Live: https://logos-sandy-tau.vercel.app

## Concepts

- **Clause** — one proposition, e.g. "Logic depends on nothing." It can serve as a premise, a conclusion, or both. Each clause has optional **Notes** (summaries, quotes, examples) and a display-only **category** path like `Ethics/Virtues/Love`.
- **Argument** — ordered premises plus exactly one conclusion. A clause can conclude at most one argument.
- **Citation** — created automatically when an argument uses another argument's conclusion as a premise.

## The map

The app is a single page, `/`, showing the full graph. Every clause is a node, and every argument draws colored edges from its premises to its conclusion. Categories fold and unfold. The buttons at the top right expand every argument (Expand all, which then becomes Back to home) or close every argument so only final conclusions remain while category folds stay as they are (Collapse all). Search matches clause text, clause Notes, and category names, and it also highlights and unfolds every premise that leads to a matching clause. As you type, a dropdown under the search box lists the matches, each with its category trail read most specific first (`Love <- Virtues <- Ethics`). Clauses that match only in their Notes are listed after title matches, with a snippet of the matching Notes. Use the arrow keys to choose one and Enter to jump to it. The × button clears the search. Click a clause to see its category and edit its Notes. Drag with the left mouse button to pan the map. Middle-click to start autoscrolling: the map glides toward the pointer, faster the farther it moves from where you clicked; middle-click again to stop.

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
