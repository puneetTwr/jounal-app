import { notFound } from "next/navigation";
import { getJournal } from "@/features/journal/actions";
import { JournalDetail } from "@/features/journal/components";

interface JournalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JournalDetailPage({ params }: JournalDetailPageProps) {
  const { id } = await params;
  const entry = await getJournal(id);

  if (!entry) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <JournalDetail entry={entry} />
    </main>
  );
}
