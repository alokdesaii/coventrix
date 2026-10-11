"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use } from "react";
import { BandGuide, Chip, EVIDENCE, formatValue, FrameworkExample, ProgressBar } from "@/components/mbo";
import { BackButton, PageHeader, PANEL, useRows } from "@/components/ui";
import { getObjectiveDetail, type ObjectiveDetail } from "@/lib/api/mbo";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const primary = "flex h-9 items-center rounded bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40";
const secondary = "flex h-9 items-center rounded border border-slate/40 bg-white px-4 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40";

function Stat({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate">{label}</span>
      <span className={`text-xl font-semibold tabular-nums ${accent ? "text-[#00857d]" : "text-night"}`}>{value}</span>
      {sub && <span className="text-xs text-slate">{sub}</span>}
    </div>
  );
}

function Progress({ d }: { d: ObjectiveDetail }) {
  const { objective: o, target: t, progress: p } = d;
  if (o.kind === "revenue" || o.kind === "count") {
    const pct = t.target && p.actual !== undefined ? (p.actual / t.target) * 100 : 0;
    const remaining = Math.max(0, (t.target ?? 0) - (p.actual ?? 0));
    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Agreed annual target" value={formatValue(o, t.target)} />
        <Stat label="Actual to date" value={formatValue(o, p.actual)} sub={`As of ${fmtDate(d.mbo.asOf)}`} />
        <Stat label="Remaining to target" value={formatValue(o, remaining)} />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate">Progress</span>
          <span className="text-xl font-semibold text-[#00857d] tabular-nums">{Math.round(pct)}%</span>
          <ProgressBar pct={pct} />
          <span className="text-xs text-slate">of annual target · not a rating</span>
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div>
        <p className="mb-2 text-xs font-medium text-slate">{o.kind === "leadership" ? "Agreed leadership commitments" : "Agreed commitments"}</p>
        <ul className="divide-y divide-slate/15 rounded border border-slate/20">
          {t.commitments.map((c) => <li key={c} className="px-4 py-2.5 text-sm text-night">{c}</li>)}
        </ul>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate">Evidence status</span>
        <span><Chip tone={EVIDENCE[p.evidence].tone}>{EVIDENCE[p.evidence].label}</Chip></span>
        <span className="text-xs text-slate">Assessed on evidence by the MBO Panel; there&apos;s no % progress for this objective.</span>
      </div>
    </div>
  );
}

export default function ObjectiveDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const period = useSearchParams().get("period") ?? "2026";
  const rows = useRows(async () => [await getObjectiveDetail(period, id)], [period, id]);
  const d = rows?.[0];

  const back = <BackButton href="/bd/web/mbo/my" to="My MBO" />;

  if (rows && !d) {
    return (
      <div>
        <PageHeader title="Objective Details">{back}</PageHeader>
        <div className={`${PANEL} py-14 text-center`}>
          <p className="text-sm font-semibold text-night">This objective isn&apos;t available</p>
          <p className="mt-1 text-sm text-slate">Your {period} targets may not be accepted yet. Open My MBO to review them.</p>
        </div>
      </div>
    );
  }

  const o = d?.objective;
  return (
    <div>
      <PageHeader title={o?.title ?? "Objective Details"}>
        <Link href={`/bd/web/mbo/escalations/new?objective=${id}&period=${period}`} className={secondary}>Raise escalation</Link>
        <Link href={`/bd/web/mbo/progress?objective=${id}&period=${period}`} className={primary}>Update progress / evidence</Link>
        {back}
      </PageHeader>

      {!d || !o ? (
        <div className={`${PANEL} flex flex-col gap-4`}>{[0, 1].map((i) => <div key={i} className="h-36 animate-pulse rounded-md bg-mist" />)}</div>
      ) : (
        <div className={`${PANEL} flex flex-col gap-6`}>
          <section className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-slate/20 pb-5 text-sm">
            <span className="text-night/80">Objective <span className="font-semibold text-night">{d.index + 1} of {d.mbo.template.objectives.length}</span></span>
            <span className="text-night/80">Weight <span className="font-semibold text-navy">{o.weight}%</span></span>
            <span className="text-night/80">Period <span className="font-semibold text-night">{period} · 1 Jan–31 Dec</span></span>
            <span className="text-night/80">Final rating <span className="font-semibold text-night">Not yet assessed</span> <span className="text-xs text-slate">(MBO Panel / RemCo)</span></span>
          </section>

          <section>
            <h2 className="mb-4 text-[15px] font-semibold text-navy">Progress</h2>
            <Progress d={d} />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-md border border-slate/25 p-5">
              <h2 className="mb-3 text-[15px] font-semibold text-navy">Measurement & guidance</h2>
              <dl className="flex flex-col gap-4 text-sm">
                <div><dt className="font-semibold text-night">What counts</dt><dd className="mt-1 text-night/80">{o.definition}</dd></div>
                <div><dt className="font-semibold text-night">Evidence expected</dt><dd className="mt-1 text-night/80">{o.evidence}</dd></div>
                <div>
                  <dt className="font-semibold text-night">Framework example</dt>
                  <dd className="mt-1"><FrameworkExample role={d.mbo.member.role} objectiveId={o.id} /></dd>
                </div>
                <div>
                  <dt className="font-semibold text-night">When to escalate</dt>
                  <dd className="mt-1 text-night/80">A ≥10% variance or capacity issue needs a written escalation within 2–3 business days; bank query risk, immediately.</dd>
                </div>
              </dl>
            </section>
            <section className="rounded-md border border-slate/25 p-5">
              <h2 className="mb-1 text-[15px] font-semibold text-navy">Rating guide</h2>
              <p className="mb-2 text-xs text-slate">For reference only. Rating 3 means the agreed target is met; the Panel sets the final rating.</p>
              <BandGuide o={o} target={d.target.target} />
            </section>
          </div>

          <section>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-navy">Supporting records</h2>
              <span className="text-xs text-slate">{d.records.length} record{d.records.length === 1 ? "" : "s"}</span>
            </div>
            {d.records.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate/40 px-5 py-8 text-center">
                <p className="text-sm font-semibold text-night">No evidence recorded yet</p>
                <p className="mt-1 text-sm text-slate">{d.progress.note ?? `Add records such as: ${o.evidence}`}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-slate/25">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-label/60 text-left text-xs text-slate">
                    <tr>
                      <th className="py-2.5 pr-3 pl-5 font-medium">Record</th>
                      <th className="px-3 py-2.5 font-medium">Type</th>
                      <th className="px-3 py-2.5 font-medium">Date</th>
                      <th className="py-2.5 pr-5 pl-3"><span className="sr-only">Open</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate/15">
                    {d.records.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 pr-3 pl-5"><p className="font-semibold text-night">{r.title}</p><p className="mt-0.5 text-xs text-night/70">{r.description}</p></td>
                        <td className="px-3 py-3 text-night">{r.type}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-night">{fmtDate(r.date)}</td>
                        <td className="py-3 pr-5 pl-3 text-right">
                          <button type="button" disabled title="Document viewer connects to the evidence store" className="h-8 rounded px-3 text-xs font-semibold text-navy hover:bg-mist">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
