import { getDeepestArgument } from "@/lib/actions/arguments";
import { ConclusionCard } from "./ConclusionCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const argument = await getDeepestArgument();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-8 py-12">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Conclusions
        </h1>
      </div>

      {argument ? (
        <ConclusionCard
          key={argument.id}
          premises={argument.premises.map((p) => ({
            clauseId: p.clauseId,
            text: p.clause.text,
          }))}
          conclusionText={argument.conclusion.text}
          authorUsername={argument.author.username}
          citationCount={argument._count.citationsReceived}
        />
      ) : (
        <p className="text-center text-sm text-zinc-500">
          No conclusions yet — be the first to build an argument.
        </p>
      )}
    </main>
  );
}
