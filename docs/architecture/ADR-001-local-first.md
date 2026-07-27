# ADR-001: Local-First Architecture with Markdown and Git as the Storage Foundation

## Status

Accepted

## Date

2026-07-27

## Context

This project is a personal journal, diary, and knowledge management application. It is built for a single user, running on infrastructure that user directly controls. It is not a multi-tenant product, it is not intended to be offered as a hosted service to others, and it is not designed for public deployment.

These constraints are deliberate and foundational. The application exists to help one person capture thoughts, maintain a diary, and build a personal knowledge base over the course of years, not to serve concurrent unrelated users or to generate revenue as a product. Every architectural decision documented in this and subsequent records follows from this premise.

Because the application is local-first, single-user, and privately hosted, many default assumptions common to web application architecture do not apply. There is no need to plan for horizontal scaling, multi-tenant data isolation, elastic infrastructure, or unpredictable third-party load. Instead, the priorities are:

- Long-term durability of the user's data, independent of any single vendor, service, or company remaining in business.
- Complete ownership of and access to the underlying data, in a format that does not require this specific application to remain functional.
- The ability to run entirely offline, without dependency on a remote server or third-party API for core functionality.
- Low operational burden, since there is no team responsible for maintaining uptime, and the "user" and "operator" are the same person.
- Simplicity that keeps the system maintainable by a single developer over a period of years, including through gaps where the project receives no active attention.

This ADR establishes the foundational architecture that follows from these priorities: a local-first design built on Markdown files as the canonical data format, Git as the version history mechanism, Docker as the environment reproducibility mechanism, and Next.js as a self-sufficient application framework without a separate backend service or database.

Because this is the first ADR in the repository, it also establishes the general reasoning style that later ADRs are expected to follow: state the decision, explain the reasoning, and be explicit about trade-offs rather than presenting the choice as beyond question.

## Decision

The application will be architected as a local-first system in which:

1. The local filesystem is the single source of truth for all user data.
2. Markdown files are the canonical storage format for journal entries and knowledge base content.
3. Git is used as the version history and backup mechanism for that content, with GitHub as an optional remote for redundancy and synchronization.
4. Docker and Docker Compose are used to define and reproduce the runtime environment.
5. No relational or document database is introduced for primary content storage.
6. No separate backend framework or service is introduced; Next.js's built-in Route Handlers, Server Components, and Server Actions serve as the entire application layer.

Synchronization with any remote system, including GitHub, is treated as a secondary concern that layers on top of a functioning local system. It is never a prerequisite for the application to work.

## Rationale

### Purpose of the application and how it shapes the architecture

The application is a personal tool, not a product. It has exactly one user, that user is also the operator, and the two roles will never diverge. This eliminates entire categories of concern that dominate typical web application architecture: authentication against untrusted parties, tenant isolation, rate limiting against abuse, horizontal scaling under unpredictable load, and the operational overhead of running a service other people depend on.

Because the application will never be deployed as SaaS or offered publicly, decisions can be made in favor of simplicity, transparency, and longevity rather than in favor of scalability or multi-tenancy. A architecture that would be considered under-engineered for a commercial product is, in this context, correctly scoped. Over-engineering for hypothetical future users would add real, ongoing cost while serving a scenario that is explicitly out of scope.

This framing is the lens through which every other decision in this document should be read. The choices below are not presented as universally correct patterns. They are the correct choices for a single-user, local-first, privately hosted personal tool.

### Local-first philosophy

The application treats the local filesystem as authoritative. Every journal entry and note is a real file, sitting in a real directory, on disk, at all times. The application reads from and writes to this filesystem directly. There is no intermediate remote system that must be reachable for the application to function.

This has a direct, practical consequence: the application must continue to work with no internet connection at all. Writing a journal entry, editing a note, and searching existing content must all work identically whether the machine is online or offline. Synchronization with GitHub, when it happens, is something that occurs in addition to normal operation, not something normal operation depends on. If GitHub is unreachable, slow, or discontinued entirely, the application continues to function exactly as before, because the local files were never contingent on that remote system existing.

This ordering, local data as authoritative and remote synchronization as secondary, is the definition of local-first software as understood in this project. It stands in contrast to cloud-first or server-authoritative designs, where the canonical copy of the data lives on a server the user does not control, and local access is merely a cached view that can be revoked, rate-limited, or lost if the service shuts down.

