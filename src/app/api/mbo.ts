// MBO framework + target assignment. Source: H&H_HK_MBO_Framework_BD_CBD_v1.0.xlsx (SOP-HHHK-BD-001).
// Role templates are framework-controlled (weights fixed); only targets / commitments are entered per employee.
// Mocked — backend team: serve ROLE_TEMPLATES from config and replace the async functions with API calls.

import { FRAMEWORK_EXAMPLES, type FrameworkExample } from "../lib/mbo-examples";
import type { EscalationCategory } from "../lib/mbo-sla";

export type RoleId = "group-cbo" | "head-of-sales" | "manager" | "sales-rep";

/** How an objective's target is entered and rated. */
export type ObjectiveKind =
  | "revenue"     // HKD amount; bands = % of target (≥120 / 110 / 100 / 85)
  | "count"       // whole number; bands = % of target (≥120 / 110 / 100 / 70)
  | "criteria"    // qualitative escalation / reporting criteria; fixed text + agreed commitments
  | "leadership"; // list of agreed leadership commitments

export type Objective = {
  id: string;
  kind: ObjectiveKind;
  title: string;
  definition: string;
  weight: number; // %
  unit?: string;  // for count: "partners", "relationships", "opportunities"
  /** Rating criteria text for criteria / leadership objectives, 5 → 1. */
  criteria?: [string, string, string, string, string];
  evidence: string;
  /** Set on the MBO Setup pages; when absent the defaults below apply. */
  code?: string;                                           // e.g. PERSONAL_REVENUE
  bands?: [number, number, number, number];                // lower bounds (% of target) for ratings 5, 4, 3, 2
  ratingLabels?: [string, string, string, string, string]; // 5 → 1
  currency?: string;                                       // revenue objectives, e.g. HKD
  example?: FrameworkExample | null;                       // set by an employee mapping (null = none)
};

export type RoleTemplate = { id: RoleId; label: string; scope: string; objectives: Objective[] };

const ESCALATION_CRITERIA: Objective["criteria"] = [
  "100% timely written escalations + root-cause packs",
  "≥95% timely",
  "100% of ≥10% variances flagged within SLA",
  "1–2 late / incomplete escalations",
  "≥3 late or any unflagged material variance",
];

const LEADERSHIP_CRITERIA: Objective["criteria"] = [
  "Strong succession bench, proactive coaching, culture impact beyond own role",
  "Solid team development and effective identity-safe coordination",
  "Meets agreed leadership commitments (coaching cadence, succession plan, identity-safe coordination)",
  "Partial delivery of leadership commitments",
  "Material gaps in people leadership or identity / DoA boundary issues",
];

const partnerDev = (weight: number, scope: string): Objective => ({
  id: "partner-dev", kind: "count", unit: "partners", weight,
  title: "Partner Development",
  definition: `Number of net new + materially deepened partners ${scope}. Counted by number of partners, not volume.`,
  evidence: "Partner register with dated onboarding / progression records.",
});

const cbdDev = (weight: number, scope: string): Objective => ({
  id: "cbd-dev", kind: "count", unit: "relationships", weight,
  title: "Correspondent Banking Partner Development",
  definition: `Number of net new + materially deepened correspondent-banking relationships ${scope}. Counted by number, not volume.`,
  evidence: "Correspondent relationship register with dated onboarding / live-relationship records.",
});

export const ROLE_TEMPLATES: Record<RoleId, RoleTemplate> = {
  "group-cbo": {
    id: "group-cbo", label: "Group CBO", scope: "Group commercial oversight + Secondment CBO for H&H HK",
    objectives: [
      { id: "revenue", kind: "revenue", weight: 40, title: "H&H HK gross revenue",
        definition: "Achieve / exceed H&H HK gross revenue (or BD / CBD / Partner Development attributable fee income) target for the year.",
        evidence: "Entity revenue / fee-income reports for the review period." },
      { id: "escalation", kind: "criteria", weight: 10, criteria: ESCALATION_CRITERIA,
        title: "Zero unflagged material variances",
        definition: "Zero material (≥10%) unflagged revenue / pipeline variances; all variances escalated in writing within 2–3 business days.",
        evidence: "Dated written escalations with root cause, impact and recovery plan." },
      partnerDev(12.5, "onboarded / activated under H&H HK identity and compliance"),
      cbdDev(12.5, "onboarded / activated under H&H HK identity and compliance"),
      { id: "leadership", kind: "leadership", weight: 25, criteria: LEADERSHIP_CRITERIA,
        title: "Leadership — H&H HK commercial capability & culture",
        definition: "Team capability, succession, coaching, cross-entity coordination within identity rules, and healthy commercial culture.",
        evidence: "Dated coaching notes, succession plans, culture initiatives and Group CBO routing records." },
    ],
  },
  "head-of-sales": {
    id: "head-of-sales", label: "Subsidiary Head of Sales / Local CBO", scope: "Day-to-day BD, CBD, Partner Development & commercial performance under H&H HK DoA",
    objectives: [
      { id: "revenue", kind: "revenue", weight: 45, title: "H&H HK gross revenue",
        definition: "Achieve / exceed H&H HK gross revenue (BD / CBD / Partner Development attributable) target.",
        evidence: "Entity revenue / fee-income reports for the review period." },
      { id: "escalation", kind: "criteria", weight: 10, criteria: ESCALATION_CRITERIA,
        title: "Escalation of variances, capacity & bank risk",
        definition: "Material variances (≥10%) and capacity shortfalls escalated in writing within 2–3 business days; L4 bank-relationship issues escalated immediately.",
        evidence: "Dated written escalations with root cause, impact and recovery plan." },
      partnerDev(10, "onboarded / activated under H&H HK identity and compliance"),
      cbdDev(10, "onboarded / activated under H&H HK identity and compliance"),
      { id: "leadership", kind: "leadership", weight: 25, criteria: LEADERSHIP_CRITERIA,
        title: "Leadership — local commercial capability & culture",
        definition: "Team capability, coaching cadence, succession for key commercial roles and healthy local culture, preserving identity and DoA boundaries.",
        evidence: "Dated coaching notes, succession plans, culture records and routing records." },
    ],
  },
  manager: {
    id: "manager", label: "BD / CBD / Partner Development Manager", scope: "Portfolio ownership of revenue, partner counts and escalation",
    objectives: [
      { id: "revenue", kind: "revenue", weight: 50, title: "Portfolio gross revenue / fee income",
        definition: "Deliver the assigned gross-revenue / fee-income target for the manager's portfolio (team + own deals).",
        evidence: "Portfolio revenue register and closure records." },
      { id: "escalation", kind: "criteria", weight: 10, criteria: ESCALATION_CRITERIA,
        title: "Escalation of variances, capacity & bank risk",
        definition: "All ≥10% variances and capacity issues escalated in writing within 2–3 business days; bank-relationship risks same day.",
        evidence: "Dated written escalations with root cause and recovery actions." },
      partnerDev(12.5, "originated / advanced / onboarded within the portfolio"),
      cbdDev(12.5, "originated / advanced / onboarded within the portfolio"),
      { id: "reporting", kind: "criteria", weight: 15,
        criteria: [
          "100% on-time + zero errors + insights + consistent coaching",
          "100% on-time, ≤1 minor error + coaching held",
          "100% on-time & complete + agreed coaching cadence met",
          "1–2 late / incomplete or missed coaching",
          "≥3 late or any material error or systematic coaching gaps",
        ],
        title: "Reporting hygiene & team coaching cadence",
        definition: "Accurate weekly / monthly pipeline, capacity and variance reports on time with zero material errors; team coaching cadence maintained.",
        evidence: "Dated report submissions, data checks and coaching records." },
    ],
  },
  "sales-rep": {
    id: "sales-rep", label: "Sales Representative / BD Officer", scope: "Individual contributor",
    objectives: [
      { id: "revenue", kind: "revenue", weight: 45, title: "Personal gross revenue / fee income",
        definition: "Achieve the assigned personal gross-revenue / fee-income target.",
        evidence: "Closed revenue register, origination / closure log and fee-income reconciliation." },
      { id: "opportunities", kind: "count", unit: "opportunities", weight: 15,
        title: "Qualified new opportunities",
        definition: "Qualified new opportunities originated and progressed at least one stage (meeting → proposal → close).",
        evidence: "CRM opportunity records with dated stage changes." },
      partnerDev(12.5, "originated / advanced by the individual"),
      cbdDev(12.5, "originated / advanced by the individual"),
      { id: "escalation", kind: "criteria", weight: 15,
        criteria: [
          "100% timely + proactive + clean reporting",
          "100% timely + clean reporting",
          "All required escalations within SLA + reporting complete on time",
          "1 late escalation or incomplete reporting",
          "≥2 late or any unflagged material issue",
        ],
        title: "Escalation discipline & CRM / activity reporting",
        definition: "Timely written escalation of any ≥10% personal variance, bank query risk or capacity issue within SLA; CRM and activity reporting complete and on time.",
        evidence: "Dated escalation records and CRM / activity reports." },
    ],
  },
};

