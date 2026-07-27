const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
};

const DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    ...DATE_FORMAT_OPTIONS,
    hour: "numeric",
    minute: "2-digit",
};

/** Formats an ISO "YYYY-MM-DD" journal date for display, e.g. "Jul 27, 2026". */
export function formatJournalDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString("en-US", DATE_FORMAT_OPTIONS);
}

/** Formats an ISO date-time (createdAt/updatedAt) for display, e.g. "Jul 27, 2026, 2:30 PM". */
export function formatJournalDateTime(isoDateTime: string): string {
    return new Date(isoDateTime).toLocaleString("en-US", DATE_TIME_FORMAT_OPTIONS);
}