The advantages of this approach for a personal tool are substantial:

- **Ownership.** The data belongs to the user in the most literal sense possible: it exists as files, in a directory the user controls, in a format the user can open without this application.
- **Resilience.** There is no single remote dependency whose outage, policy change, or shutdown can take the user's data away. A journal kept this way cannot be lost because a company pivoted, was acquired, or discontinued a product.
- **Portability.** The data can be copied, backed up, moved to a new machine, or opened by a completely different tool without any export process, because it was never locked into a proprietary format in the first place.
- **Longevity.** Plain files on a filesystem, backed by an open, human-readable format, remain readable for as long as computers exist. This is a meaningfully longer time horizon than any specific application, company, or file format tied to a vendor's continued operation.

### Why Markdown

Markdown was chosen as the canonical storage format for journal entries and notes, rather than storing content inside a database as structured records.

The reasoning centers on a small set of properties that matter enormously for a personal archive intended to last decades:

- **Human readability.** A Markdown file can be opened and understood by a person, not just by the application that wrote it. There is no need to run a query, start a server, or use this specific piece of software to read a single entry. A plain text editor is sufficient.
- **Long-term portability.** Markdown is plain text with a lightweight, well-documented syntax. It does not depend on a specific database engine, schema version, or proprietary binary format remaining supported. A file written today will open exactly the same way in ten or twenty years, on essentially any computer that exists.
- **Vendor independence.** Markdown is not owned by any single company. No licensing terms, product shutdown, or pricing change can affect the ability to read or write it. This directly reinforces the ownership and resilience goals described above.
- **Git-friendly diffs.** Because Markdown files are plain text organized as lines, Git can produce clean, human-readable diffs when content changes. This makes the version history (see the next section) genuinely useful rather than an opaque binary blob comparison.
- **Compatibility with many editors and tools.** A very large ecosystem of editors, static site generators, note-taking tools, and command-line utilities already understand Markdown. The user's content is never trapped behind a single application's import/export capability.
- **Simple backup and migration.** Backing up the entire journal is copying a directory. Migrating to a new machine, a new tool, or a new workflow is, at most, a matter of moving files, with no export step, no proprietary conversion, and no risk of partial or lossy migration.
- **Rich formatting capabilities.** Despite its simplicity, Markdown supports headings, lists, links, code blocks, images, and tables, which is sufficient formatting expressiveness for journaling and note-taking without requiring a complex rich-text or binary document format.

Storing this same content inside a database would work, in the narrow sense that the application could still read and write it. But it would immediately reintroduce the problems Markdown avoids: the true content becomes dependent on a database engine and its file format, the content is no longer directly human-readable outside the application, backups require a database-aware export process rather than a file copy, and diffing changes over time becomes far less meaningful. None of these costs buy anything the application actually needs at its current scale. Markdown files on disk already fully satisfy the storage requirements of a single-user journal and knowledge base.

### Why Git

Git is used as the application's version history mechanism, rather than building a custom history or revision system inside the application itself.

Every journal entry and note change can be committed, giving the project:

- **Complete history.** Every change to every file is recorded, with a timestamp and, when useful, a message describing the change.
- **Rollback capability.** Any previous version of any file can be recovered exactly, without a bespoke undo system inside the application.
- **Branching if desired.** Should the user ever want to draft, experiment with, or reorganize content in isolation before merging it back into the main history, Git already supports this natively.
- **Transparent backups through GitHub.** Pushing the repository to GitHub (or any other Git remote) provides an off-machine backup with a complete history attached, using infrastructure that already exists and is well understood, rather than a custom sync mechanism built specifically for this application.
- **Minimal implementation complexity.** None of the above required writing a single line of application code. Git already solves version history, diffing, and distributed backup extremely well. Reimplementing any meaningful subset of this functionality inside the application would be a significant, ongoing engineering investment to arrive at a strictly worse result.

The intent is for Git to become part of the application's normal "Save" workflow, not a separate, manually invoked administrative task. Saving a journal entry should, in the common case, also mean committing that change, so that version history accumulates naturally as a side effect of ordinary use rather than requiring the user to remember to invoke it separately.

Using an industry-standard tool that already has decades of engineering behind it, rather than reinventing a private history mechanism, is consistent with the project's broader preference for leverage over custom implementation wherever the standard tool already does the job well.

