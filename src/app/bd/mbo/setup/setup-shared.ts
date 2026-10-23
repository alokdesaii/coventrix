// Helpers shared by the MBO Setup pages (kept here so the pages and the View popup don't import each other).
import { BANDS, RATING_LABELS, type TaskRow } from '../../../api/mbo';

export const TYPE_LABEL = { revenue: 'Amount', count: 'Count', criteria: 'Commitment', leadership: 'Commitment' } as const;

/** One-line view of a task's rating guide: "120 / 110 / 100 / 85% of target", or the rating 3 criteria for Commitment tasks. */
export function guideSummary(r: TaskRow): string {
  const o = r.objective;
  if (o.kind === 'revenue' || o.kind === 'count') {
    const b = o.bands ?? BANDS[o.kind];
    const labels = (o.ratingLabels ?? RATING_LABELS).some((l, i) => l !== RATING_LABELS[i]) ? ' · custom labels' : '';
    return `${b.join(' / ')}% of target${labels}`;
  }
  return o.criteria ? `Criteria: "${o.criteria[2]}" for rating 3` : 'Rating guide not set up';
}
