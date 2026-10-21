import { formatMargin, formatPoints, slotText, trendOf, warningText } from '../lib/format';
import type { Evaluation } from '../lib/types';
import { MAX_CHOICES, useApp } from '../state/app-context';
import { BandBadge } from './ui';

export function ProgrammeCard({ result, compact = false }: { result: Evaluation; compact?: boolean }) {
  const { subjectNames, meta, choices, addChoice, removeChoice } = useApp();
  const pathway = meta.pathways.find((p) => p.key === result.pathway)?.label;
  const onList = choices.some((c) => c.code === result.code);
  const full = choices.length >= MAX_CHOICES;
  const trend = trendOf(result.cutoffs);

  return (
    <article className="card space-y-2" aria-label={`${result.name}, ${result.institution}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold leading-snug">{result.name}</h3>
          <p className="text-sm text-muted">
            {result.institution} &middot; code {result.code}
            {pathway ? ` · ${pathway}` : ''}
          </p>
        </div>
        {result.band ? <BandBadge band={result.band} /> : <BandBadge band="no_data" />}
      </div>

      {result.state === 'no_cutoff' ? (
        <p className="text-sm text-muted">No cut-off has been published for this programme, so it cannot be placed in a band.</p>
      ) : result.state === 'subjects_not_met' ? (
        <div className="text-sm">
          <p className="font-semibold text-danger">A required subject grade is not met.</p>
          <ul className="list-disc pl-5 text-muted">
            {result.failed_slots.map((s, i) => (
              <li key={i}>{slotText(s, subjectNames)}</li>
            ))}
          </ul>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <div><dt className="text-muted">Your cluster points</dt><dd className="font-semibold tabular-nums">{formatPoints(result.cluster)}</dd></div>
          <div><dt className="text-muted">Cut-off {result.cutoff_year}</dt><dd className="font-semibold tabular-nums">{formatPoints(result.cutoff)}</dd></div>
          <div><dt className="text-muted">Margin</dt><dd className="font-semibold tabular-nums">{formatMargin(result.margin)}</dd></div>
          <div><dt className="text-muted">Band width</dt><dd className="font-semibold tabular-nums">&plusmn;{result.width}</dd></div>
        </dl>
      )}

      {!compact && result.picks.length > 0 ? (
        <p className="text-sm text-muted">
          Cluster subjects used: {result.picks.map(([key, points]) => `${subjectNames[key] ?? key} (${points})`).join(', ')}.
        </p>
      ) : null}

      {trend && !compact ? (
        <p className="text-sm text-muted">
          Cut-off {trend.direction === 'flat' ? 'unchanged' : trend.direction === 'up' ? `rose by ${trend.change.toFixed(2)}` : `fell by ${Math.abs(trend.change).toFixed(2)}`} on the year before.
        </p>
      ) : null}

      {result.warnings.map((w) => (
        <p key={w} className="rounded border border-stretch px-2 py-1 text-xs">{warningText(w)}</p>
      ))}

      {!compact && result.slots.length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Subject requirements</summary>
          <ul className="mt-1 list-disc pl-5">
            {result.slots.map((s, i) => (
              <li key={i}>{slotText(s, subjectNames)}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="no-print">
        {onList ? (
          <button type="button" className="btn" onClick={() => removeChoice(result.code)}>Remove from my choices</button>
        ) : (
          <button type="button" className="btn" disabled={full}
            title={full ? `You already have ${MAX_CHOICES} choices` : undefined}
            onClick={() => addChoice({ code: result.code, name: result.name, institution: result.institution })}>
            Add to my choices
          </button>
        )}
      </div>
    </article>
  );
}
