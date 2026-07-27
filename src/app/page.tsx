import { listJournals } from "@/features/journal/actions";
import { CreateJournalButton, JournalList } from "@/features/journal/components";

export default async function Home() {
  const entries = await listJournals();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Journal</h1>
        <CreateJournalButton />
      </div>
      <JournalList entries={entries} />
    </main>
  );
}
