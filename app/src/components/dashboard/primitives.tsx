import { cn } from "@/lib/utils";
import { formatDelta, formatInt, formatPct } from "@/lib/format";

export function Stat({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-3xl font-semibold tabular-nums leading-none",
          accent ? "text-[var(--brand)] sixt-accent" : "text-foreground",
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

/** Signed percentage change in neutral ink (the palette has no red/green). */
export function Delta({
  label,
  value,
  size = "sm",
}: {
  label: string;
  value: number | null;
  size?: "sm" | "lg";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium tabular-nums text-foreground",
          size === "lg" ? "text-xl" : "text-sm",
        )}
      >
        {formatDelta(value)}
      </span>
    </div>
  );
}

/** A two-part black/orange bar: neutral left, focal-orange right. */
export function SplitBar({
  label,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  caption,
}: {
  label: string;
  leftLabel: string;
  leftValue: number;
  rightLabel: string;
  rightValue: number;
  caption?: string;
}) {
  const total = leftValue + rightValue || 1;
  const leftShare = leftValue / total;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex h-9 w-full overflow-hidden rounded-md">
        <div
          className="flex items-center justify-start bg-foreground px-3 text-xs font-medium text-background"
          style={{ width: `${leftShare * 100}%` }}
        >
          {leftShare > 0.14 && `${leftLabel} ${formatInt(leftValue)}`}
        </div>
        <div
          className="flex items-center justify-end bg-[var(--brand)] px-3 text-xs font-medium text-white"
          style={{ width: `${(1 - leftShare) * 100}%` }}
        >
          {1 - leftShare > 0.14 && `${rightLabel} ${formatInt(rightValue)}`}
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {leftLabel} {formatInt(leftValue)} ({formatPct(leftShare)})
        </span>
        <span>
          {rightLabel} {formatInt(rightValue)} ({formatPct(1 - leftShare)})
        </span>
      </div>
      {caption && <span className="text-xs text-muted-foreground">{caption}</span>}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {title && (
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      )}
      <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/** A labelled horizontal bar for a repeat-conversion rate (the orange metric). */
export function RateBar({
  label,
  rate,
  sub,
  max = 0.6,
  emphasis = false,
}: {
  label: string;
  rate: number;
  sub?: string;
  max?: number;
  emphasis?: boolean;
}) {
  const width = Math.max(0, Math.min(1, rate / max)) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={cn(
            "text-sm",
            emphasis ? "font-semibold text-foreground" : "text-foreground",
          )}
        >
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums text-[var(--brand)]">
          {formatPct(rate, 1)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
        <div
          className="h-full rounded-full bg-[var(--brand)]"
          style={{ width: `${width}%` }}
        />
      </div>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}