export const RATING_LABELS = ["Significantly Exceeds", "Exceeds", "Achieves Objective", "Partially Meets", "Fails to Meet"] as const; // 5 → 1

/** Lower bounds (% of target) for ratings 5, 4, 3, 2; below the last = rating 1. */
export const BANDS: Record<"revenue" | "count", [number, number, number, number]> = {
  revenue: [120, 110, 100, 85],
  count: [120, 110, 100, 70],
};

// ---------- team + targets ----------

export type TeamMember = { id: string; name: string; role: RoleId; unit: string };

export type ObjectiveTarget = {
  objectiveId: string;
  target?: number;          // revenue (HKD) / count
  commitments: string[];    // criteria / leadership commitments (and optional notes for numeric)
};

export type TargetStatus = "not-set" | "draft" | "awaiting-acceptance" | "changes-requested" | "accepted";

export type TargetAssignment = {
  memberId: string;
  period: string; // e.g. "2026"
  status: TargetStatus;
  targets: ObjectiveTarget[];
  notes: string;
  updatedAt?: string;
  /** Employee comment when they ask for changes instead of accepting. */
  changeRequest?: string;
  acceptedAt?: string;
};

export const PERIODS = [
  { value: "2025", label: "2025 · Annual (1 Jan–31 Dec)" },
  { value: "2026", label: "2026 · Annual (1 Jan–31 Dec)" },
  { value: "2027", label: "2027 · Annual (1 Jan–31 Dec)" },
];

/** True once the annual review period is over (final assessment needs full-year evidence). */
export const periodEnded = (period: string) => new Date().toISOString().slice(0, 10) > `${period}-12-31`;

const TEAM: TeamMember[] = [
  { id: "u1", name: "Alok Desai", role: "sales-rep", unit: "BD / CBD / Partner Development" },
  { id: "u2", name: "Maya Chen", role: "sales-rep", unit: "BD" },
  { id: "u3", name: "Daniel Wong", role: "sales-rep", unit: "CBD" },
  { id: "u4", name: "Priya Shah", role: "manager", unit: "BD / CBD / Partner Development" },
  { id: "u5", name: "Ethan Lau", role: "head-of-sales", unit: "H&H HK" },
  { id: "u6", name: "Sophie Tam", role: "group-cbo", unit: "Group · Secondment CBO for H&H HK" },
];

const DEFAULT_COMMITMENTS: Partial<Record<string, string[]>> = {
  leadership: [
    "Coaching cadence with direct reports (agree frequency)",
    "Documented succession for key commercial roles",
    "Healthy commercial culture initiative",
    "All cross-entity opportunities routed via the Group CBO path, preserving H&H HK identity",
  ],
  escalation: ["All required written escalations within SLA"],
  reporting: ["Weekly pipeline report every Monday 09:00", "Monthly reports on the agreed calendar", "Coaching with each direct report every 2 weeks"],
};