### Why Docker

Docker and Docker Compose are used to define the application's runtime environment, even though the application runs entirely on infrastructure the user personally controls and is never deployed to a shared or public host.

The justification is not scalability or isolation from other tenants, since there are none. It is environment reproducibility:

- **Reproducible environments.** The exact runtime, Node.js version, and system dependencies the application needs are captured in configuration rather than assumed to already exist correctly on whatever machine is being used.
- **Simplified onboarding.** Setting up the project on a new machine should not require manually installing and version-matching a list of system dependencies.
- **Consistent development.** The application behaves the same way regardless of what else is installed on the host machine, avoiding subtle bugs caused by differing local tool versions.
- **Reduced setup effort.** A working environment can be brought up with a single command rather than a manual checklist.
- **Portability across machines.** The user may reasonably run this application from more than one computer over its lifetime. Docker ensures the environment travels with the project rather than being reconstructed by hand each time.
- **Avoiding dependency drift.** Without containerization, the exact versions of Node.js, system libraries, and tooling on the host machine tend to drift over time and across machines, eventually causing the project to behave differently or fail to run at all. Docker pins these dependencies explicitly.

The target experience for setting up this project on a fresh machine is that cloning the repository and running Docker Compose is sufficient to get a working environment, with no separate manual installation of language runtimes or system packages required beforehand.

### Why no database

A relational or document database is intentionally not part of this architecture.

For a single user with a personal collection of journal entries and notes, a database introduces cost without introducing proportional benefit:

- **Unnecessary complexity.** A database adds a whole additional system with its own configuration, connection handling, and failure modes, for a workload that is, in practice, a modest number of small text files.
- **Backup overhead.** Backing up a database correctly requires database-aware tooling and produces a backup format that is only useful with that same database engine. A directory of Markdown files can be backed up by copying it.
- **Migration requirements.** Databases have schemas, and schemas evolve. Every schema change becomes a migration that has to be written, tested, and safely applied. A collection of Markdown files does not require schema migrations to gain a new field or structure.
- **Operational maintenance.** A database is a service that needs to be running, updated, and occasionally recovered from a corrupted state. This is meaningful ongoing responsibility for infrastructure that exists to serve exactly one person.
- **Reduced portability.** Content inside a database is not directly readable without that database engine or a tool built to query it. This directly conflicts with the ownership and longevity goals described earlier.
- **The project's relatively small scale.** Even a very prolific journal, written daily for decades, remains a small dataset by the standards a database is designed to handle efficiently. The scale of the problem does not require the machinery a database provides.

Markdown files on a filesystem already satisfy the actual storage requirements of this application: durable, structured-enough, versionable, and directly readable content. Introducing a database here would be solving a problem the project does not have.

This is not a permanent prohibition. If a future requirement genuinely cannot be reasonably satisfied by files on disk, for example a workload that requires complex relational querying at a scale files cannot support, a database remains available as an option. That decision should be made when such a requirement is concrete, not preemptively.

### Why no separate backend framework

A dedicated backend framework, such as NestJS, Express, Fastify, Spring Boot, or ASP.NET, is intentionally not part of this architecture.

Next.js already provides the application-layer capabilities this project needs:

- **Route Handlers**, for any endpoint-style request handling the application requires.
- **Server Components**, for rendering that needs direct, server-side access to the filesystem without exposing that access to the client.
- **Server Actions**, for mutations, such as saving or updating a journal entry, without hand-building a separate API layer to front them.
- **Node.js runtime capabilities**, giving direct access to the filesystem and to Git operations from within the same application process that serves the user interface.

Introducing a second, separate backend service alongside Next.js would mean maintaining two runtimes, two deployment concerns, and an API contract between them, for an application with a single user and a workload that Next.js's own server-side capabilities already cover completely. The additional structure a dedicated backend framework provides, most of which exists to organize large teams working across a large, evolving API surface, has no proportional value at this project's scope. It would be added maintenance burden with no corresponding benefit.

Should the application's needs genuinely outgrow what Next.js's server-side capabilities can reasonably provide, introducing a separate backend at that point remains possible. It is simply not justified today.

## Benefits

