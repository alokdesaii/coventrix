"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Chip, formatValue } from "@/components/mbo";
import { BackButton, PageHeader, PANEL, useRows } from "@/components/ui";
import { acknowledgeResults, getMyResults, listMyHistory, RATING_LABELS, type HistoryEntry, type ReviewBundle } from "@/lib/api/mbo";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// Rating chip tones: 4–5 teal, 3 navy-tint, 1–2 amber/red.
const RATING_TONE = ["", "bg-red-100 text-red-700", "bg-amber-100 text-amber-800", "bg-label text-navy", "bg-teal/10 text-[#00857d]", "bg-teal/15 text-[#00857d]"];

const HISTORY_LABEL: Record<HistoryEntry["status"], { label: string; tone: string }> = {
  released: { label: "Released", tone: "bg-teal/10 text-[#00857d]" },
  "in-progress": { label: "In progress", tone: "bg-sky-100 text-sky-800" },
  "no-targets": { label: "No targets", tone: "bg-mist text-slate" },
};

function Results({ b, onAck }: { b: ReviewBundle; onAck: (at: string) => void }) {
  const r = b.review;
  const [ackAt, setAckAt] = useState(r.acknowledgedAt);
  const [busy, setBusy] = useState(false);
  const objectives = b.template.objectives;
  const weighted = objectives.reduce((s, o) => s + (o.weight * (r.ratings[o.id]?.rating ?? 0)) / 100, 0);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-x-6 gap-y-4 border-b border-slate/20 pb-6 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs font-medium text-slate">Released</p>
          <p className="mt-1 text-sm font-semibold text-night">{fmtDate(r.releasedAt!)}</p>
          <p className="text-xs text-slate">by the MBO Panel / RemCo</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate">Weighted average of ratings</p>
          <p className="mt-1 text-sm font-semibold text-night tabular-nums">{weighted.toFixed(2)}</p>
          <p className="text-xs text-slate">Indicative · not a separate rating</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate">Compliance gate</p>
          <p className="mt-1">
            <Chip tone={r.gate.breach ? "bg-red-100 text-red-700" : "bg-teal/10 text-[#00857d]"}>{r.gate.breach ? "Breach recorded" : "No breach recorded"}</Chip>
          </p>
          {r.gate.breach && <p className="mt-1 text-xs text-night/80">{r.gate.note}</p>}
        </div>
        <div>
          <p className="text-xs font-medium text-slate">Acknowledgement</p>
          {ackAt ? (
            <p className="mt-1 text-sm font-semibold text-[#00857d]">Acknowledged {fmtDate(ackAt)}</p>
          ) : (
            <button type="button" disabled={busy}
              onClick={async () => { setBusy(true); const at = await acknowledgeResults(b.assignment.period); setAckAt(at); setBusy(false); onAck(at); }}
              className="mt-1 h-9 rounded bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40">
              {busy ? "Saving…" : "Acknowledge results"}
            </button>
          )}
          <p className="mt-1 text-xs text-slate">Confirms you&apos;ve read them, not that you agree.</p>
        </div>
      </section>

      <section className="overflow-x-auto rounded-md border border-slate/25">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-label/60 text-left text-xs text-slate">
            <tr>
              <th className="w-[26%] py-2.5 pr-3 pl-5 font-medium">Objective</th>
              <th className="w-[22%] px-3 py-2.5 font-medium">Target · final actual</th>
              <th className="w-[18%] px-3 py-2.5 font-medium">Final rating</th>
              <th className="py-2.5 pr-5 pl-3 font-medium">Panel rationale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate/15">
            {objectives.map((o) => {
              const t = b.assignment.targets.find((x) => x.objectiveId === o.id);
              const p = b.progress.find((x) => x.objectiveId === o.id);
              const x = r.ratings[o.id];
              const numeric = o.kind === "revenue" || o.kind === "count";
              const pct = numeric && t?.target && p?.actual !== undefined ? (p.actual / t.target) * 100 : null;
              return (
                <tr key={o.id} className="align-top">
                  <td className="py-3.5 pr-3 pl-5">
                    <p className="font-semibold text-night">{o.title}</p>
                    <p className="mt-0.5 text-xs text-slate">Weight {o.weight}%</p>
                  </td>
                  <td className="px-3 py-3.5 text-xs">
                    {numeric ? (
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 whitespace-nowrap">
                        <dt className="text-slate">Target</dt><dd className="text-night tabular-nums">{formatValue(o, t?.target)}</dd>
                        <dt className="text-slate">Actual</dt><dd className="font-semibold text-night tabular-nums">{formatValue(o, p?.actual)}</dd>
                        {pct !== null && <><dt className="text-slate">Attainment</dt><dd className="font-semibold text-[#00857d] tabular-nums">{pct.toFixed(1)}%</dd></>}
                      </dl>
                    ) : (
                      <span className="text-night/80">Assessed against {t?.commitments.length ?? 0} agreed commitment{t?.commitments.length === 1 ? "" : "s"}</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    {x?.rating && <Chip tone={RATING_TONE[x.rating]}>{x.rating} · {RATING_LABELS[5 - x.rating]}</Chip>}
                  </td>
                  <td className="py-3.5 pr-5 pl-3 text-night/90">{x?.rationale}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {r.overallComment && (
        <section className="rounded-md border border-slate/25 p-5">
          <h2 className="mb-2 text-[15px] font-semibold text-navy">Overall comment from the Panel</h2>
          <p className="text-sm whitespace-pre-line text-night">{r.overallComment}</p>
        </section>
      )}
    </div>
  );
}

function ResultsPage() {
  const sp = useSearchParams();
  const [period, setPeriod] = useState(sp.get("period") ?? "");
  const [tick, setTick] = useState(0);
  const history = useRows(() => listMyHistory(), [tick]);
  // Default to the most recent released year.
  const shown = period || history?.find((h) => h.status === "released")?.period || history?.[0]?.period || "";
  const res = useRows(async () => (shown ? [await getMyResults(shown)] : [null]), [shown]);
  const b = res?.[0];
  const entry = history?.find((h) => h.period === shown);

  return (
    <div>
      <PageHeader title="Final Results & History">
        <BackButton href="/bd/web/mbo/my" to="My MBO" />
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Review history" className="rounded-md border border-slate/20 bg-white">
          <h2 className="border-b border-slate/20 px-4 py-3 text-[15px] font-semibold text-navy">Review history</h2>
          <ul className="divide-y divide-slate/15">
            {!history && <li className="px-4 py-3"><div className="h-10 animate-pulse rounded bg-mist" /></li>}
            {history?.map((h) => (
              <li key={h.period}>
                <button type="button" onClick={() => setPeriod(h.period)} aria-current={h.period === shown ? "true" : undefined}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${h.period === shown ? "bg-label/60" : "hover:bg-mist"}`}>
                  <span>
                    <span className="block text-sm font-semibold text-night">{h.period} · Annual</span>
                    <span className="block text-xs text-slate">
                      {h.status === "released" ? (h.acknowledgedAt ? `Acknowledged ${fmtDate(h.acknowledgedAt)}` : `Released ${fmtDate(h.releasedAt!)}`) : "1 Jan – 31 Dec"}
                    </span>
                  </span>
                  <Chip tone={HISTORY_LABEL[h.status].tone}>{HISTORY_LABEL[h.status].label}</Chip>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className={PANEL}>
          {!res || !history ? (
            <div className="h-64 animate-pulse rounded-md bg-mist" />
          ) : b ? (
            <Results key={shown} b={b} onAck={() => setTick((n) => n + 1)} />
          ) : (
            <div className="rounded-md border border-dashed border-slate/40 px-5 py-14 text-center">
              <p className="text-sm font-semibold text-night">No final results for {shown} yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate">
                {entry?.status === "no-targets"
                  ? "You don't have MBO targets for this period."
                  : "The MBO Panel / RemCo assesses the full year after it ends and releases results here. Track progress in My MBO until then."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><ResultsPage /></Suspense>;
}
