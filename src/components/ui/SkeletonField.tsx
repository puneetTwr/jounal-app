import { Skeleton } from "./Skeleton";

interface SkeletonFieldProps {
    labelWidthClassName?: string;
}

/**
 * A skeleton standing in for a single label + input pair, matching
 * this app's form field layout (`flex flex-col gap-1` — see
 * CreateJournalForm, JournalMetadataEditor). Reach for this when an
 * entire field's final size/position is already known but its value
 * isn't ready yet (e.g. a select waiting on a Server Action); reach
 * for the bare `Skeleton` instead when only one part of a field (just
 * the input, not its label) needs to placeholder.
 */
export function SkeletonField({ labelWidthClassName = "w-24" }: SkeletonFieldProps) {
    return (
        <div className="flex flex-col gap-1">
            <Skeleton className={`h-4 ${labelWidthClassName}`} />
            <Skeleton className="h-[42px] w-full" />
        </div>
    );
}