const store = new Map<string, TargetAssignment>([
  ...(["u1", "u2", "u3"] as const).map((id, i): [string, TargetAssignment] => [`${id}|2025`, {
    memberId: id, period: "2025", status: "accepted", notes: "", acceptedAt: "2025-01-15T09:00:00Z",
    targets: [
      { objectiveId: "revenue", target: [3_600_000, 3_500_000, 3_800_000][i], commitments: [] },
      { objectiveId: "opportunities", target: [14, 12, 14][i], commitments: [] },
      { objectiveId: "partner-dev", target: 2, commitments: [] },
      { objectiveId: "cbd-dev", target: 1, commitments: [] },
      { objectiveId: "escalation", commitments: ["All required written escalations within SLA", "CRM reporting complete every Friday"] },
    ],
  }]),
  ["u4|2025", {
    memberId: "u4", period: "2025", status: "accepted", notes: "", acceptedAt: "2025-01-14T09:00:00Z",
    targets: [
      { objectiveId: "revenue", target: 11_000_000, commitments: [] },
      { objectiveId: "escalation", commitments: ["All ≥10% variances escalated within 2–3 business days; bank risk same day"] },
      { objectiveId: "partner-dev", target: 4, commitments: [] },
      { objectiveId: "cbd-dev", target: 2, commitments: [] },
      { objectiveId: "reporting", commitments: ["Weekly pipeline report every Monday 09:00", "Bi-weekly coaching with each direct report"] },
    ],
  }],
  ["u3|2026", {
    memberId: "u3", period: "2026", status: "accepted", notes: "", updatedAt: "2026-01-10T09:00:00Z",
    targets: [
      { objectiveId: "revenue", target: 4_000_000, commitments: [] },
      { objectiveId: "opportunities", target: 16, commitments: [] },
      { objectiveId: "partner-dev", target: 2, commitments: [] },
      { objectiveId: "cbd-dev", target: 2, commitments: [] },
      { objectiveId: "escalation", commitments: ["All required written escalations within SLA"] },
    ],
  }],
  ["u4|2026", {
    memberId: "u4", period: "2026", status: "accepted", notes: "", updatedAt: "2026-01-09T09:00:00Z",
    targets: [
      { objectiveId: "revenue", target: 12_000_000, commitments: [] },
      { objectiveId: "escalation", commitments: ["All ≥10% variances escalated within 2–3 business days; bank risk same day"] },
      { objectiveId: "partner-dev", target: 4, commitments: [] },
      { objectiveId: "cbd-dev", target: 2, commitments: [] },
      { objectiveId: "reporting", commitments: ["Weekly pipeline report every Monday 09:00", "Bi-weekly coaching with each direct report"] },
    ],
  }],
  ...(["u5", "u6"] as const).map((id): [string, TargetAssignment] => [`${id}|2026`, {
    memberId: id, period: "2026", status: "accepted", notes: "", acceptedAt: "2026-01-08T09:00:00Z",
    targets: [
      { objectiveId: "revenue", target: 50_000_000, commitments: [] },
      { objectiveId: "escalation", commitments: ["All ≥10% variances escalated in writing within 2–3 business days", "L4 bank-relationship issues escalated immediately"] },
      { objectiveId: "partner-dev", target: 6, commitments: [] },
      { objectiveId: "cbd-dev", target: 4, commitments: [] },
      { objectiveId: "leadership", commitments: id === "u5"
        ? ["Monthly 1:1 coaching with direct reports", "Documented succession for Manager roles", "All cross-entity opportunities routed via the Group CBO path"]
        : ["Quarterly coaching for direct reports", "Documented succession for key commercial roles", "All cross-entity opportunities routed via the Group CBO path, preserving H&H HK identity"] },
    ],
  }]),
  ["u1|2026", {
    memberId: "u1", period: "2026", status: "awaiting-acceptance", updatedAt: "2026-01-08T09:00:00Z",
    notes: "Targets follow the 2026 BD plan. Partner and CBD counts are by number of partners, not volume.",
    targets: [
      { objectiveId: "revenue", target: 4_000_000, commitments: [] },
      { objectiveId: "opportunities", target: 15, commitments: [] },
      { objectiveId: "partner-dev", target: 2, commitments: [] },
      { objectiveId: "cbd-dev", target: 1, commitments: [] },
      { objectiveId: "escalation", commitments: ["All required written escalations within SLA", "CRM and activity reporting complete every Friday"] },
    ],
  }],
  ["u2|2026", {
    memberId: "u2", period: "2026", status: "accepted", notes: "", updatedAt: "2026-01-12T09:00:00Z",
    targets: [
      { objectiveId: "revenue", target: 3_600_000, commitments: [] },
      { objectiveId: "opportunities", target: 12, commitments: [] },
      { objectiveId: "partner-dev", target: 2, commitments: [] },
      { objectiveId: "cbd-dev", target: 2, commitments: [] },
      { objectiveId: "escalation", commitments: ["All required written escalations within SLA"] },
    ],
  }],
]);

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export async function listTeam(): Promise<(TeamMember & { status: Record<string, TargetStatus> })[]> {
  await delay();
  return TEAM.map((m) => ({ ...m, status: Object.fromEntries(PERIODS.map((p) => [p.value, store.get(`${m.id}|${p.value}`)?.status ?? "not-set"])) }));
}

/** Existing assignment, or a blank one built from the member's role template. */
export async function getAssignment(memberId: string, period: string): Promise<TargetAssignment> {
  await delay();
  const saved = store.get(`${memberId}|${period}`);
  const objectives = templateFor(memberId, period).objectives;
  const blank = (id: string): ObjectiveTarget => ({ objectiveId: id, commitments: [...(DEFAULT_COMMITMENTS[id] ?? [])] });
  if (saved) {
    const a = structuredClone(saved);
    // Drafts follow the current mapping; sent / accepted targets stay as agreed.
    if (a.status === "draft") a.targets = objectives.map((o) => a.targets.find((t) => t.objectiveId === o.id) ?? blank(o.id));
    return a;
  }
  return { memberId, period, status: "not-set", notes: "", targets: objectives.map((o) => blank(o.id)) };
}

export async function saveAssignment(a: TargetAssignment, send: boolean): Promise<TargetAssignment> {
  await delay(500);
  const saved: TargetAssignment = { ...structuredClone(a), status: send ? "awaiting-acceptance" : "draft", updatedAt: new Date().toISOString() };
  store.set(`${a.memberId}|${a.period}`, saved);
  return saved;
}

// ---------- employee side: My MBO ----------

// ponytail: demo "View as" switch (header) until auth returns the signed-in employee.
let currentUserId = "u1";
export const getCurrentUserId = () => currentUserId;
export const setCurrentUserId = (id: string) => { currentUserId = id; };
/** Everyone the demo can sign in as (sync — header switcher only). */
export const listDemoUsers = () => TEAM.map((m) => ({ id: m.id, name: m.name, role: ROLE_TEMPLATES[m.role].label }));

export type EvidenceStatus = "evidenced" | "pending" | "missing";
export type Progress = { objectiveId: string; actual?: number; evidence: EvidenceStatus; note?: string };
export type MyMbo = {
  member: TeamMember;
  template: RoleTemplate;
  assignment: TargetAssignment;
  asOf: string; // ISO date of latest recorded actuals
  progress: Progress[];
  finalRating: null | { rating: number; releasedAt: string };
};

const AS_OF: Record<string, string> = {}; // latest "actuals as of" date per employee + period

