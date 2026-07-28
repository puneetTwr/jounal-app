import { listFilesRecursively } from "@/lib/filesystem";

const MARKDOWN_FILE_EXTENSION = ".md";

/** Lists every Markdown (`.md`) file path found recursively under `directory`. */
export async function listMarkdownFilePaths(directory: string): Promise<string[]> {
    const filePaths = await listFilesRecursively(directory);
    return filePaths.filter((filePath) => filePath.endsWith(MARKDOWN_FILE_EXTENSION));
}
