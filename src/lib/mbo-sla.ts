// Escalation SLA and variance rules (SOP-HHHK-BD-001 §4, as summarised in the MBO workbook).
// ponytail: business days skip weekends only; add the HK public-holiday calendar when the backend provides it.

export type EscalationCategory = "variance" | "capacity" | "bank-risk";

export const CATEGORY_LABEL: Record<EscalationCategory, string> = {
  variance: "Material variance (≥10%)",
  capacity: "Capacity issue",
  "bank-risk": "Bank-relationship / query risk",
};

export const VARIANCE_THRESHOLD = 10; // %

/** ISO date (yyyy-mm-dd) plus n business days, skipping Saturday and Sunday. */
export function addBusinessDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}

/** Written-escalation deadline: bank risk the same day; variance / capacity within 3 business days. */
export function slaDueDate(category: EscalationCategory, discovered: string): string {
  return category === "bank-risk" ? discovered : addBusinessDays(discovered, 3);
}

/** Signed variance of actual against expected, in % (negative = shortfall). */
export function variancePct(expected: number, actual: number): number {
  return expected === 0 ? 0 : ((actual - expected) / expected) * 100;
}

export const isMaterialVariance = (pct: number) => Math.abs(pct) >= VARIANCE_THRESHOLD;