const PROGRESS: Record<string, Progress[]> = {
  ...Object.fromEntries((["u5", "u6"] as const).map((id) => [`${id}|2026`, [
    { objectiveId: "revenue", actual: 40_000_000, evidence: "evidenced" },
    { objectiveId: "escalation", evidence: "pending", note: "Dated escalation records requested." },
    { objectiveId: "partner-dev", actual: 5, evidence: "evidenced" },
    { objectiveId: "cbd-dev", actual: 3, evidence: "evidenced" },
    { objectiveId: "leadership", evidence: "missing", note: "Add dated coaching and succession records." },
  ] satisfies Progress[]])),
  "u1|2025": [
    { objectiveId: "revenue", actual: 3_960_000, evidence: "evidenced" },
    { objectiveId: "opportunities", actual: 14, evidence: "evidenced" },
    { objectiveId: "partner-dev", actual: 2, evidence: "evidenced" },
    { objectiveId: "cbd-dev", actual: 1, evidence: "evidenced" },
    { objectiveId: "escalation", evidence: "evidenced" },
  ],
  "u2|2025": [
    { objectiveId: "revenue", actual: 3_920_000, evidence: "evidenced" },
    { objectiveId: "opportunities", actual: 12, evidence: "evidenced" },
    { objectiveId: "partner-dev", actual: 3, evidence: "evidenced" },
    { objectiveId: "cbd-dev", actual: 1, evidence: "evidenced" },
    { objectiveId: "escalation", evidence: "evidenced" },
  ],
  "u3|2025": [
    { objectiveId: "revenue", actual: 3_150_000, evidence: "evidenced" },
    { objectiveId: "opportunities", actual: 15, evidence: "evidenced" },
    { objectiveId: "partner-dev", actual: 1, evidence: "missing", note: "Partner onboarding record not attached." },
    { objectiveId: "cbd-dev", actual: 1, evidence: "evidenced" },
    { objectiveId: "escalation", evidence: "pending", note: "One escalation record awaiting review." },
  ],
  "u4|2025": [
    { objectiveId: "revenue", actual: 12_300_000, evidence: "evidenced" },
    { objectiveId: "escalation", evidence: "evidenced" },
    { objectiveId: "partner-dev", actual: 4, evidence: "evidenced" },
    { objectiveId: "cbd-dev", actual: 2, evidence: "evidenced" },
    { objectiveId: "reporting", evidence: "evidenced" },
  ],
  "u2|2026": [
    { objectiveId: "revenue", actual: 2_700_000, evidence: "evidenced" },
    { objectiveId: "opportunities", actual: 9, evidence: "missing", note: "Opportunity stage-change log not attached." },
    { objectiveId: "partner-dev", actual: 2, evidence: "evidenced" },
    { objectiveId: "cbd-dev", actual: 1, evidence: "evidenced" },
    { objectiveId: "escalation", evidence: "evidenced" },
  ],
  "u3|2026": [
    { objectiveId: "revenue", actual: 3_000_000, evidence: "evidenced" },
    { objectiveId: "opportunities", actual: 12, evidence: "evidenced" },
    { objectiveId: "partner-dev", actual: 1, evidence: "evidenced" },
    { objectiveId: "cbd-dev", actual: 2, evidence: "pending", note: "CBD relationship progression note awaiting review." },
    { objectiveId: "escalation", evidence: "evidenced" },
  ],
  "u4|2026": [
    { objectiveId: "revenue", actual: 9_600_000, evidence: "evidenced" },
    { objectiveId: "escalation", evidence: "pending", note: "Dated escalation packs requested." },
    { objectiveId: "partner-dev", actual: 3, evidence: "missing", note: "Activation evidence for one partner." },
    { objectiveId: "cbd-dev", actual: 1, evidence: "evidenced" },
    { objectiveId: "reporting", evidence: "pending", note: "Report submissions and coaching records requested." },
  ],
  "u1|2026": [
    { objectiveId: "revenue", actual: 3_200_000, evidence: "evidenced" },
    { objectiveId: "opportunities", actual: 12, evidence: "evidenced" },
    { objectiveId: "partner-dev", actual: 1, evidence: "missing", note: "Add partner progression evidence for the partner counted." },
    { objectiveId: "cbd-dev", actual: 1, evidence: "evidenced" },
    { objectiveId: "escalation", evidence: "pending", note: "Attach dated escalation records and CRM / activity reports." },
  ],
};

export async function getMyMbo(period: string): Promise<MyMbo> {
  await delay();
  const member = TEAM.find((m) => m.id === currentUserId)!;
  const assignment = await getAssignment(member.id, period);
  return {
    member, template: templateFor(member.id, period), assignment,
    asOf: AS_OF[`${member.id}|${period}`] ?? "2026-09-30",
    progress: PROGRESS[`${member.id}|${period}`] ?? assignment.targets.map((t) => ({ objectiveId: t.objectiveId, evidence: "missing" as const })),
    finalRating: null,
  };
}

export async function acceptTargets(period: string): Promise<void> {
  await delay(500);
  const a = store.get(`${currentUserId}|${period}`);
  if (a?.status !== "awaiting-acceptance") throw new Error("Nothing to accept");
  store.set(`${currentUserId}|${period}`, { ...a, status: "accepted", acceptedAt: new Date().toISOString(), changeRequest: undefined });
}

export async function requestTargetChanges(period: string, comment: string): Promise<void> {
  await delay(500);
  const a = store.get(`${currentUserId}|${period}`);
  if (a?.status !== "awaiting-acceptance") throw new Error("Nothing to respond to");
  store.set(`${currentUserId}|${period}`, { ...a, status: "changes-requested", changeRequest: comment });
}

// ---------- objective details ----------

export type EvidenceRecord = { id: string; title: string; description: string; type: string; date: string; href?: string };

const RECORDS: Record<string, EvidenceRecord[]> = {
  "u1|2026|revenue": [
    { id: "e1", title: "Closed revenue register", description: "Closed personal revenue / fee income for the review period.", type: "Revenue record", date: "2026-09-30" },
    { id: "e2", title: "Origination & closure log", description: "Personal contribution and attributable closures.", type: "CRM / activity log", date: "2026-09-30" },
    { id: "e3", title: "Fee-income reconciliation", description: "Reconciles the reported actual of HKD 3,200,000.", type: "Supporting statement", date: "2026-09-30" },
  ],
  "u1|2026|opportunities": [
    { id: "e4", title: "CRM opportunity export", description: "12 qualified opportunities with dated stage changes.", type: "CRM report", date: "2026-09-30" },
  ],
  "u1|2026|cbd-dev": [
    { id: "e5", title: "Correspondent relationship register", description: "One relationship live, onboarded under H&H HK identity.", type: "Relationship register", date: "2026-08-14" },
  ],
};

export type ObjectiveDetail = { mbo: MyMbo; objective: Objective; index: number; target: ObjectiveTarget; progress: Progress; records: EvidenceRecord[] };

export async function getObjectiveDetail(period: string, objectiveId: string): Promise<ObjectiveDetail | null> {
  const mbo = await getMyMbo(period);
  const index = mbo.template.objectives.findIndex((o) => o.id === objectiveId);
  if (index < 0 || mbo.assignment.status !== "accepted") return null;
  return {
    mbo, index, objective: mbo.template.objectives[index],
    target: mbo.assignment.targets.find((t) => t.objectiveId === objectiveId)!,
    progress: mbo.progress.find((p) => p.objectiveId === objectiveId)!,
    records: RECORDS[`${mbo.member.id}|${period}|${objectiveId}`] ?? [],
  };
}

// ---------- progress & evidence updates ----------

/** One counted partner / relationship / opportunity. The count objective's actual = number of items. */
export type CountItem = {
  id: string;
  name: string;
  classification: "net-new" | "deepened";
  eventDate: string; // ISO date of the qualifying event (onboarding / material progression / stage move)
  contribution: string;
  evidenced: boolean;
};

const opp = (i: number): CountItem => ({
  id: `o${i}`, name: `Opportunity ${String.fromCharCode(64 + i)} — cross-border payments`, classification: "net-new",
  eventDate: `2026-0${1 + Math.floor((i - 1) / 2)}-${String(5 + i).padStart(2, "0")}`, contribution: "Originated and progressed to proposal.", evidenced: true,
});

const COUNT_ITEMS: Record<string, CountItem[]> = {
  "u1|2026|opportunities": Array.from({ length: 12 }, (_, i) => opp(i + 1)),
  "u1|2026|partner-dev": [
    { id: "p1", name: "Partner — name to confirm", classification: "net-new", eventDate: "2026-09-15", contribution: "", evidenced: false },
  ],
  "u1|2026|cbd-dev": [
    { id: "c1", name: "Correspondent Bank A", classification: "net-new", eventDate: "2026-08-14", contribution: "Introduced the bank and coordinated onboarding.", evidenced: true },
  ],
};

