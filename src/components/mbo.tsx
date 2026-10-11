// Shared MBO display helpers.
import type { Escalation, EscalationStatus, EvidenceStatus, Objective, TargetStatus } from "@/lib/api/mbo";
import { FRAMEWORK_EXAMPLES } from "@/lib/mbo-examples";
import { slaDueDate } from "@/lib/mbo-sla";
import type { RoleId } from "@/lib/api/mbo";
import { bandsFor } from "@/lib/mbo-bands";

export const STATUS: Record<TargetStatus, { label: string; tone: string }> = {
  "not-set": { label: "Not set", tone: "bg-mist text-slate" },
  draft: { label: "Draft", tone: "bg-amber-100 text-amber-800" },
  "awaiting-acceptance": { label: "Awaiting employee acceptance", tone: "bg-sky-100 text-sky-800" },
  "changes-requested": { label: "Changes requested", tone: "bg-red-100 text-red-700" },
  accepted: { label: "Accepted", tone: "bg-teal/10 text-[#00857d]" },
};

export function StatusChip({ status }: { status: TargetStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS[status].tone}`}>{STATUS[status].label}</span>;
}

/** Target / actual formatted for the objective's unit. */
export function formatValue(o: Objective, n?: number) {
  if (n === undefined) return "—";
  return o.kind === "revenue" ? `HKD ${n.toLocaleString("en-US")}` : `${n.toLocaleString("en-US")} ${n === 1 ? o.unit!.replace(/ies$/, "y").replace(/s$/, "") : o.unit}`;
}

/** Rating bands for the entered target, computed live. */
export function BandGuide({ o, target }: { o: Objective; target?: number }) {
  if (o.kind === "criteria" || o.kind === "leadership") {
    return (
      <ol className="divide-y divide-slate/15 text-xs">
        {o.criteria!.map((c, i) => (
          <li key={i} className="grid grid-cols-[1.25rem_1fr] gap-2 py-1.5">
            <span className="font-semibold text-navy">{5 - i}</span><span className="text-night/80">{c}</span>
          </li>
        ))}
      </ol>
    );
  }
  if (!target) return <p className="py-2 text-xs text-slate">Enter a target to see the rating bands.</p>;
  const bands = bandsFor(o.kind, target, o.unit);
  const missing = bands.filter((b) => !b.reachable).map((b) => b.rating);
  return (
    <>
      <ol className="divide-y divide-slate/15 text-xs">
        {bands.map((b) => (
          <li key={b.rating} className={`grid grid-cols-[1.25rem_1fr_auto] gap-2 py-1.5 ${b.reachable ? "" : "text-slate"}`}>
            <span className="font-semibold text-navy">{b.rating}</span>
            <span className={b.reachable ? "text-night/80" : ""}>{b.label}</span>
            <span className={`text-right tabular-nums ${b.reachable ? "font-medium text-night" : "italic"}`}>{b.range}</span>
          </li>
        ))}
      </ol>
      {missing.length > 0 && (
        <p className="mt-2 rounded bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
          With a target of {target}, rating{missing.length > 1 ? "s" : ""} {missing.join(" and ")} can&apos;t be reached in whole {o.unit}.
          Pending MBO Panel guidance on small count targets.
        </p>
      )}
    </>
  );
}


export const EVIDENCE: Record<EvidenceStatus, { label: string; tone: string }> = {
  evidenced: { label: "Evidence recorded", tone: "bg-teal/10 text-[#00857d]" },
  pending: { label: "Evidence pending", tone: "bg-amber-100 text-amber-800" },
  missing: { label: "Evidence missing", tone: "bg-red-100 text-red-700" },
};

export function Chip({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${tone}`}>{children}</span>;
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-teal" style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}


export const ESC_STATUS: Record<EscalationStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-amber-100 text-amber-800" },
  submitted: { label: "Submitted", tone: "bg-sky-100 text-sky-800" },
  acknowledged: { label: "Acknowledged", tone: "bg-teal/10 text-[#00857d]" },
  resolved: { label: "Resolved", tone: "bg-mist text-slate" },
};

const escDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** SLA outcome: submitted on/after the due date, or how long a draft has left. */
export function escalationSla(e: Escalation): { label: string; tone: string } {
  const due = slaDueDate(e.category, e.discovered);
  if (e.submittedAt) {
    return e.submittedAt.slice(0, 10) <= due
      ? { label: "Within SLA", tone: "bg-teal/10 text-[#00857d]" }
      : { label: "Late", tone: "bg-red-100 text-red-700" };
  }
  return new Date().toISOString().slice(0, 10) > due
    ? { label: `Overdue since ${escDate(due)}`, tone: "bg-red-100 text-red-700" }
    : { label: `Due ${escDate(due)}`, tone: "bg-amber-100 text-amber-800" };
}


/** The workbook's worked example + note for an objective (Excel columns E–F). */
export function FrameworkExample({ role, objectiveId }: { role: RoleId; objectiveId: string }) {
  const x = FRAMEWORK_EXAMPLES[role]?.[objectiveId];
  if (!x) return null;
  return (
    <div className="flex flex-col gap-1.5 text-xs leading-relaxed">
      <p className="whitespace-pre-line text-night/80">{x.example}</p>
      <p className="text-slate"><span className="font-semibold">Note:</span> {x.note}</p>
    </div>
  );
}
