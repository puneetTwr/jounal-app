import { journalService } from "./src/features/journal/services";
import { listFilesRecursively, readTextFile } from "./src/lib/filesystem";
import { getJournalsDirectoryPath } from "./src/lib/paths";

async function main() {
  const created = await journalService.createJournal({
    title: "  My First Entry  ",
    journalDate: "2026-07-27",
  });

  console.log("Created entry:", JSON.stringify(created, null, 2));

  const filePath = `${getJournalsDirectoryPath()}/${created.frontMatter.id}.md`;
  const raw = await readTextFile(filePath);
  console.log("--- raw file contents ---");
  console.log(raw);

  const listed = await journalService.listJournals();
  console.log("--- listJournals() count ---", listed.length);

  const files = await listFilesRecursively(getJournalsDirectoryPath());
  console.log("--- files on disk ---", files);
}

main().catch((error) => {
  console.error("FAILED:", error);
  process.exit(1);
});
