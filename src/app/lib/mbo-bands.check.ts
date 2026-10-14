// Self-check for rating bands. Run: npx tsx src/lib/mbo-bands.check.ts
import assert from "node:assert/strict";
import { bandsFor, indicatedRating, unreachableRatings } from "./mbo-bands";

const ranges = (t: number) => bandsFor("count", t, "p").map((b) => b.range);

// Workbook example: target 6 → 5: ≥8, 4: 7, 3: 6, 2: 5, 1: ≤4
assert.deepEqual(ranges(6), ["≥ 8 p", "7 p", "6 p", "5 p", "0–4 p"]);
// Target 2 → ratings 4 and 2 unreachable (no whole number in 2.2–2.4 or 1.4–2); 1 partner = rating 1, as the sheet says
assert.deepEqual(unreachableRatings(2), [4, 2]);
// Target 1 → ratings 4 and 2 unreachable; 0 = rating 1 (matches the Sales Rep CBD sheet)
assert.deepEqual(unreachableRatings(1), [4, 2]);
assert.equal(bandsFor("count", 1)[4].range, "0");
// Target 10 → float trap: 10 × 110% must be exactly 11
assert.deepEqual(ranges(10), ["≥ 12 p", "11 p", "10 p", "7–9 p", "0–6 p"]);
// Revenue HKD 4m (Sales Rep example): rating 3 = 4,000,000 – < 4,400,000; rating 1 < 3,400,000
const rev = bandsFor("revenue", 4_000_000);
assert.equal(rev[2].range, "HKD 4,000,000 – < HKD 4,400,000");
assert.equal(rev[4].range, "< HKD 3,400,000");
// Indicated rating from attainment (half-open bands)
assert.equal(indicatedRating("revenue", 4_000_000, 4_400_000), 4); // exactly 110%
assert.equal(indicatedRating("revenue", 4_000_000, 4_399_999), 3);
assert.equal(indicatedRating("revenue", 4_000_000, 3_400_000), 2); // exactly 85%
assert.equal(indicatedRating("revenue", 4_000_000, 3_399_999), 1);
assert.equal(indicatedRating("count", 2, 1), 1); // 50% < 70%
assert.equal(indicatedRating("count", 15, 18), 5);
console.log("mbo-bands: all checks passed");
