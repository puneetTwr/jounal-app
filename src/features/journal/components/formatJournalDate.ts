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

function ordinalSuffix(day: number): string {
    if (day % 100 >= 11 && day % 100 <= 13) return "th";
    switch (day % 10) {
        case 1:
            return "st";
        case 2:
            return "nd";
        case 3:
            return "rd";
        default:
            return "th";
    }
}

/**
 * Formats an ISO "YYYY-MM-DD" journal date as an ordinal, e.g. "5th August 2026".
 * Used as the default title when a journal entry is created without one.
 * Parses the parts manually (rather than `new Date(isoDate)`, which is UTC)
 * so the result matches the local calendar day the input represents.
 */
export function formatOrdinalDate(isoDate: string): string {
    const [year, month, day] = isoDate.split("-").map(Number);
    const monthName = new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "long" });
    return `${day}${ordinalSuffix(day)} ${monthName} ${year}`;
}
