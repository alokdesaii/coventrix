"use client";

import Link from "next/link";
import { useState } from "react";
import { big, field, Filter } from "@/components/client-list";
import { Chip, EVIDENCE, ProgressBar, StatusChip, STATUS } from "@/components/mbo";
import { PageHeader, PANEL, Select, useRows } from "@/components/ui";
import { listTeamOverview, PERIODS, ROLE_TEMPLATES, type RoleId, type TargetStatus, type TeamRow } from "@/lib/api/mbo";

const SHORT: Record<string, string> = {
  revenue: "Revenue", opportunities: "Qualified opps", "partner-dev": "Partner dev", "cbd-dev": "CBD partners",
  escalation: "Escalation", reporting: "Reporting & coaching", leadership: "Leadership",
};

const gaps = (r: TeamRow) => r.progress.filter((p) => p.evidence !== "evidenced");

function Tile({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-slate/20 px-5 py-4 not-first:border-t sm:not-first:border-t-0 sm:not-first:border-l">
      <span className="text-xs font-medium text-slate">{label}</span>
      <span className={`text-xl font-semibold tabular-nums ${tone ?? "text-night"}`}>{value}</span>
      <span className="text-xs text-slate">{sub}</span>
    </div>
  );
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** One objective as a single line: name + weight · actual / target + bar · % (or evidence chip if qualitative). */
function ObjectiveLine({ r, id }: { r: TeamRow; id: string }) {
  const o = r.template.objectives.find((x) => x.id === id)!;
  const t = r.assignment.targets.find((x) => x.objectiveId === id);
  const p = r.progress.find((x) => x.objectiveId === id);
  const numeric = o.kind === "revenue" || o.kind === "count";
  const pct = numeric && t?.target && p?.actual !== undefined ? (p.actual / t.target) * 100 : null;
  const val = (n?: number) => (n === undefined ? "—" : o.kind === "revenue" ? compact.format(n) : String(n));
  return (
    <div className="grid grid-cols-[10rem_minmax(0,1fr)_3rem] items-center gap-4 py-1.5 text-xs" title={o.title}>
      <span className="truncate font-semibold text-navy">{SHORT[id] ?? o.title} <span className="font-normal text-slate">{o.weight}%</span></span>
      {numeric ? (
        <span className="flex min-w-0 items-center gap-2">
          <span className="w-36 shrink-0 text-night tabular-nums">{o.kind === "revenue" ? "HKD " : ""}{val(p?.actual)} <span className="text-slate">/ {val(t?.target)}</span></span>
          {pct !== null && <span className="min-w-8 flex-1"><ProgressBar pct={pct} /></span>}
        </span>
      ) : (
        <span>{p && <Chip tone={EVIDENCE[p.evidence].tone}>{EVIDENCE[p.evidence].label}</Chip>}</span>
      )}
      <span className="text-right font-semibold text-[#00857d] tabular-nums">{pct !== null ? `${Math.round(pct)}%` : ""}</span>
    </div>
  );
}

function Action({ r, period }: { r: TeamRow; period: string }) {
  const s = r.assignment.status;
  const label = s === "not-set" ? "Assign targets" : s === "draft" ? "Finish targets" : s === "changes-requested" ? "Review request" : "View targets";
  const strong = s === "not-set" || s === "draft" || s === "changes-requested";
  return (
    <Link href={`/bd/web/mbo/assign?member=${r.member.id}&period=${period}`}
      className={`inline-flex h-8 items-center rounded px-3 text-xs font-semibold whitespace-nowrap transition ${strong ? "bg-navy text-white hover:bg-navy/90" : "text-navy hover:bg-mist"}`}>
      {label}
    </Link>
  );
}

function MemberRow({ r, period }: { r: TeamRow; period: string }) {
  const s = r.assignment.status;
  const tracking = s === "accepted";
  const g = gaps(r);
  return (
    <tr className="align-top">
      <td className="py-4 pr-4 pl-5">
        <p className="font-semibold text-night">{r.member.name}</p>
        <p className="mt-0.5 text-xs text-night/80">{r.template.label}</p>
        <p className="mt-0.5 text-xs text-slate">{r.member.unit}</p>
        <p className="mt-2"><StatusChip status={s} /></p>
      </td>
      <td className="px-3 py-4">
        {tracking ? (
          <div className="flex max-w-xl flex-col divide-y divide-slate/10">
            {r.template.objectives.map((o) => <ObjectiveLine key={o.id} r={r} id={o.id} />)}
          </div>
        ) : (
          <p className="rounded border border-dashed border-slate/40 px-4 py-5 text-center text-xs text-slate">
            {s === "not-set" ? "No targets yet for this period."
              : s === "draft" ? "Targets drafted but not sent to the employee."
              : s === "changes-requested" ? `Asked for changes: “${r.assignment.changeRequest}”`
              : "Waiting for the employee to accept their targets."}
          </p>
        )}
      </td>
      <td className="px-3 py-4 text-xs">
        {tracking && (
          <div className="flex flex-col gap-1.5">
            <span><Chip tone={g.length ? "bg-amber-100 text-amber-800" : "bg-teal/10 text-[#00857d]"}>
              {r.progress.length - g.length} / {r.progress.length} evidenced
            </Chip></span>
            {g.slice(0, 2).map((p) => (
              <span key={p.objectiveId} className="text-night/80">
                <span className="font-medium">{SHORT[p.objectiveId]}:</span> {p.note ?? EVIDENCE[p.evidence].label}
              </span>
            ))}
          </div>
        )}
        {r.openEscalations > 0 && (
          <span className={`${tracking ? "mt-2" : ""} inline-flex`}><Chip tone="bg-red-100 text-red-700">{r.openEscalations} open escalation{r.openEscalations > 1 ? "s" : ""}</Chip></span>
        )}
      </td>
      <td className="py-4 pr-5 pl-3 text-right"><Action r={r} period={period} /></td>
    </tr>
  );
}

export default function TeamOverviewPage() {
  const [period, setPeriod] = useState("2026");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleId | "">("");
  const [status, setStatus] = useState<TargetStatus | "">("");
  const [followUp, setFollowUp] = useState(false);
  const all = useRows(() => listTeamOverview(period), [period]);

  const rows = all?.filter((r) =>
    (!q.trim() || r.member.name.toLowerCase().includes(q.trim().toLowerCase())) &&
    (!role || r.member.role === role) &&
    (!status || r.assignment.status === status) &&
    (!followUp || (r.assignment.status === "accepted" && gaps(r).length > 0)));

  const accepted = all?.filter((r) => r.assignment.status === "accepted") ?? [];
  const needAction = all?.filter((r) => r.assignment.status !== "accepted" && r.assignment.status !== "awaiting-acceptance").length ?? 0;
  const followUps = accepted.filter((r) => gaps(r).length).length;
  const openEsc = all?.reduce((n, r) => n + r.openEscalations, 0) ?? 0;

  return (
    <div>
      <PageHeader title="Team MBO Overview">
        <Link href={`/bd/web/mbo/assign?period=${period}`} className="flex h-9 items-center rounded bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/90">Assign targets</Link>
      </PageHeader>

      <div className="flex flex-col gap-5">
        <section className="grid overflow-hidden rounded-md border border-slate/20 bg-white sm:grid-cols-4">
          <Tile label="Team members" value={all?.length ?? "—"} sub="In this view" />
          <Tile label="Targets accepted" value={all ? `${accepted.length} / ${all.length}` : "—"} sub={needAction ? `${needAction} need your action` : "All targets sent"} tone={needAction ? "text-amber-700" : undefined} />
          <Tile label="Evidence follow-up" value={all ? followUps : "—"} sub="Employees with missing or pending evidence" tone={followUps ? "text-amber-700" : undefined} />
          <Tile label="Open escalations" value={all ? openEsc : "—"} sub="Submitted or acknowledged" tone={openEsc ? "text-red-700" : undefined} />
        </section>

        <section className={PANEL.replace("p-5", "")}>
          <div className="grid gap-4 border-b border-slate/20 p-5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_auto] xl:items-end">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate">Employee
              <input className={field} placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <Filter label="Review period"><Select label="Review period" className={big} value={period} onChange={setPeriod} options={PERIODS} /></Filter>
            <Filter label="Role">
              <Select label="Role" className={big} value={role} onChange={setRole}
                options={[{ value: "" as RoleId | "", label: "All roles" }, ...(Object.keys(ROLE_TEMPLATES) as RoleId[]).map((k) => ({ value: k as RoleId | "", label: ROLE_TEMPLATES[k].label }))]} />
            </Filter>
            <Filter label="Target status">
              <Select label="Target status" className={big} value={status} onChange={setStatus}
                options={[{ value: "" as TargetStatus | "", label: "All statuses" }, ...(Object.keys(STATUS) as TargetStatus[]).map((k) => ({ value: k as TargetStatus | "", label: STATUS[k].label }))]} />
            </Filter>
            <label className="flex h-9 items-center gap-2 text-sm whitespace-nowrap text-night">
              <input type="checkbox" className="size-4 accent-navy" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
              Needs evidence follow-up
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="text-left text-xs text-slate">
                <tr>
                  <th className="w-52 py-3 pr-4 pl-5 font-medium">Employee</th>
                  <th className="px-3 py-3 font-medium">Objective progress · actual of annual target</th>
                  <th className="w-56 px-3 py-3 font-medium">Evidence & escalations</th>
                  <th className="w-36 py-3 pr-5 pl-3"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate/15 border-t border-slate/15">
                {!rows && [0, 1, 2].map((i) => (
                  <tr key={i}><td colSpan={4} className="px-5 py-4"><div className="h-20 animate-pulse rounded bg-mist" /></td></tr>
                ))}
                {rows?.length === 0 && <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-slate">No employees match these filters.</td></tr>}
                {rows?.map((r) => <MemberRow key={r.member.id} r={r} period={period} />)}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate/20 px-5 py-3 text-xs text-slate">
            {rows ? `Showing ${rows.length} of ${all!.length} employees · progress is % of the annual target, not a rating. Final ratings: MBO Panel / RemCo.` : "Loading…"}
          </div>
        </section>
      </div>
    </div>
  );
}
