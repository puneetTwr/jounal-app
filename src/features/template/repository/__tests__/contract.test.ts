import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryGithubRepo } from "@/testSupport/inMemoryGithubRepo";
import { filesystemTemplateRepository } from "../filesystem";
import { githubTemplateRepository } from "../githubApi";
import type { TemplateRepository } from "../TemplateRepository";

/**
 * Runs the same read-only contract against both TemplateRepository
 * implementations. TemplateRepository has no create/update/delete (see
 * TemplateRepository.ts), so each adapter's setup places a template file
 * directly in its storage rather than going through the repository —
 * there's no writer API to test parity on.
 */

function templateMarkdown(id: string, name: string): string {
    const timestamp = "2026-08-17T00:00:00.000Z";

    return [
        "---",
        "version: 1",
        `id: ${id}`,
        `name: ${name}`,
        `createdAt: '${timestamp}'`,
        `updatedAt: '${timestamp}'`,
        "tags: []",
        "---",
        "Body",
        "",
    ].join("\n");
}

interface Adapter {
    name: string;
    repository: TemplateRepository;
    setUp: () => Promise<void> | void;
    tearDown: () => Promise<void> | void;
    writeRawFile: (relativePath: string, content: string) => Promise<void> | void;
}

let filesystemTempDir = "";
let githubFake: ReturnType<typeof createInMemoryGithubRepo>;

const adapters: Adapter[] = [
    {
        name: "filesystem",
        repository: filesystemTemplateRepository,
        setUp: async () => {
            filesystemTempDir = await mkdtemp(join(tmpdir(), "template-contract-"));
            await mkdir(join(filesystemTempDir, "templates"), { recursive: true });
            process.env.JOURNAL_CONTENT_ROOT = filesystemTempDir;
        },
        tearDown: async () => {
            delete process.env.JOURNAL_CONTENT_ROOT;
            await rm(filesystemTempDir, { recursive: true, force: true });
        },
        writeRawFile: async (relativePath, content) => {
            const fullPath = join(filesystemTempDir, relativePath);
            await mkdir(dirname(fullPath), { recursive: true });
            await writeFile(fullPath, content, "utf-8");
        },
    },
    {
        name: "github-api",
        repository: githubTemplateRepository,
        setUp: () => {
            githubFake = createInMemoryGithubRepo();
            vi.stubGlobal("fetch", githubFake.fetchImpl);
            process.env.JOURNAL_CONTENT_GIT_REMOTE_URL = "https://github.com/someone/my-journal-content.git";
            process.env.JOURNAL_CONTENT_GIT_TOKEN = "ghp_example";
        },
        tearDown: () => {
            vi.unstubAllGlobals();
            delete process.env.JOURNAL_CONTENT_GIT_REMOTE_URL;
            delete process.env.JOURNAL_CONTENT_GIT_TOKEN;
        },
        writeRawFile: (relativePath, content) => {
            githubFake.files.set(relativePath, { content, sha: `seed-${relativePath}` });
        },
    },
];

describe.each(adapters)("TemplateRepository contract — $name", ({ repository, setUp, tearDown, writeRawFile }) => {
    beforeEach(setUp);
    afterEach(tearDown);

    it("getTemplate returns null for a nonexistent id", async () => {
        expect(await repository.getTemplate(randomUUID())).toBeNull();
    });

    it("getTemplate and listTemplates both see a template placed directly in the content repository", async () => {
        const id = randomUUID();
        await writeRawFile(`templates/${id}.md`, templateMarkdown(id, "Daily Journal"));

        expect((await repository.getTemplate(id))?.frontMatter.name).toBe("Daily Journal");
        expect((await repository.listTemplates()).map((t) => t.frontMatter.id)).toContain(id);
    });
});