export async function getCountItems(period: string, objectiveId: string): Promise<CountItem[]> {
  await delay();
  return structuredClone(COUNT_ITEMS[`${currentUserId}|${period}|${objectiveId}`] ?? []);
}

export type ProgressUpdate = {
  objectiveId: string;
  asOf: string;                 // ISO date
  actual?: number;              // revenue: cumulative HKD year-to-date
  items?: CountItem[];          // count objectives: full list (replaces previous)
  commitment?: string;          // criteria / leadership: which agreed commitment this evidences
  activityDate?: string;
  notes: string;
  attachments: { name: string; size: number }[];
  sourceType: string;
  reference: string;
};

export async function saveProgress(period: string, u: ProgressUpdate): Promise<void> {
  await delay(600);
  const key = `${currentUserId}|${period}`;
  const list = (PROGRESS[key] ??= []);
  const actual = u.items ? u.items.length : u.actual;
  const prev = list.find((p) => p.objectiveId === u.objectiveId);
  const next: Progress = { objectiveId: u.objectiveId, actual: actual ?? prev?.actual, evidence: "pending", note: "Evidence submitted — pending review." };
  PROGRESS[key] = prev ? list.map((p) => (p === prev ? next : p)) : [...list, next];
  if (u.items) COUNT_ITEMS[`${key}|${u.objectiveId}`] = structuredClone(u.items);
  if (actual !== undefined && u.asOf > (AS_OF[key] ?? "")) AS_OF[key] = u.asOf;
  const recKey = `${key}|${u.objectiveId}`;
  const title = u.commitment ?? (u.items ? `Count update — ${u.items.length} recorded` : "Cumulative actual update");
  (RECORDS[recKey] ??= []).unshift(
    ...(u.attachments.length ? u.attachments : [{ name: "", size: 0 }]).map((f, i) => ({
      id: `r${Date.now()}${i}`,
      title: f.name || title,
      description: u.notes,
      type: u.sourceType || (f.name ? "Attachment" : "Progress note"),
      date: u.activityDate ?? u.asOf,
    })),
  );
}

// ---------- escalations ----------


export type EscalationStatus = "draft" | "submitted" | "acknowledged" | "resolved";

export type Escalation = {
  id: string;
  memberId: string;
  period: string;
  status: EscalationStatus;
  category: EscalationCategory;
  objectiveId?: string;
  title: string;
  discovered: string;          // ISO date
  discoveredTime?: string;     // "HH:mm" if known
  comparison?: { from: string; to: string; expected: number; actual: number }; // variance only
  impact: string;
  rootCause: string;
  recovery: string;
  owner: string;
  followUp?: string;           // ISO date
  attachments: { name: string; size: number }[];
  reference: string;
  /** L4 = a bank-relationship issue that also goes to the Subsidiary CEO, Compliance and Group Legal (SOP escalation matrix). */
  l4: boolean;
  recipients: string[];
  submittedAt?: string;        // ISO datetime
};

const MANAGER: Record<string, string> = { u1: "Priya Shah", u2: "Priya Shah", u3: "Priya Shah", u4: "Ethan Lau", u5: "Sophie Tam", u6: "Group CEO" };
export const myManager = () => MANAGER[currentUserId];
export const L4_RECIPIENTS = ["Subsidiary CEO", "Compliance", "Group Legal"];
/** Who a written escalation goes to: the manager, plus the L4 group for L4 bank-relationship issues. */
export const recipientsFor = (l4: boolean) => [myManager(), ...(l4 ? L4_RECIPIENTS : [])];
/** Head of Sales and Group CBO escalate bank-relationship issues as L4 by default (workbook example). */
export const defaultL4 = () => { const r = TEAM.find((m) => m.id === currentUserId)?.role; return r === "head-of-sales" || r === "group-cbo"; };

let ESCALATIONS: Escalation[] = [
  {
    id: "esc-1", memberId: "u1", l4: false, period: "2026", status: "acknowledged", category: "capacity", objectiveId: "revenue",
    title: "Onboarding backlog delaying two closings", discovered: "2026-07-14",
    impact: "Two expected closings (≈HKD 300k) slip into Q4.", rootCause: "Compliance onboarding queue at 3 weeks.",
    recovery: "Prioritise the two files with Compliance; weekly check-in.", owner: "Alok Desai", followUp: "2026-07-31",
    attachments: [{ name: "onboarding-queue-jul.pdf", size: 182_000 }], reference: "", recipients: ["Priya Shah"], submittedAt: "2026-07-15T10:20:00Z",
  },
  {
    id: "esc-2", memberId: "u1", l4: false, period: "2026", status: "draft", category: "variance", objectiveId: "revenue",
    title: "Q3 revenue 12% below plan", discovered: "2026-10-08",
    comparison: { from: "2026-07-01", to: "2026-09-30", expected: 1_000_000, actual: 880_000 },
    impact: "", rootCause: "", recovery: "", owner: "Alok Desai", attachments: [], reference: "", recipients: ["Priya Shah"],
  },
  // 2025 history behind the Panel's escalation-objective ratings
  ...([
    ["u2", "esc-21", "variance", "Q1 revenue 11% below plan", "2025-04-03", "2025-04-07T09:00:00Z"],
    ["u2", "esc-22", "bank-risk", "Correspondent bank query on payment returns", "2025-06-10", "2025-06-10T15:30:00Z"],
    ["u2", "esc-23", "capacity", "Onboarding queue delaying two clients", "2025-09-02", "2025-09-09T10:00:00Z"],
    ["u3", "esc-31", "variance", "H1 opportunities 14% below plan", "2025-07-01", "2025-07-03T11:00:00Z"],
    ["u3", "esc-32", "capacity", "KYC backlog on new partner", "2025-11-18", undefined],
  ] as const).map(([memberId, id, category, title, discovered, submittedAt]): Escalation => ({
    id, memberId, period: "2025", status: submittedAt ? "resolved" : "draft", category, title, discovered, submittedAt,
    l4: false, impact: "—", rootCause: "—", recovery: "—", owner: TEAM.find((m) => m.id === memberId)!.name,
    attachments: [], reference: "", recipients: [MANAGER[memberId]],
  })),
];

export async function listEscalations(period: string): Promise<Escalation[]> {
  await delay();
  return structuredClone(ESCALATIONS.filter((e) => e.period === period && e.memberId === currentUserId)).sort((a, b) => b.discovered.localeCompare(a.discovered));
}

export async function getEscalation(id: string): Promise<Escalation | null> {
  await delay();
  return structuredClone(ESCALATIONS.find((e) => e.id === id) ?? null);
}

/** Save as draft, or submit (sends the written escalation to the manager). Submitted escalations can't be edited. */
export async function saveEscalation(e: Escalation, submit: boolean): Promise<Escalation> {
  await delay(600);
  const existing = ESCALATIONS.find((x) => x.id === e.id);
  if (existing && existing.status !== "draft") throw new Error("Submitted escalations can't be changed");
  const saved: Escalation = { ...structuredClone(e), status: submit ? "submitted" : "draft", ...(submit ? { submittedAt: new Date().toISOString() } : {}) };
  ESCALATIONS = existing ? ESCALATIONS.map((x) => (x.id === e.id ? saved : x)) : [saved, ...ESCALATIONS];
  return saved;
}

