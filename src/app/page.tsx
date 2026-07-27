import { listJournals } from "@/features/journal/actions";
import { JournalList } from "@/features/journal/components";

export default async function Home() {
  const entries = await listJournals();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Journal</h1>
      <JournalList entries={entries} />
    </main>
  );
}
