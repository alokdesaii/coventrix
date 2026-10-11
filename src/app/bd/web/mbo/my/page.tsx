"use client";

import Link from "next/link";
import { useState } from "react";
import { big, Filter } from "@/components/client-list";
import { Chip, EVIDENCE, formatValue, ProgressBar, StatusChip } from "@/components/mbo";
import { PageHeader, PANEL, Select, useRows } from "@/components/ui";
import {
  acceptTargets, getMyMbo, PERIODS, requestTargetChanges,
  type MyMbo, type Objective, type Progress,
} from "@/lib/api/mbo";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const primary = "h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40";
const secondary = "h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40";

function targetText(o: Objective, d: MyMbo) {
  const t = d.assignment.targets.find((x) => x.objectiveId === o.id)!;
  return o.kind === "revenue" || o.kind === "count" ? formatValue(o, t.target) : t.commitments;
}

/** Shown while targets wait for the employee: review, then accept or ask for changes. */
function ReviewTargets({ d, period, onDone }: { d: MyMbo; period: string; onDone: () => void }) {
  const [asking, setAsking] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError("");
    try { await fn(); onDone(); } catch { setError("Something went wrong. Please try again."); setBusy(false); }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="rounded bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <p className="font-semibold">Your {period} targets are ready for you to review</p>
        <p className="mt-0.5 text-sky-800">Accept them to start tracking progress, or ask your manager for changes.</p>
      </div>

      {d.assignment.notes && (
        <div className="rounded border border-slate/25 px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-slate uppercase">Note from your manager</p>
          <p className="mt-1 text-sm whitespace-pre-line text-night">{d.assignment.notes}</p>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-slate/25">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-label/60 text-left text-xs text-slate">
            <tr>
              <th className="py-2.5 pr-3 pl-5 font-medium">Objective</th>
              <th className="px-3 py-2.5 text-right font-medium">Weight</th>
              <th className="py-2.5 pr-5 pl-3 font-medium">Agreed target / commitments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate/15">
            {d.template.objectives.map((o) => {
              const t = targetText(o, d);
              return (
                <tr key={o.id} className="align-top">
                  <td className="py-3 pr-3 pl-5">
                    <p className="font-semibold text-night">{o.title}</p>
                    <p className="mt-0.5 text-xs text-night/70">{o.definition}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-navy tabular-nums">{o.weight}%</td>
                  <td className="py-3 pr-5 pl-3 text-night">
                    {Array.isArray(t) ? <ul className="list-disc space-y-1 pl-4 text-sm">{t.map((c) => <li key={c}>{c}</li>)}</ul>
                      : <span className="font-semibold tabular-nums">{t} <span className="font-normal text-slate">/ year</span></span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {asking && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-night/70">What should change, and why?<span className="text-red-600"> *</span></span>
          <textarea rows={3} autoFocus value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. The CBD target assumes a bank already onboarded last year."
            className="w-full rounded border border-slate/40 px-3 py-2 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20" />
        </label>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
        {error && <p role="alert" className="mr-auto text-sm text-red-600">{error}</p>}
        {asking ? (
          <>
            <button type="button" className={secondary} disabled={busy} onClick={() => { setAsking(false); setComment(""); }}>Cancel</button>
            <button type="button" className={primary} disabled={busy || !comment.trim()}
              onClick={() => run(() => requestTargetChanges(period, comment.trim()))}>{busy ? "Sending…" : "Send to manager"}</button>
          </>
        ) : (
          <>
            <button type="button" className={secondary} disabled={busy} onClick={() => setAsking(true)}>Request changes</button>
            <button type="button" className={primary} disabled={busy} onClick={() => run(() => acceptTargets(period))}>
              {busy ? "Accepting…" : "Accept targets"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function ProgressCell({ o, p, target }: { o: Objective; p: Progress; target?: number }) {
  if ((o.kind === "revenue" || o.kind === "count") && target && p.actual !== undefined) {
    const pct = (p.actual / target) * 100;
    return (
      <div className="flex min-w-36 flex-col gap-1.5">
        <span className="text-sm font-semibold text-[#00857d] tabular-nums">{Math.round(pct)}%</span>
        <ProgressBar pct={pct} />
        {p.evidence !== "evidenced" && <Chip tone={EVIDENCE[p.evidence].tone}>{EVIDENCE[p.evidence].label}</Chip>}
      </div>
    );
  }
  return <Chip tone={EVIDENCE[p.evidence].tone}>{EVIDENCE[p.evidence].label}</Chip>;
}

function Objectives({ d }: { d: MyMbo }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-navy">My agreed objectives</h2>
        <p className="text-xs text-slate">Actuals to {fmtDate(d.asOf)} · progress is % of the annual target, not a rating</p>
      </div>
      <div className="overflow-x-auto rounded-md border border-slate/25">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-label/60 text-left text-xs text-slate">
            <tr>
              <th className="w-[34%] py-2.5 pr-3 pl-5 font-medium">Objective</th>
              <th className="px-3 py-2.5 text-right font-medium">Weight</th>
              <th className="px-3 py-2.5 font-medium">Agreed target</th>
              <th className="px-3 py-2.5 font-medium">Actual to date</th>
              <th className="px-3 py-2.5 font-medium">Progress / evidence</th>
              <th className="py-2.5 pr-5 pl-3"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate/15">
            {d.template.objectives.map((o) => {
              const t = d.assignment.targets.find((x) => x.objectiveId === o.id)!;
              const p = d.progress.find((x) => x.objectiveId === o.id)!;
              const numeric = o.kind === "revenue" || o.kind === "count";
              return (
                <tr key={o.id} className="align-middle">
                  <td className="py-3.5 pr-3 pl-5">
                    <p className="font-semibold text-night">{o.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-night/70">{o.definition}</p>
                  </td>
                  <td className="px-3 py-3.5 text-right font-semibold text-navy tabular-nums">{o.weight}%</td>
                  <td className="px-3 py-3.5 text-night">
                    {numeric ? <span className="font-medium tabular-nums">{formatValue(o, t.target)}</span>
                      : <span className="text-xs">{t.commitments.length} agreed commitment{t.commitments.length === 1 ? "" : "s"}</span>}
                  </td>
                  <td className="px-3 py-3.5 text-night tabular-nums">{numeric ? formatValue(o, p.actual) : <span className="text-xs text-slate">Assessed on evidence</span>}</td>
                  <td className="px-3 py-3.5"><ProgressCell o={o} p={p} target={t.target} /></td>
                  <td className="py-3.5 pr-5 pl-3 text-right">
                    <Link href={`/bd/web/mbo/objective/${o.id}?period=${d.assignment.period}`} aria-label={`Details for ${o.title}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs font-semibold text-navy hover:bg-mist">
                      Details
                      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="m9 18 6-6-6-6" /></svg>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-slate/25 text-xs text-slate">
            <tr>
              <td className="py-2.5 pr-3 pl-5 font-medium text-night">Total weight</td>
              <td className="px-3 py-2.5 text-right font-semibold text-navy">{d.template.objectives.reduce((s, o) => s + o.weight, 0)}%</td>
              <td colSpan={4} className="py-2.5 pr-5 pl-3">Weights are fixed by the {d.template.label} framework.</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function Attention({ d }: { d: MyMbo }) {
  const items = d.progress.filter((p) => p.evidence !== "evidenced");
  return (
    <section className="rounded-md border border-slate/25 p-5">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="mr-auto text-[15px] font-semibold text-navy">Needs your attention</h2>
        {items.length > 0 && <Chip tone="bg-amber-100 text-amber-800">{items.length} evidence action{items.length > 1 ? "s" : ""}</Chip>}
      </div>
      {items.length === 0 ? <p className="text-sm text-slate">All objectives have evidence recorded.</p> : (
        <ul className="divide-y divide-slate/15">
          {items.map((p) => {
            const o = d.template.objectives.find((x) => x.id === p.objectiveId)!;
            return (
              <li key={p.objectiveId} className="flex items-start gap-4 py-3">
                <div className="mr-auto">
                  <p className="text-sm font-semibold text-night">{o.title}</p>
                  <p className="mt-0.5 text-xs text-night/70">{p.note ?? o.evidence}</p>
                </div>
                <Chip tone={EVIDENCE[p.evidence].tone}>{EVIDENCE[p.evidence].label}</Chip>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Guidance() {
  return (
    <section className="rounded-md border border-slate/25 p-5 text-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-navy">Escalation & assessment</h2>
        <Link href="/bd/web/mbo/escalations" className="text-xs font-semibold text-navy hover:underline">My escalations →</Link>
      </div>
      <dl className="divide-y divide-slate/15">
        <div className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="font-medium text-night">≥10% variance or capacity issue</dt><dd className="text-night/80">Escalate in writing to your manager within 2–3 business days.</dd></div>
        <div className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="font-medium text-night">Bank query risk</dt><dd className="text-night/80">Escalate immediately.</dd></div>
        <div className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="font-medium text-night">Final rating</dt><dd className="text-night/80">Set by the MBO Panel / RemCo only, on a 1–5 scale. 3 means the agreed target is met.</dd></div>
      </dl>
    </section>
  );
}

export default function MyMboPage() {
  const [period, setPeriod] = useState("2026");
  const [reload, setReload] = useState(0);
  const rows = useRows(async () => [await getMyMbo(period)], [period, reload]);
  const d = rows?.[0];
  const status = d?.assignment.status;
  const accepted = status === "accepted";

  return (
    <div>
      <PageHeader title="My MBO">
        {/* Escalations don't depend on target acceptance (capacity / bank risk can arise any time). */}
        <Link href={`/bd/web/mbo/escalations/new?period=${period}`} className={`${secondary} flex h-9 items-center`}>Raise escalation</Link>
        {accepted && <Link href={`/bd/web/mbo/progress?period=${period}`} className={`${primary} flex h-9 items-center`}>Update progress / evidence</Link>}
      </PageHeader>

      <div className={`${PANEL} flex flex-col gap-6`}>
        <section className="grid gap-x-6 gap-y-4 border-b border-slate/20 pb-6 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
          <div>
            <p className="text-base font-semibold text-night">{d?.member.name ?? " "}</p>
            <p className="mt-0.5 text-sm text-night/80">{d?.template.label}</p>
            <p className="mt-0.5 text-xs text-slate">Harbour & Hills HK · {d?.member.unit}</p>
          </div>
          <Filter label="Review period">
            <Select label="Review period" className={big} value={period} onChange={setPeriod} options={PERIODS} />
          </Filter>
          <div className="flex flex-col gap-1.5 text-xs font-medium text-slate">
            Targets
            <span>{status ? <StatusChip status={status} /> : " "}</span>
          </div>
          <div className="flex flex-col gap-1 text-xs font-medium text-slate">
            Final rating
            <span className="text-sm font-semibold text-night">{d?.finalRating ? `${d.finalRating.rating}` : "Not yet assessed"}</span>
            <span className="font-normal">MBO Panel / RemCo only</span>
            <span aria-disabled="true" title="Coming soon" className="mt-1 cursor-not-allowed font-semibold text-slate">Past results →</span>
          </div>
        </section>

        {!d ? (
          <div className="flex flex-col gap-4">{[0, 1].map((i) => <div key={i} className="h-40 animate-pulse rounded-md bg-mist" />)}</div>
        ) : status === "awaiting-acceptance" ? (
          <ReviewTargets d={d} period={period} onDone={() => setReload((n) => n + 1)} />
        ) : status === "changes-requested" ? (
          <div className="rounded bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">You asked your manager to change these targets</p>
            <p className="mt-1 whitespace-pre-line">&ldquo;{d.assignment.changeRequest}&rdquo;</p>
            <p className="mt-2 text-amber-800">They&apos;ll send revised targets for you to review.</p>
          </div>
        ) : !accepted ? (
          <div className="rounded-md border border-dashed border-slate/40 px-5 py-12 text-center">
            <p className="text-sm font-semibold text-night">No targets for {period} yet</p>
            <p className="mt-1 text-sm text-slate">Your manager hasn&apos;t sent your MBO targets for this period. You&apos;ll be able to review and accept them here.</p>
          </div>
        ) : (
          <>
            <Objectives d={d} />
            <div className="grid gap-5 lg:grid-cols-2">
              <Attention d={d} />
              <Guidance />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
