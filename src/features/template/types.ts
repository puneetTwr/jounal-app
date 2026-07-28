export interface TemplateFrontMatter {
    version: 1;

    id: string;

    name: string;

    description?: string;

    createdAt: string;

    updatedAt: string;

    tags: string[];
}

export interface TemplateEntry {
    frontMatter: TemplateFrontMatter;

    content: string;
}
