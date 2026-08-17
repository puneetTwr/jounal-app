import { isGitBackupConfigured, isGitBackupFeatureAvailable } from "@/features/git-backup/actions";
import { BackupToGitButton, RestoreFromGitButton } from "@/features/git-backup/components";
import { listJournals, type JournalSearchFilters } from "@/features/journal/actions";
import { CreateJournalButton, JournalList, SearchAndFilterBar } from "@/features/journal/components";

interface HomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseFilters(params: Record<string, string | string[] | undefined>): JournalSearchFilters {
  return {
    query: toSingleValue(params.q),
    favorite: toSingleValue(params.favorite) === "1" ? true : undefined,
    pinned: toSingleValue(params.pinned) === "1" ? true : undefined,
    archived: toSingleValue(params.archived) === "1" ? true : undefined,
  };
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = await searchParams;
  const filters = parseFilters(resolvedSearchParams);
  const entries = await listJournals(filters);
  const isGitFeatureAvailable = await isGitBackupFeatureAvailable();
  const isGitConfigured = await isGitBackupConfigured();

  const hasActiveFilters = Boolean(
    filters.query?.trim() || filters.favorite || filters.pinned || filters.archived
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-page-title font-bold">Journal</h1>
        <div className="flex items-center gap-4">
          {isGitFeatureAvailable && (
            <div className="flex items-center gap-1 border-r border-border pr-4">
              <RestoreFromGitButton isConfigured={isGitConfigured} />
              <BackupToGitButton isConfigured={isGitConfigured} />
            </div>
          )}
          <CreateJournalButton />
        </div>
      </div>

      <SearchAndFilterBar
        initialQuery={filters.query ?? ""}
        initialFavorite={Boolean(filters.favorite)}
        initialPinned={Boolean(filters.pinned)}
        initialArchived={Boolean(filters.archived)}
      />

      <JournalList entries={entries} hasActiveFilters={hasActiveFilters} />
    </main>
  );
}
