import { listArguments } from "@/lib/actions/arguments";
import { listClauses } from "@/lib/actions/clauses";
import { getOrCreateUser } from "@/lib/auth";
import { ArgumentForm } from "./ArgumentForm";
import { ArgumentItem } from "./ArgumentItem";

export const dynamic = "force-dynamic";

export default async function ArgumentsPage() {
  const [args, clauses, user] = await Promise.all([
    listArguments(),
    listClauses(),
    getOrCreateUser(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-8 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Arguments</h1>

      {clauses.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No clauses yet — publish some clauses first.
        </p>
      ) : (
        <ArgumentForm clauses={clauses} />
      )}

      <ul className="flex flex-col gap-4">
        {args.map((argument) => (
          <ArgumentItem
            key={argument.id}
            id={argument.id}
            form={argument.form}
            premises={argument.premises.map((p) => ({
              clauseId: p.clauseId,
              text: p.clause.text,
            }))}
            conclusion={argument.conclusion}
            authorUsername={argument.author.username}
            citationCount={argument._count.citationsReceived}
            isOwnArgument={argument.authorId === user?.id}
            allClauses={clauses}
          />
        ))}
        {args.length === 0 && (
          <p className="text-sm text-zinc-500">No arguments yet.</p>
        )}
      </ul>
    </div>
  );
}
