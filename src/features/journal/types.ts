export interface JournalFrontMatter {
    version: 1;

    id: string;

    title: string;

    journalDate: string;

    createdAt: string;

    updatedAt: string;

    tags: string[];

    favorite: boolean;

    pinned: boolean;

    archived: boolean;
}

export interface JournalEntry {
    frontMatter: JournalFrontMatter;

    content: string;
}
