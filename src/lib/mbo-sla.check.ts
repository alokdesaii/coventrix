// Self-check for escalation SLA / variance rules. Run: npx tsx src/lib/mbo-sla.check.ts
import assert from "node:assert/strict";
import { addBusinessDays, isMaterialVariance, slaDueDate, variancePct } from "./mbo-sla";

// Thu 8 Oct 2026 + 3 business days → Tue 13 Oct (skips the weekend)
assert.equal(addBusinessDays("2026-10-08", 3), "2026-10-13");
// Fri → Wed
assert.equal(addBusinessDays("2026-10-09", 3), "2026-10-14");
// Discovered on a Saturday: count starts Monday → Wed
assert.equal(addBusinessDays("2026-10-10", 3), "2026-10-14");
// Bank risk is due the same day
assert.equal(slaDueDate("bank-risk", "2026-10-08"), "2026-10-08");
assert.equal(slaDueDate("capacity", "2026-10-08"), "2026-10-13");
// Variance: 12% below → material; 9.9% → not; exactly 10% → material
assert.equal(Math.round(variancePct(1_000_000, 880_000)), -12);
assert.equal(isMaterialVariance(variancePct(1_000_000, 901_000)), false);
assert.equal(isMaterialVariance(variancePct(1_000_000, 900_000)), true);
assert.equal(isMaterialVariance(variancePct(1_000_000, 1_100_000)), true); // upside variances count too
console.log("mbo-sla: all checks passed");