- Complete data ownership, in a format that remains readable independent of this application's continued existence.
- Full offline functionality, with no dependency on a remote server or third-party service for core operation.
- A complete, inspectable version history of every change, obtained from a tool that already exists and is well understood.
- Straightforward backup and migration, equivalent to copying a directory and, optionally, pushing to a Git remote.
- A reproducible development and runtime environment that can be recreated on a new machine with minimal manual effort.
- A single, comparatively simple application layer, with no separate backend service, database, or additional API contract to maintain.
- An architecture whose complexity is proportional to its actual requirements, rather than pre-built for scale or multi-tenancy this project will never need.

## Trade-offs

This architecture is not free of limitations, and it is worth stating them plainly rather than presenting the chosen design as universally superior. It is optimized specifically for this project's constraints: a single user, local-first operation, and long-term personal ownership of data. Under different constraints, several of these trade-offs would weigh differently.

- **Limited multi-user support.** The architecture assumes one user and one filesystem as the source of truth. Supporting multiple simultaneous users with independent access, permissions, or concurrent editing is not a design goal, and would require substantial rework if it ever became one.
- **Filesystem constraints.** Reads and writes are bound by whatever the local filesystem allows, including behavioral differences across operating systems, and the practical limits of how many files a single directory or filesystem handles gracefully as content grows.
- **Git merge conflicts.** For a single user working from one machine at a time, this is unlikely in practice. It becomes more plausible if the user edits from multiple machines without a disciplined sync process, or if the workflow ever expands to include more than one contributor. Git can resolve most conflicts, but Markdown files with overlapping edits can still require manual resolution.
- **Lack of database querying capabilities.** There is no query language, no indexing engine, and no way to ask arbitrary structured questions of the content beyond what file-based search and, eventually, purpose-built tooling can provide. Complex queries across the dataset are meaningfully harder than they would be against a database.
- **Scaling limitations.** This architecture is not designed to scale to many concurrent users, high write throughput, or datasets of a size that would challenge a filesystem. It is scoped to one person's personal writing over time, not a shared or high-volume system.
- **Eventual performance considerations at very large scale.** A journal kept for many years could eventually accumulate a large number of files. Operations such as full-text search across the entire archive, or listing very large directories, may need dedicated indexing or caching strategies at that point rather than relying solely on direct filesystem access, as they do today.

None of these limitations are considered disqualifying for this project's actual purpose. They are the natural consequences of optimizing for single-user ownership, offline operation, and long-term simplicity rather than for multi-user scale, and that trade is made deliberately.

## Alternatives Considered

### PostgreSQL

PostgreSQL is a mature, capable relational database with strong support for structured querying, transactions, and full-text search. For an application with many concurrent users or a genuine need for complex relational queries, it would be a reasonable choice. For this project, it introduces a database server to install, configure, back up, and maintain, in exchange for query capabilities a single-user journal does not currently need. The operational overhead is disproportionate to the workload.

### SQLite

SQLite is a strong candidate in general, since it is embedded, file-based, and requires no separate server process, which aligns reasonably well with a local-first design. It was still set aside for primary content storage because it stores entries inside a single binary-format file rather than as directly human-readable, individually diffable text. This weakens exactly the properties, direct readability without the application, clean Git diffs, and trivial per-entry portability, that motivated choosing Markdown. SQLite remains a reasonable option for future secondary concerns, such as a search index built on top of the Markdown files, where its query capabilities would be genuinely useful without displacing Markdown as the canonical store.

### MongoDB

MongoDB offers a flexible, schema-less document model that can accommodate loosely structured journal entries reasonably well. It was not selected because it still requires running and maintaining a database service, still stores content in a format that is not directly human-readable outside the database, and still adds an operational dependency this single-user application does not need. Its flexibility does not offset the added complexity for this project's scale.

### A dedicated CMS

A dedicated content management system would provide a ready-made editing interface and content model. It was not selected because most CMS platforms are built around a database-backed content store, multi-user editorial workflows, and a plugin or hosting ecosystem oriented toward websites and shared publishing, none of which matches a private, single-user journal. Adopting one would mean adapting the project to the CMS's assumptions rather than the reverse.

### Notion

Notion offers a polished user experience and convenient structured note-taking. It was not selected because the canonical copy of the user's data lives on Notion's servers, in Notion's proprietary format, accessible only through Notion's application and export tooling. This directly conflicts with the project's ownership, longevity, and offline-first goals. Data held this way is only as durable as the company providing the service.

### Obsidian