// ---------- team overview (manager) ----------

export type TeamRow = {
  member: TeamMember;
  template: RoleTemplate;
  assignment: TargetAssignment;
  progress: Progress[];
  openEscalations: number;
};

const OTHER_ESCALATIONS: Record<string, number> = { u2: 1, u3: 0, u4: 1, u5: 0 };

export async function listTeamOverview(period: string): Promise<TeamRow[]> {
  await delay();
  const rows = await Promise.all(TEAM.map(async (member) => {
    const assignment = await getAssignment(member.id, period);
    const key = `${member.id}|${period}`;
    const progress = PROGRESS[key] ?? assignment.targets.map((t) => ({ objectiveId: t.objectiveId, evidence: "missing" as const }));
    const own = ESCALATIONS.filter((e) => e.memberId === member.id && e.period === period);
    const openEscalations = own.length
      ? own.filter((e) => e.status === "submitted" || e.status === "acknowledged").length
      : OTHER_ESCALATIONS[member.id] ?? 0;
    return { member, template: templateFor(member.id, period), assignment, progress, openEscalations };
  }));
  return rows;
}

// ---------- review & final assessment (MBO Panel / RemCo) ----------

export type ReviewStatus = "not-started" | "draft" | "finalized" | "released";
export type ObjectiveReview = { rating?: number; rationale: string; evidenceRequested?: string };
export type Review = {
  memberId: string;
  period: string;
  status: ReviewStatus;
  ratings: Record<string, ObjectiveReview>;
  /** Identity / KYC / high-risk flow / Chapter 14A breach — not a weighted objective, but gates overall performance. */
  gate: { breach?: boolean; note: string };
  overallComment: string;
  finalizedAt?: string;
  releasedAt?: string;
  acknowledgedAt?: string;
};

export type ReviewBundle = { member: TeamMember; template: RoleTemplate; assignment: TargetAssignment; progress: Progress[]; evidenceCount: Record<string, number>; escalations: Escalation[]; review: Review };

const REVIEWS = new Map<string, Review>([
  ["u1|2025", {
    memberId: "u1", period: "2025", status: "released", finalizedAt: "2026-01-20T09:00:00Z", releasedAt: "2026-01-28T09:00:00Z",
    gate: { breach: false, note: "" },
    overallComment: "A strong first year: revenue above target and clean escalation discipline. Focus for 2026: partner progression evidence.",
    ratings: {
      revenue: { rating: 4, rationale: "110% of target (HKD 3.96m vs 3.6m) with complete closure and reconciliation evidence." },
      opportunities: { rating: 3, rationale: "14 qualified opportunities, each with a dated stage change in CRM. Target met." },
      "partner-dev": { rating: 3, rationale: "Two partners onboarded under H&H HK identity, both evidenced. Target met." },
      "cbd-dev": { rating: 3, rationale: "One correspondent relationship live, as agreed." },
      escalation: { rating: 4, rationale: "All escalations within SLA; CRM reporting consistently on time and complete." },
    },
  }],
  ["u2|2025", {
    memberId: "u2", period: "2025", status: "draft", overallComment: "", gate: { note: "" },
    ratings: { revenue: { rating: 4, rationale: "112% of target with complete revenue evidence." }, opportunities: { rationale: "" }, "partner-dev": { rationale: "" }, "cbd-dev": { rationale: "" }, escalation: { rationale: "" } },
  }],
]);

/** Employees whose targets were accepted for the period — the only ones the Panel can assess. */
export async function listReviewable(period: string): Promise<{ member: TeamMember; status: ReviewStatus }[]> {
  await delay();
  return TEAM.filter((m) => store.get(`${m.id}|${period}`)?.status === "accepted")
    .map((m) => ({ member: m, status: REVIEWS.get(`${m.id}|${period}`)?.status ?? "not-started" }));
}

export async function getReview(memberId: string, period: string): Promise<ReviewBundle | null> {
  await delay();
  const member = TEAM.find((m) => m.id === memberId);
  const assignment = store.get(`${memberId}|${period}`);
  if (!member || assignment?.status !== "accepted") return null;
  const template = templateFor(memberId, period);
  const key = `${memberId}|${period}`;
  return {
    member, template, assignment: structuredClone(assignment),
    progress: structuredClone(PROGRESS[key] ?? []),
    escalations: structuredClone(ESCALATIONS.filter((e) => e.memberId === memberId && e.period === period)),
    evidenceCount: Object.fromEntries(template.objectives.map((o) => [o.id, RECORDS[`${key}|${o.id}`]?.length ?? (PROGRESS[key]?.find((p) => p.objectiveId === o.id)?.evidence === "evidenced" ? 2 : 0)])),
    review: structuredClone(REVIEWS.get(key) ?? {
      memberId, period, status: "not-started", overallComment: "", gate: { note: "" },
      ratings: Object.fromEntries(template.objectives.map((o) => [o.id, { rationale: "" }])),
    }),
  };
}

export async function saveReview(r: Review, mode: "draft" | "finalize" | "release"): Promise<Review> {
  await delay(600);
  const key = `${r.memberId}|${r.period}`;
  const prev = REVIEWS.get(key);
  if (prev?.status === "released") throw new Error("Released reviews can't change");
  if (mode !== "draft" && !periodEnded(r.period)) throw new Error("The review period hasn't ended");
  const now = new Date().toISOString();
  const saved: Review = {
    ...structuredClone(r),
    status: mode === "draft" ? "draft" : mode === "finalize" ? "finalized" : "released",
    ...(mode === "finalize" ? { finalizedAt: now } : {}),
    ...(mode === "release" ? { releasedAt: now } : {}),
  };
  REVIEWS.set(key, saved);
  return saved;
}

/** Ask the employee for more evidence on one objective. */
export async function requestEvidence(memberId: string, period: string, objectiveId: string, message: string): Promise<void> {
  await delay(400);
  const key = `${memberId}|${period}`;
  const list = PROGRESS[key] ?? [];
  PROGRESS[key] = list.map((p) => (p.objectiveId === objectiveId ? { ...p, evidence: "missing", note: `Panel request: ${message}` } : p));
}

// ---------- employee: final results & history ----------

export type HistoryEntry = { period: string; status: "released" | "in-progress" | "no-targets"; releasedAt?: string; acknowledgedAt?: string };

/** Employees only ever see released reviews; drafts and finalized-but-unreleased ratings stay with the Panel. */
export async function getMyResults(period: string): Promise<ReviewBundle | null> {
  const b = await getReview(currentUserId, period);
  return b && b.review.status === "released" ? b : null;
}

export async function listMyHistory(): Promise<HistoryEntry[]> {
  await delay();
  return PERIODS.map(({ value: period }): HistoryEntry => {
    const r = REVIEWS.get(`${currentUserId}|${period}`);
    if (r?.status === "released") return { period, status: "released", releasedAt: r.releasedAt, acknowledgedAt: r.acknowledgedAt };
    return { period, status: store.get(`${currentUserId}|${period}`) ? "in-progress" : "no-targets" };
  }).reverse();
}

