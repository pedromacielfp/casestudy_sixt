"use client";

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatValue = (v) => String(v),
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  formatValue?: (value: number | string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      {label !== undefined && (
        <div className="mb-1 font-medium text-foreground">{label}</div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-[2px]"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">
              {entry.value === undefined ? "" : formatValue(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
