"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { big, Filter } from "@/components/client-list";
import { Chip, escalationSla, EVIDENCE, formatValue } from "@/components/mbo";
import { Label, PageHeader, PANEL, Select, useRows } from "@/components/ui";
import {
  getReview, listReviewable, periodEnded, PERIODS, RATING_LABELS, requestEvidence, saveReview,
  type Objective, type Review, type ReviewBundle, type ReviewStatus,
} from "@/lib/api/mbo";
import { indicatedRating } from "@/lib/mbo-bands";

const REVIEW_STATUS: Record<ReviewStatus, { label: string; tone: string }> = {
  "not-started": { label: "Not started", tone: "bg-mist text-slate" },
  draft: { label: "Draft", tone: "bg-amber-100 text-amber-800" },
  finalized: { label: "Finalized · not released", tone: "bg-sky-100 text-sky-800" },
  released: { label: "Released to employee", tone: "bg-teal/10 text-[#00857d]" },
};

const area = "w-full rounded border bg-white px-3 py-2 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-mist";
const border = (bad?: string) => (bad ? "border-red-400" : "border-slate/40");
const primary = "h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40";
const secondary = "h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40";
const radio = "size-4 shrink-0 appearance-none rounded-full border border-slate/60 bg-white transition checked:border-[5px] checked:border-navy";
const RATING_OPTIONS = [{ value: "", label: "Select final rating" }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} · ${RATING_LABELS[5 - n]}` }))];

type Errors = Partial<Record<string, string>>;

function validateFinal(b: ReviewBundle, r: Review): Errors {
  const e: Errors = {};
  for (const o of b.template.objectives) {
    const x = r.ratings[o.id];
    if (!x?.rating) e[`${o.id}.rating`] = "Select a final rating.";
    if (!x?.rationale.trim()) e[`${o.id}.rationale`] = "Record the rationale for this rating.";
  }
  if (r.gate.breach === undefined) e.gate = "Record whether any compliance breach applies.";
  else if (r.gate.breach && !r.gate.note.trim()) e.gateNote = "Describe the breach and how it gates performance.";
  return e;
}

function indicated(o: Objective, b: ReviewBundle) {
  if (o.kind !== "revenue" && o.kind !== "count") return null;
  const t = b.assignment.targets.find((x) => x.objectiveId === o.id)?.target;
  const a = b.progress.find((x) => x.objectiveId === o.id)?.actual;
  if (!t || a === undefined) return null;
  return { target: t, actual: a, pct: (a / t) * 100, rating: indicatedRating(o.kind, t, a) };
}

/** The employee's escalations for the period — the record the escalation objective is rated on. */
function EscalationRecord({ b }: { b: ReviewBundle }) {
  const sent = b.escalations.filter((e) => e.submittedAt);
  const onTime = sent.filter((e) => escalationSla(e).label === "Within SLA").length;
  const unsent = b.escalations.length - sent.length;
  return (
    <div className="mt-1 flex flex-col gap-1.5 rounded border border-slate/20 p-2.5">
      <p className="font-semibold text-night">Escalation record</p>
      {b.escalations.length === 0 ? <p className="text-slate">No escalations logged this period.</p> : (
        <>
          <p className="text-night/80">
            {sent.length} sent · <span className="font-semibold text-[#00857d]">{onTime} within SLA</span>
            {sent.length - onTime > 0 && <> · <span className="font-semibold text-red-700">{sent.length - onTime} late</span></>}
            {unsent > 0 && <> · <span className="font-semibold text-amber-800">{unsent} never sent</span></>}
          </p>
          <ul className="flex flex-col gap-1">
            {b.escalations.map((e) => {
              const s = escalationSla(e);
              return (
                <li key={e.id} className="flex items-start justify-between gap-2">
                  <span className="text-night/80">{e.title}{e.l4 ? " · L4" : ""}</span>
                  <Chip tone={s.tone}>{e.submittedAt ? s.label : "Draft"}</Chip>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function EvidenceCell({ b, o, locked, onRequested }: { b: ReviewBundle; o: Objective; locked: boolean; onRequested: () => void }) {
  const p = b.progress.find((x) => x.objectiveId === o.id);
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div className="flex flex-col gap-2 text-xs">
      {p && <span><Chip tone={EVIDENCE[p.evidence].tone}>{EVIDENCE[p.evidence].label}</Chip></span>}
      <span className="text-night/80">{b.evidenceCount[o.id] ?? 0} supporting record{b.evidenceCount[o.id] === 1 ? "" : "s"}</span>
      {p?.note && <span className="text-night/70">{p.note}</span>}
      {o.id === "escalation" && <EscalationRecord b={b} />}
      {!locked && !sent && (asking ? (
        <div className="flex flex-col gap-2">
          <textarea rows={2} autoFocus className={`${area} border-slate/40 text-xs`} placeholder="What's needed?" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className="h-8 rounded border border-slate/40 px-3 font-medium text-navy hover:bg-mist" onClick={() => { setAsking(false); setMsg(""); }}>Cancel</button>
            <button type="button" disabled={!msg.trim()} className="h-8 rounded bg-navy px-3 font-semibold text-white disabled:opacity-40"
              onClick={async () => { await requestEvidence(b.member.id, b.assignment.period, o.id, msg.trim()); setSent(true); onRequested(); }}>Send request</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAsking(true)} className="self-start font-semibold text-navy hover:underline">+ Request more evidence</button>
      ))}
      {sent && <span className="text-[#00857d]">Request sent to {b.member.name}.</span>}
    </div>
  );
}

function ReviewForm({ b, onChanged }: { b: ReviewBundle; onChanged: (status?: ReviewStatus) => void }) {
  const [r, setR] = useState<Review>(b.review);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState<null | "draft" | "finalize" | "release">(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const ended = periodEnded(b.assignment.period);
  const locked = r.status === "finalized" || r.status === "released";
  const e = tried ? validateFinal(b, r) : {};

  const setRating = (id: string, patch: Partial<Review["ratings"][string]>) =>
    setR((x) => ({ ...x, ratings: { ...x.ratings, [id]: { ...x.ratings[id], ...patch } } }));

  const rated = b.template.objectives.filter((o) => r.ratings[o.id]?.rating);
  const weighted = rated.length === b.template.objectives.length
    ? b.template.objectives.reduce((s, o) => s + (o.weight * r.ratings[o.id].rating!) / 100, 0) : null;

  async function save(mode: "draft" | "finalize" | "release") {
    setError(""); setNotice("");
    if (mode === "finalize") {
      setTried(true);
      if (Object.keys(validateFinal(b, r)).length) {
        requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
        return;
      }
      if (!confirm(`Finalize ${b.member.name}'s ${b.assignment.period} assessment? Ratings lock once finalized.`)) return;
    }
    if (mode === "release" && !confirm(`Release final results to ${b.member.name}? They'll see ratings and rationale.`)) return;
    setBusy(mode);
    try {
      const saved = await saveReview(r, mode);
      setR(saved);
      onChanged(saved.status);
      setNotice(mode === "draft" ? "Draft saved." : mode === "finalize" ? "Assessment finalized. Release it when the Panel is ready." : `Results released to ${b.member.name}.`);
    } catch (x) {
      setError(x instanceof Error ? x.message : "Couldn't save. Please try again.");
    } finally { setBusy(null); }
  }

  return (
    <div className="flex flex-col gap-6">
      {!ended && (
        <p className="rounded bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The {b.assignment.period} review period runs to 31 Dec {b.assignment.period}. You can draft ratings now; finalizing needs the full year&apos;s evidence.
        </p>
      )}

      <section className="overflow-x-auto rounded-md border border-slate/25">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-label/60 text-left text-xs text-slate">
            <tr>
              <th className="w-[34%] py-2.5 pr-3 pl-5 font-medium">Objective · {ended ? "full-year" : "year-to-date"} result</th>
              <th className="w-[24%] px-3 py-2.5 font-medium">Evidence</th>
              <th className="py-2.5 pr-5 pl-3 font-medium">Final rating · MBO Panel / RemCo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate/15">
            {b.template.objectives.map((o) => {
              const ind = indicated(o, b);
              const x = r.ratings[o.id] ?? { rationale: "" };
              const t = b.assignment.targets.find((y) => y.objectiveId === o.id);
              const differs = ind && x.rating && x.rating !== ind.rating;
              return (
                <tr key={o.id} className="align-top">
                  <td className="py-4 pr-3 pl-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-semibold text-night">{o.title}</p>
                      <span className="text-xs font-semibold text-navy">{o.weight}%</span>
                    </div>
                    {ind ? (
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                        <dt className="text-slate">Target</dt><dd className="text-night tabular-nums">{formatValue(o, ind.target)}</dd>
                        <dt className="text-slate">Actual</dt><dd className="font-semibold text-night tabular-nums">{formatValue(o, ind.actual)}</dd>
                        <dt className="text-slate">Attainment</dt><dd className="font-semibold text-[#00857d] tabular-nums">{ind.pct.toFixed(1)}%</dd>
                        <dt className="text-slate">Bands indicate</dt><dd className="text-night">{ind.rating} · {RATING_LABELS[5 - ind.rating]}</dd>
                      </dl>
                    ) : (
                      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-night/80">
                        {t?.commitments.map((c) => <li key={c}>{c}</li>)}
                      </ul>
                    )}
                  </td>
                  <td className="px-3 py-4"><EvidenceCell b={b} o={o} locked={locked} onRequested={onChanged} /></td>
                  <td className="py-4 pr-5 pl-3">
                    <div className="flex flex-col gap-3">
                      <Select label={`Final rating for ${o.title}`} className={`${big} ${e[`${o.id}.rating`] ? "[&_select]:border-red-400" : ""}`}
                        disabled={locked} invalid={!!e[`${o.id}.rating`]} value={x.rating ? String(x.rating) : ""}
                        onChange={(v) => setRating(o.id, { rating: v ? Number(v) : undefined })} options={RATING_OPTIONS} />
                      {e[`${o.id}.rating`] && <span className="-mt-2 text-xs text-red-600">{e[`${o.id}.rating`]}</span>}
                      <Label text="Rationale" required error={e[`${o.id}.rationale`]}
                        hint={differs ? `Differs from the indicated ${ind!.rating} — explain why.` : o.criteria ? `Criteria for 3: ${o.criteria[2]}` : undefined}>
                        <textarea rows={2} disabled={locked} aria-invalid={!!e[`${o.id}.rationale`]} className={`${area} ${border(e[`${o.id}.rationale`])}`}
                          value={x.rationale} onChange={(ev) => setRating(o.id, { rationale: ev.target.value })} />
                      </Label>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-md border border-slate/25 p-5">
          <h2 className="text-[15px] font-semibold text-navy">Compliance gate<span className="text-red-600"> *</span></h2>
          <p className="mt-1 text-xs text-slate">Identity, KYC, high-risk flow and Chapter 14A rules aren&apos;t a weighted objective, but a breach can gate overall performance.</p>
          <div className="mt-3 flex flex-col gap-2" role="radiogroup" aria-invalid={!!e.gate}>
            {([[false, "No breach recorded for the period"], [true, "Breach recorded — gates overall performance"]] as const).map(([v, label]) => (
              <label key={String(v)} className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2.5 text-sm ${r.gate.breach === v ? "border-navy bg-label/50" : "border-slate/40 hover:bg-mist"} ${locked ? "pointer-events-none opacity-70" : ""}`}>
                <input type="radio" name="gate" className={radio} checked={r.gate.breach === v} disabled={locked} onChange={() => setR((x) => ({ ...x, gate: { ...x.gate, breach: v } }))} />
                {label}
              </label>
            ))}
            {e.gate && <span className="text-xs text-red-600">{e.gate}</span>}
          </div>
          {r.gate.breach && (
            <div className="mt-3">
              <Label text="Breach details" required error={e.gateNote}>
                <textarea rows={2} disabled={locked} aria-invalid={!!e.gateNote} className={`${area} ${border(e.gateNote)}`}
                  value={r.gate.note} onChange={(ev) => setR((x) => ({ ...x, gate: { ...x.gate, note: ev.target.value } }))} />
              </Label>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-md border border-slate/25 p-5">
          <h2 className="text-[15px] font-semibold text-navy">Overall</h2>
          <div className="flex items-baseline justify-between gap-3 rounded bg-label/50 px-4 py-3">
            <span className="text-xs text-night/80">Weighted average of ratings</span>
            <span className="text-xl font-semibold text-night tabular-nums">{weighted === null ? `${rated.length} / ${b.template.objectives.length} rated` : weighted.toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate">Indicative only — the Panel hasn&apos;t confirmed how (or whether) an overall score is used.</p>
          <Label text="Overall comment (optional)">
            <textarea rows={2} disabled={locked} className={`${area} border-slate/40`} value={r.overallComment} onChange={(ev) => setR((x) => ({ ...x, overallComment: ev.target.value }))} />
          </Label>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
        {error ? <p role="alert" className="mr-auto text-sm text-red-600">{error}</p>
          : notice ? <p role="status" className="mr-auto text-sm text-[#00857d]">{notice}</p>
          : tried && Object.keys(e).length ? <p role="alert" className="mr-auto text-sm text-red-600">Complete every rating, rationale and the compliance gate before finalizing.</p>
          : <p className="mr-auto text-xs text-slate">{r.status === "released" ? `Released ${new Date(r.releasedAt!).toLocaleDateString("en-GB")}. Ratings are final.` : r.status === "finalized" ? "Finalized ratings are locked. Releasing makes them visible to the employee." : "Ratings stay private to the Panel until released."}</p>}
        {!locked && (
          <>
            <button type="button" className={secondary} disabled={!!busy} onClick={() => save("draft")}>{busy === "draft" ? "Saving…" : "Save draft"}</button>
            <button type="button" className={primary} disabled={!!busy || !ended} title={ended ? undefined : "Available after the review period ends"} onClick={() => save("finalize")}>
              {busy === "finalize" ? "Finalizing…" : "Finalize assessment"}
            </button>
          </>
        )}
        {r.status === "finalized" && (
          <button type="button" className={primary} disabled={!!busy} onClick={() => save("release")}>{busy === "release" ? "Releasing…" : "Release to employee"}</button>
        )}
      </div>
    </div>
  );
}

function ReviewPageInner() {
  const sp = useSearchParams();
  const [period, setPeriod] = useState(sp.get("period") ?? "2025");
  const [picked, setPicked] = useState(sp.get("member") ?? "");
  const [tick, setTick] = useState(0);
  const [saved, setSaved] = useState<Record<string, ReviewStatus>>({}); // status after saves on this page
  const list = useRows(() => listReviewable(period), [period, tick]);
  // Keep the current selection while the list reloads (after a save) so the form isn't torn down.
  const memberId = !list ? picked : list.some((x) => x.member.id === picked) ? picked : list[0]?.member.id ?? "";
  if (list && memberId !== picked) setPicked(memberId);
  const bundle = useRows(async () => (memberId ? [await getReview(memberId, period)] : [null]), [memberId, period]);
  const b = bundle?.[0];

  return (
    <div>
      <PageHeader title="Review & Final Assessment">
        <Chip tone="bg-label text-navy">MBO Panel / RemCo view</Chip>
        {b && (() => { const st = saved[`${b.member.id}|${period}`] ?? b.review.status; return <Chip tone={REVIEW_STATUS[st].tone}>{REVIEW_STATUS[st].label}</Chip>; })()}
      </PageHeader>

      <div className={`${PANEL} flex flex-col gap-6`}>
        <section className="grid gap-x-5 gap-y-4 border-b border-slate/20 pb-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)]">
          <Filter label="Review period"><Select label="Review period" className={big} value={period} onChange={(v) => { setPeriod(v); setPicked(""); }} options={PERIODS} /></Filter>
          <Filter label="Employee">
            <Select label="Employee" className={big} value={memberId} onChange={setPicked}
              options={list?.length ? list.map((x) => ({ value: x.member.id, label: `${x.member.name} — ${REVIEW_STATUS[x.status].label}` })) : [{ value: "", label: list ? "No accepted targets for this period" : "Loading…" }]} />
          </Filter>
          <div className="flex flex-col gap-1.5 text-xs font-medium text-slate">
            Role
            <span className="flex min-h-9 items-center rounded bg-label/60 px-3 text-sm font-semibold text-navy">{b?.template.label ?? "—"}</span>
          </div>
        </section>

        {list && !list.length ? (
          <div className="rounded-md border border-dashed border-slate/40 px-5 py-12 text-center text-sm text-slate">
            No employee has accepted targets for {period}, so there&apos;s nothing to assess.
          </div>
        ) : !b ? (
          <div className="h-64 animate-pulse rounded-md bg-mist" />
        ) : (
          <ReviewForm key={`${b.member.id}|${period}`} b={b} onChanged={(st) => { if (st) setSaved((x) => ({ ...x, [`${b.member.id}|${period}`]: st })); setTick((n) => n + 1); }} />
        )}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return <Suspense><ReviewPageInner /></Suspense>;
}