export async function acknowledgeResults(period: string): Promise<string> {
  await delay(400);
  const key = `${currentUserId}|${period}`;
  const r = REVIEWS.get(key);
  if (r?.status !== "released") throw new Error("Nothing released to acknowledge");
  const at = new Date().toISOString();
  REVIEWS.set(key, { ...r, acknowledgedAt: at });
  return at;
}


// ---------- MBO setup: tasks → rating guides → framework examples ----------
// ponytail: mock over ROLE_TEMPLATES; the backend keeps these as three linked tables.

export type TaskRow = {
  role: RoleId;
  no: number;
  objective: Objective;
  /** Rating guide state: numeric tasks fall back to the framework default bands; commitment tasks need criteria. */
  guide: "custom" | "default" | "missing";
  hasExample: boolean;
};

const guideState = (o: Objective): TaskRow["guide"] =>
  o.kind === "revenue" || o.kind === "count" ? (o.bands || o.ratingLabels ? "custom" : "default") : o.criteria ? "custom" : "missing";

export async function listTasks(role: RoleId): Promise<TaskRow[]> {
  await delay();
  return ROLE_TEMPLATES[role].objectives.map((o, i) => ({
    role, no: i + 1, objective: structuredClone(o), guide: guideState(o), hasExample: !!FRAMEWORK_EXAMPLES[role][o.id],
  }));
}

/** Saves a task's definition at position `no`. Editing keeps the task's id, rating guide and example; adding inserts it. */
export async function saveTask(role: RoleId, no: number, def: Objective, isNew: boolean): Promise<void> {
  await delay();
  const list = ROLE_TEMPLATES[role].objectives;
  if (isNew) { list.splice(no - 1, 0, def); return; }
  const cur = list[no - 1];
  const typeChanged = (cur.kind === "revenue" || cur.kind === "count") !== (def.kind === "revenue" || def.kind === "count");
  list[no - 1] = {
    ...def, id: cur.id, ratingLabels: cur.ratingLabels,
    // A switch between numeric and commitment invalidates the old rating guide.
    ...(typeChanged ? {} : { bands: cur.bands, criteria: cur.criteria }),
  };
}

export async function deleteTask(role: RoleId, no: number): Promise<void> {
  await delay();
  const [o] = ROLE_TEMPLATES[role].objectives.splice(no - 1, 1);
  if (o) delete FRAMEWORK_EXAMPLES[role][o.id];
}

export type RatingGuide = {
  labels: [string, string, string, string, string];      // 5 → 1
  bands?: [number, number, number, number];               // Amount / Count: lower bounds (% of target) for 5, 4, 3, 2
  criteria?: [string, string, string, string, string];    // Commitment: 5 → 1
};

/** The task's rating guide as it applies today (framework defaults filled in for numeric tasks). */
export async function getRatingGuide(role: RoleId, no: number): Promise<{ task: Objective; guide: RatingGuide; state: TaskRow["guide"] } | null> {
  await delay();
  const o = ROLE_TEMPLATES[role].objectives[no - 1];
  if (!o) return null;
  const numeric = o.kind === "revenue" || o.kind === "count";
  return {
    task: structuredClone(o),
    state: guideState(o),
    guide: {
      labels: [...(o.ratingLabels ?? RATING_LABELS)] as RatingGuide["labels"],
      ...(numeric ? { bands: [...(o.bands ?? BANDS[o.kind as "revenue" | "count"])] as RatingGuide["bands"] } : { criteria: o.criteria ? [...o.criteria] as RatingGuide["criteria"] : undefined }),
    },
  };
}

/** Saves the guide onto the task. Labels and bands equal to the framework defaults aren't stored, so they keep following the framework. */
export async function saveRatingGuide(role: RoleId, no: number, g: RatingGuide): Promise<void> {
  await delay();
  const o = ROLE_TEMPLATES[role].objectives[no - 1];
  const defaultLabels = g.labels.every((l, i) => l === RATING_LABELS[i]);
  ROLE_TEMPLATES[role].objectives[no - 1] = {
    ...o, ratingLabels: defaultLabels ? undefined : g.labels,
    ...(o.kind === "revenue" || o.kind === "count"
      // Bands equal to the framework default aren't stored either.
      ? { bands: g.bands?.every((b, i) => b === BANDS[o.kind as "revenue" | "count"][i]) ? undefined : g.bands }
      : { criteria: g.criteria }),
  };
}

export async function getExample(role: RoleId, no: number): Promise<FrameworkExample | null> {
  await delay();
  const o = ROLE_TEMPLATES[role].objectives[no - 1];
  const x = o && FRAMEWORK_EXAMPLES[role][o.id];
  return x ? { ...x } : null;
}

/** Saves the example for the task's rating guide (1:1); null removes it. */
export async function saveExample(role: RoleId, no: number, x: FrameworkExample | null): Promise<void> {
  await delay();
  const o = ROLE_TEMPLATES[role].objectives[no - 1];
  if (x) FRAMEWORK_EXAMPLES[role][o.id] = x;
  else delete FRAMEWORK_EXAMPLES[role][o.id];
}

// ---------- MBO mapping: role template + tasks + rating guide + example → employee ----------
// Every task has its built-in guide ("Framework default", the one edited on Rating Guides) and the example
// on Framework Examples. Extra guides / examples are alternatives the mapping can pick instead.

export type GuideOption = { id: string; name: string; guide: RatingGuide };
export type ExampleOption = { id: string; guideId: string; name: string; example: FrameworkExample };

const DEFAULT_ID = (role: RoleId, objectiveId: string) => `default:${role}:${objectiveId}`;

/** Alternative guides per role + task. ponytail: seeded for the demo; adding them comes from the setup pages next. */
const EXTRA_GUIDES: Record<string, GuideOption[]> = {
  "sales-rep:revenue": [{
    id: "g-sr-rev-stretch", name: "Stretch (new market)",
    guide: { labels: [...RATING_LABELS] as RatingGuide["labels"], bands: [130, 115, 100, 90] },
  }],
  "manager:revenue": [{
    id: "g-mgr-rev-ramp", name: "Ramp-up year (new portfolio)",
    guide: { labels: [...RATING_LABELS] as RatingGuide["labels"], bands: [115, 105, 95, 80] },
  }],
};
const EXTRA_EXAMPLES: ExampleOption[] = [{
  id: "x-sr-rev-stretch", guideId: "g-sr-rev-stretch", name: "New-market example",
  example: { example: "Example: New-market personal target = HKD 2m.\n• Rating 5: ≥ HKD 2.6m\n• Rating 3: HKD 2.0–2.3m\n• Rating 1: < HKD 1.8m", useCase: "First year selling into a new market, where the upside is harder to reach.", note: "Use only with the Stretch guide." },
}];

const guideOf = (o: Objective): RatingGuide => ({
  labels: [...(o.ratingLabels ?? RATING_LABELS)] as RatingGuide["labels"],
  ...(o.kind === "revenue" || o.kind === "count" ? { bands: [...(o.bands ?? BANDS[o.kind])] as RatingGuide["bands"] } : { criteria: o.criteria }),
});

