// Turns a target into concrete rating bands (5 → 1).
// Bands are half-open (e.g. rating 3 = ≥100% and <110%) so no attainment falls between bands —
// the workbook's "100–109% / 85–99%" wording leaves gaps; confirm this reading with the MBO Panel.
import { BANDS, RATING_LABELS } from "../api/mbo";

export type Band = { rating: number; label: string; range: string; reachable: boolean };

const hkd = (n: number) => `HKD ${Math.round(n).toLocaleString("en-US")}`;

export function bandsFor(kind: "revenue" | "count", target: number, unit = "", bands = BANDS[kind], labels: readonly string[] = RATING_LABELS): Band[] {
  const pct = bands; // lower bounds for ratings 5, 4, 3, 2
  if (kind === "revenue") {
    const at = (p: number) => (target * p) / 100;
    return [5, 4, 3, 2, 1].map((rating, i) => {
      const lo = i < 4 ? at(pct[i]) : null;
      const hi = i > 0 ? at(pct[i - 1]) : null;
      const range = lo === null ? `< ${hkd(hi!)}` : hi === null ? `≥ ${hkd(lo)}` : `${hkd(lo)} – < ${hkd(hi)}`;
      return { rating, label: labels[i], range, reachable: true };
    });
  }
  // Counts are whole numbers: the lowest count reaching p% of target is ceil(target × p / 100).
  // Integer arithmetic first (target * p) keeps e.g. 10 × 110 / 100 exactly 11.
  const min = pct.map((p) => Math.ceil((target * p) / 100)); // min count for ratings 5, 4, 3, 2
  const u = (n: number) => `${n} ${unit}`.trim();
  return [5, 4, 3, 2, 1].map((rating, i) => {
    const lo = i < 4 ? min[i] : 0;
    const hi = i > 0 ? min[i - 1] - 1 : Infinity; // inclusive max
    const reachable = lo <= hi;
    const range = !reachable ? "Not reachable with this target"
      : hi === Infinity ? `≥ ${u(lo)}`
      : lo === hi ? u(lo)
      : `${lo}–${u(hi)}`;
    return { rating, label: labels[i], range, reachable };
  });
}

/** Ratings that a whole-number count target cannot produce (e.g. target 2 → no rating 4). */
export const unreachableRatings = (target: number) =>
  bandsFor("count", target).filter((b) => !b.reachable).map((b) => b.rating);

/** Rating the bands indicate for an actual vs target (guidance only — the Panel sets the final rating). */
export function indicatedRating(kind: "revenue" | "count", target: number, actual: number, bands = BANDS[kind]): number {
  const pct = (actual / target) * 100;
  const i = bands.findIndex((lo) => pct >= lo);
  return i === -1 ? 1 : 5 - i;
}
