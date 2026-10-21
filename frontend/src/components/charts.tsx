export interface BarItem {
  label: string;
  value: number;
  /** The text shown beside the bar, for example "67%" or "8.5". */
  display: string;
}

/**
 * Horizontal bars made of plain elements, so they print, scale, and read aloud: every bar is a labelled row
 * with its value written out. `max` is the value a full bar stands for.
 */
export function BarList({ items, max, title, colorClass = 'bg-accent' }: { items: BarItem[]; max: number; title: string; colorClass?: string }) {
  return (
    <figure className="card" aria-label={title}>
      <figcaption className="mb-3 text-sm font-semibold">{title}</figcaption>
      <ul className="space-y-2">
        {items.map((item) => {
          const width = max > 0 ? Math.max(0, Math.min(100, (item.value / max) * 100)) : 0;
          return (
            <li key={item.label} className="grid grid-cols-[minmax(6rem,11rem)_1fr_3.5rem] items-center gap-2 text-sm">
              <span>{item.label}</span>
              <span className="h-3 overflow-hidden rounded bg-bg" aria-hidden="true">
                <span className={`block h-full rounded ${colorClass}`} style={{ width: `${width}%` }} data-testid="bar" />
              </span>
              <span className="text-right tabular-nums text-muted">{item.display}</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