Obsidian is, notably, already a local-first, Markdown-based note-taking application, and its overall philosophy is closely aligned with this project's own. It was not adopted directly, rather than merely referenced as inspiration, because this project is intended as a purpose-built personal application with its own workflow, integrated Git-based saving, and future features tailored specifically to journaling rather than general note-taking. Obsidian's plugin ecosystem is a reasonable alternative for a user who wants similar guarantees without building custom software, but it is a different project with different goals than building one's own tool.

### A traditional backend with a database

A conventional architecture, a dedicated backend service such as NestJS or Express paired with a database such as PostgreSQL, is the default choice for many web applications and was seriously considered. It was not selected for this project because it introduces two additional systems, a backend service and a database, to maintain, back up, and keep running, for an application that has exactly one user and does not need to scale beyond that. Next.js's own server-side capabilities, combined with Markdown files on disk, already cover this project's actual requirements without that additional operational surface.

## Consequences

Adopting this architecture means that all future feature work is expected to build on top of Markdown files, Git history, and Next.js's built-in server-side capabilities, rather than introducing a database or a separate backend service as a default first step. Any future proposal to add either should be treated as a deliberate architectural change requiring its own justification and its own ADR, not a routine implementation detail.

It also means the development environment is expected to remain reproducible through Docker, and that onboarding a fresh machine should continue to require, at most, cloning the repository and running Docker Compose. Any change that makes setup meaningfully more complex than that should be considered a regression against this decision.

Finally, it means the "Save" workflow within the application is expected to remain tightly coupled to Git commits over time, so that version history continues to accumulate as a natural side effect of normal use, rather than becoming a separate, optional step that is easy to neglect.

## Future Extensibility

This architecture is intended to accommodate substantial future growth without abandoning its core philosophy: Markdown files on disk, versioned with Git, remain the canonical source of truth, and new capabilities are built as layers on top of that foundation rather than replacements for it.

Plausible future additions, and how they relate to this foundation, include:

- **Full-text search**, built as an index derived from the existing Markdown files, rebuilt as needed, rather than as a reason to move content into a database.
- **Backlinks**, computed by parsing links between Markdown files, similar to how existing local-first note-taking tools derive backlinks from plain-text content.
- **Tags**, represented as plain-text conventions within the Markdown itself, such as front matter or inline hashtags, rather than as rows in a separate tagging table.
- **Calendar views**, generated from the dates already implicit in journal entries and their filenames or front matter.
- **Semantic search and local embeddings**, computed from the Markdown content and stored as a derived index alongside it, regenerable at any time from the source files.
- **AI-assisted writing**, layered as an editing aid on top of Markdown content the user already owns, without changing where or how that content is stored.
- **Encryption**, applied to the Markdown files or their storage location, for a user who wants confidentiality at rest without changing the underlying format.
- **A plugin system**, allowing new capabilities to be added over time without modifying the core storage model.
- **Attachments**, stored alongside Markdown files on the filesystem and referenced from within entries, consistent with treating the filesystem as the source of truth.
- **Themes**, as a presentation-layer concern entirely decoupled from how content is stored.
- **Import and export tooling**, made straightforward by the fact that the canonical data is already plain files rather than a proprietary format.
- **PDF generation**, produced by rendering existing Markdown content into a document, rather than requiring a separate authoring format.

The common thread across all of these is that each treats the Markdown files as the durable foundation and adds a capability on top, rather than requiring that foundation to be replaced. Where a future requirement can be reasonably satisfied by extending this model, it should be. Departing from it, for example by introducing a database, should remain a deliberate, justified, and separately documented decision, not a default reached for out of convenience.

## Conclusion

This architecture is intentionally scoped to what this project actually is: a personal, single-user journal and knowledge management tool, meant to last for years and to remain entirely under its owner's control. Local-first operation, Markdown as the canonical format, Git as the history mechanism, Docker for environment reproducibility, and a single Next.js application without a separate backend or database, are not chosen because they are the most powerful tools available in the abstract. They are chosen because they are proportionate to this project's actual requirements, and because they directly serve the goals that matter most here: ownership, resilience, portability, and long-term simplicity.

Future contributors, including the project's original author returning after time away, should read this document as the reasoning behind that proportionality. Departures from it are not forbidden, but they should be made deliberately, with the trade-offs understood, and documented with the same honesty this record has attempted to apply to the decision it describes.