/** Guides a task can use: its framework default first, then any alternatives. */
export function guideOptions(role: RoleId, o: Objective): GuideOption[] {
  return [{ id: DEFAULT_ID(role, o.id), name: "Framework default", guide: guideOf(o) }, ...(EXTRA_GUIDES[`${role}:${o.id}`] ?? [])];
}

/** Examples for a guide (the default guide's example is the one on Framework Examples). */
export function exampleOptions(role: RoleId, o: Objective, guideId: string): ExampleOption[] {
  const extras = EXTRA_EXAMPLES.filter((x) => x.guideId === guideId);
  if (guideId === DEFAULT_ID(role, o.id)) {
    const x = FRAMEWORK_EXAMPLES[role][o.id];
    return [...(x ? [{ id: DEFAULT_ID(role, o.id), guideId, name: "Framework example", example: x }] : []), ...extras];
  }
  return extras;
}

export type MappingLine = { objectiveId: string; included: boolean; guideId: string; exampleId: string | null };
export type EmployeeMapping = { memberId: string; period: string; role: RoleId; lines: MappingLine[]; savedAt?: string };

const MAPPINGS = new Map<string, EmployeeMapping>(); // `${memberId}|${period}`

const defaultMapping = (memberId: string, period: string, role: RoleId): EmployeeMapping => ({
  memberId, period, role,
  lines: ROLE_TEMPLATES[role].objectives.map((o) => {
    const g = DEFAULT_ID(role, o.id);
    return { objectiveId: o.id, included: true, guideId: g, exampleId: exampleOptions(role, o, g)[0]?.id ?? null };
  }),
});

/** Saved mapping, or the default (employee's own role, every task, default guides and examples). `role` previews another template. */
export async function getMapping(memberId: string, period: string, role?: RoleId): Promise<EmployeeMapping> {
  await delay();
  const saved = MAPPINGS.get(`${memberId}|${period}`);
  const want = role ?? saved?.role ?? TEAM.find((m) => m.id === memberId)!.role;
  if (saved && saved.role === want) {
    // Tasks added to the role since saving come in as included, with defaults.
    const fresh = defaultMapping(memberId, period, want);
    return { ...structuredClone(saved), lines: fresh.lines.map((d) => saved.lines.find((l) => l.objectiveId === d.objectiveId) ?? d) };
  }
  return defaultMapping(memberId, period, want);
}

export async function saveMapping(m: EmployeeMapping): Promise<EmployeeMapping> {
  await delay(400);
  const saved = { ...structuredClone(m), savedAt: new Date().toISOString() };
  MAPPINGS.set(`${m.memberId}|${m.period}`, saved);
  return saved;
}

export const isMapped = (memberId: string, period: string) => MAPPINGS.has(`${memberId}|${period}`);

/** The template an employee actually works to for a period: mapped role, included tasks, chosen guide and example applied. */
export function templateFor(memberId: string, period: string): RoleTemplate {
  const member = TEAM.find((m) => m.id === memberId)!;
  const m = MAPPINGS.get(`${memberId}|${period}`);
  const role = m?.role ?? member.role;
  const base = ROLE_TEMPLATES[role];
  if (!m) return base;
  const objectives = base.objectives.flatMap((o) => {
    const line = m.lines.find((l) => l.objectiveId === o.id);
    if (line && !line.included) return [];
    const g = line && guideOptions(role, o).find((x) => x.id === line.guideId);
    const x = line?.exampleId ? exampleOptions(role, o, line.guideId).find((e) => e.id === line.exampleId) : undefined;
    return [{
      ...o,
      ...(g && g.id !== DEFAULT_ID(role, o.id) ? { ratingLabels: g.guide.labels, ...(g.guide.bands ? { bands: g.guide.bands } : { criteria: g.guide.criteria }) } : {}),
      example: line ? (x?.example ?? null) : undefined,
    }];
  });
  return { ...base, objectives };
}

export async function getTemplateFor(memberId: string, period: string): Promise<RoleTemplate> {
  await delay(100);
  return structuredClone(templateFor(memberId, period));
}


// ---------- alternative guides / examples (managed on Rating Guides and Framework Examples) ----------

export const isDefaultId = (id: string) => id.startsWith("default:");
export const defaultGuideId = DEFAULT_ID;

/** Every guide per task for a role, framework default first. */
export async function listGuides(role: RoleId): Promise<{ no: number; task: Objective; options: GuideOption[] }[]> {
  await delay();
  return ROLE_TEMPLATES[role].objectives.map((o, i) => ({ no: i + 1, task: structuredClone(o), options: structuredClone(guideOptions(role, o)) }));
}

/** Adds (no id) or updates an alternative guide for a task. Returns its id. */
export async function saveAltGuide(role: RoleId, objectiveId: string, g: { id?: string; name: string; guide: RatingGuide }): Promise<string> {
  await delay();
  const list = (EXTRA_GUIDES[`${role}:${objectiveId}`] ??= []);
  const id = g.id ?? `g-${Date.now()}`;
  const i = list.findIndex((x) => x.id === id);
  const rec = { id, name: g.name, guide: g.guide };
  if (i >= 0) list[i] = rec; else list.push(rec);
  return id;
}

/** Deletes an alternative guide, its examples, and points mappings that used it back to the default guide. */
export async function deleteAltGuide(role: RoleId, objectiveId: string, id: string): Promise<void> {
  await delay();
  const key = `${role}:${objectiveId}`;
  EXTRA_GUIDES[key] = (EXTRA_GUIDES[key] ?? []).filter((g) => g.id !== id);
  for (let i = EXTRA_EXAMPLES.length - 1; i >= 0; i--) if (EXTRA_EXAMPLES[i].guideId === id) EXTRA_EXAMPLES.splice(i, 1);
  for (const m of MAPPINGS.values()) for (const l of m.lines) {
    if (l.guideId === id) { l.guideId = DEFAULT_ID(m.role, l.objectiveId); l.exampleId = FRAMEWORK_EXAMPLES[m.role][l.objectiveId] ? l.guideId : null; }
  }
}

/** Adds (no id) or updates an extra example on any guide. Returns its id. */
export async function saveAltExample(x: { id?: string; guideId: string; name: string; example: FrameworkExample }): Promise<string> {
  await delay();
  const id = x.id ?? `x-${Date.now()}`;
  const i = EXTRA_EXAMPLES.findIndex((e) => e.id === id);
  const rec = { id, guideId: x.guideId, name: x.name, example: x.example };
  if (i >= 0) EXTRA_EXAMPLES[i] = rec; else EXTRA_EXAMPLES.push(rec);
  return id;
}

/** Deletes an extra example; mappings that used it fall back to no example. */
export async function deleteAltExample(id: string): Promise<void> {
  await delay();
  const i = EXTRA_EXAMPLES.findIndex((e) => e.id === id);
  if (i >= 0) EXTRA_EXAMPLES.splice(i, 1);
  for (const m of MAPPINGS.values()) for (const l of m.lines) if (l.exampleId === id) l.exampleId = null;
}
