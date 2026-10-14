"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Chip, escalationSla } from "@/components/mbo";
import { BackButton, Label, PageHeader, PANEL, Select, useRows } from "@/components/ui";
import { defaultL4, getCurrentUserId, getEscalation, getMyMbo, L4_RECIPIENTS, recipientsFor, saveEscalation, type Escalation, type Objective } from "@/lib/api/mbo";
import { CATEGORY_LABEL, isMaterialVariance, slaDueDate, VARIANCE_THRESHOLD, variancePct, type EscalationCategory } from "@/lib/mbo-sla";

const field = "h-10 w-full rounded border bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20";
const area = "w-full rounded border bg-white px-3 py-2 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20";
const border = (bad?: string) => (bad ? "border-red-400" : "border-slate/40");
const primary = "h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40";
const secondary = "flex h-10 items-center rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40";
const MAX_MB = 10;

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const parseNum = (s: string) => { const d = s.replace(/[^\d]/g, ""); return d ? Number(d) : undefined; };
const money = (n?: number) => (n === undefined ? "" : n.toLocaleString("en-US"));

type Errors = Partial<Record<string, string>>;
type Form = Omit<Escalation, "comparison"> & { comparison: { from: string; to: string; expected?: number; actual?: number } };

const blank = (period: string, owner: string, objectiveId?: string): Form => ({
  id: `esc-${Date.now()}`, memberId: getCurrentUserId(), l4: defaultL4(), period, status: "draft", category: "variance", objectiveId, title: "", discovered: today(),
  comparison: { from: "", to: "" }, impact: "", rootCause: "", recovery: "", owner, attachments: [], reference: "", recipients: recipientsFor(defaultL4()),
});

function validate(f: Form, submit: boolean): Errors {
  const e: Errors = {};
  if (!f.title.trim()) e.title = "Give the issue a short title.";
  if (!submit) return e; // drafts only need a title
  if (!f.discovered) e.discovered = "Enter the date you discovered the issue.";
  else if (f.discovered > today()) e.discovered = "Can't be in the future.";
  if (f.category === "variance") {
    const c = f.comparison;
    if (!c.from || !c.to) e.period = "Enter the comparison period.";
    else if (c.from > c.to) e.period = "Start must be before end.";
    if (!c.expected) e.expected = "Enter the expected amount for the period.";
    if (c.actual === undefined) e.actual = "Enter the actual amount for the period.";
  }
  if (!f.impact.trim()) e.impact = "Describe the business or relationship impact.";
  if (!f.rootCause.trim()) e.rootCause = "Explain the root cause, or what's still under investigation.";
  if (!f.recovery.trim()) e.recovery = "Set out the recovery actions or support needed.";
  if (!f.owner.trim()) e.owner = "Name who follows up.";
  if (f.followUp && f.followUp < f.discovered) e.followUp = "Follow-up can't be before the discovery date.";
  return e;
}

function Side({ f }: { f: Form }) {
  const l4 = f.category === "bank-risk" && f.l4;
  const due = slaDueDate(f.category, f.discovered || today());
  const s = escalationSla({ ...f, comparison: undefined } as Escalation);
  const c = f.comparison;
  const pct = c.expected && c.actual !== undefined ? variancePct(c.expected, c.actual) : null;
  return (
    <div className="flex flex-col gap-5 lg:sticky lg:top-24">
      <section className="rounded-md border border-slate/25 p-5 text-sm">
        <h2 className="mb-3 text-[15px] font-semibold text-navy">Deadline</h2>
        <p className="text-xs text-slate">{f.category === "bank-risk" ? "Bank-relationship risk: escalate immediately" : "Written escalation within 3 business days of discovery"}</p>
        <p className="mt-1 text-lg font-semibold text-night">{f.discovered ? fmtDate(due) : "—"}</p>
        <p className="mt-2"><Chip tone={s.tone}>{s.label}</Chip></p>
        <p className="mt-3 text-xs text-slate">Don&apos;t wait for complete evidence. Send what you know and add the rest later. Business days exclude weekends; public holidays aren&apos;t counted yet.</p>
      </section>

      {f.category === "variance" && (
        <section className="rounded-md border border-slate/25 p-5 text-sm">
          <h2 className="mb-3 text-[15px] font-semibold text-navy">Variance</h2>
          {pct === null ? <p className="text-xs text-slate">Enter expected and actual amounts to calculate it.</p> : (
            <>
              <p className={`text-2xl font-semibold tabular-nums ${isMaterialVariance(pct) ? "text-red-600" : "text-night"}`}>{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</p>
              <p className="text-xs text-slate">HKD {money(c.actual)} actual vs HKD {money(c.expected)} expected</p>
              <p className={`mt-3 rounded px-2.5 py-2 text-xs ${isMaterialVariance(pct) ? "bg-red-50 text-red-800" : "bg-mist text-night/80"}`}>
                {isMaterialVariance(pct)
                  ? `Material variance (≥${VARIANCE_THRESHOLD}%). A written escalation is required.`
                  : `Below the ${VARIANCE_THRESHOLD}% threshold, so escalation isn't required. You can still raise it.`}
              </p>
            </>
          )}
        </section>
      )}

      <section className="rounded-md border border-slate/25 p-5 text-sm">
        <h2 className="mb-2 text-[15px] font-semibold text-navy">Sent to</h2>
        <ul className="flex flex-col gap-1">
          {recipientsFor(l4).map((r, i) => (
            <li key={r} className="flex items-baseline justify-between gap-3">
              <span className="font-medium text-night">{r}</span>
              <span className="text-xs text-slate">{i === 0 ? "Your manager" : "L4"}</span>
            </li>
          ))}
        </ul>
        {f.category === "bank-risk" && <p className="mt-2 text-xs text-slate">Also call them — bank risk can&apos;t wait for email.</p>}
      </section>
    </div>
  );
}

function EscalationForm({ initial, objectives, period }: { initial: Form; objectives: Objective[]; period: string }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(initial);
  const [tried, setTried] = useState<null | "draft" | "submit">(null);
  const [saving, setSaving] = useState<null | "draft" | "submit">(null);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const setC = (k: keyof Form["comparison"], v: string | number | undefined) => setF((x) => ({ ...x, comparison: { ...x.comparison, [k]: v } }));
  const e = tried ? validate(f, tried === "submit") : {};

  async function save(mode: "draft" | "submit") {
    setTried(mode);
    if (Object.keys(validate(f, mode === "submit")).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    setSaving(mode); setError("");
    const c = f.comparison;
    try {
      await saveEscalation({
        ...f, title: f.title.trim(), owner: f.owner.trim(),
        l4: f.category === "bank-risk" && f.l4, recipients: recipientsFor(f.category === "bank-risk" && f.l4),
        comparison: f.category === "variance" && c.expected !== undefined && c.actual !== undefined ? { from: c.from, to: c.to, expected: c.expected, actual: c.actual } : undefined,
      }, mode === "submit");
      router.push(`/bd/web/mbo/escalations?period=${period}`);
    } catch {
      setError("Couldn't save. Please try again."); setSaving(null);
    }
  }

  function addFiles(list: FileList | null) {
    const picked = Array.from(list ?? []);
    const big = picked.filter((x) => x.size > MAX_MB * 1024 * 1024);
    set("attachments", [...f.attachments, ...picked.filter((x) => x.size <= MAX_MB * 1024 * 1024).map((x) => ({ name: x.name, size: x.size }))]);
    setFileError(big.length ? `${big.map((x) => x.name).join(", ")} over ${MAX_MB} MB.` : "");
  }

  return (
    <form noValidate onSubmit={(ev) => { ev.preventDefault(); save("submit"); }} className="flex flex-col gap-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <h2 className="text-[15px] font-semibold text-navy">The issue</h2>
            <fieldset>
              <legend className="mb-1.5 text-xs font-medium text-night/70">Category<span className="text-red-600"> *</span></legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(CATEGORY_LABEL) as EscalationCategory[]).map((k) => (
                  <label key={k} className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2.5 text-sm ${f.category === k ? "border-navy bg-label/50 text-night" : "border-slate/40 text-night/80 hover:bg-mist"}`}>
                    <input type="radio" name="category" checked={f.category === k} onChange={() => set("category", k)}
                      className="size-4 shrink-0 appearance-none rounded-full border border-slate/60 bg-white transition checked:border-[5px] checked:border-navy focus-visible:ring-2 focus-visible:ring-teal/40" />
                    {CATEGORY_LABEL[k]}
                  </label>
                ))}
              </div>
              {f.category === "bank-risk" && (
                <label className="mt-3 flex items-start gap-2 rounded bg-label/50 px-3 py-2.5 text-sm text-night">
                  <input type="checkbox" className="mt-0.5 size-4 accent-navy" checked={f.l4} onChange={(x) => set("l4", x.target.checked)} />
                  <span>
                    <span className="font-medium">Escalate as L4</span> — the issue could jeopardise the bank relationship.
                    <span className="block text-xs text-slate">Also goes to {L4_RECIPIENTS.join(", ")}, immediately.</span>
                  </span>
                </label>
              )}
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label text="Issue title" required error={e.title}>
                <input className={`${field} ${border(e.title)}`} aria-invalid={!!e.title} placeholder="e.g. Q3 revenue 12% below plan"
                  value={f.title} onChange={(x) => set("title", x.target.value)} />
              </Label>
              <Label text="Linked objective">
                <Select label="Linked objective" className="[&_select]:h-10 [&_select]:text-sm" value={f.objectiveId ?? ""} onChange={(v) => set("objectiveId", v || undefined)}
                  options={[{ value: "", label: "Not linked to an objective" }, ...objectives.map((o) => ({ value: o.id, label: o.title }))]} />
              </Label>
              <Label text="Date discovered" required error={e.discovered}>
                <input type="date" max={today()} className={`${field} ${border(e.discovered)}`} aria-invalid={!!e.discovered}
                  value={f.discovered} onChange={(x) => set("discovered", x.target.value)} />
              </Label>
              <Label text="Time discovered (if known)">
                <input type="time" className={`${field} border-slate/40`} value={f.discoveredTime ?? ""} onChange={(x) => set("discoveredTime", x.target.value || undefined)} />
              </Label>
            </div>
          </section>

          {f.category === "variance" && (
            <section className="flex flex-col gap-4 border-t border-slate/20 pt-6">
              <div>
                <h2 className="text-[15px] font-semibold text-navy">Comparison basis</h2>
                <p className="mt-0.5 text-xs text-slate">Expected and actual for the same period, from your forecast or monthly target, not the annual target.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Label text="Period from" required error={e.period}>
                  <input type="date" className={`${field} ${border(e.period)}`} aria-invalid={!!e.period} value={f.comparison.from} onChange={(x) => setC("from", x.target.value)} />
                </Label>
                <Label text="Period to" required>
                  <input type="date" max={today()} className={`${field} ${border(e.period)}`} value={f.comparison.to} onChange={(x) => setC("to", x.target.value)} />
                </Label>
                <Label text="Expected for the period (HKD)" required error={e.expected}>
                  <input inputMode="numeric" className={`${field} tabular-nums ${border(e.expected)}`} aria-invalid={!!e.expected}
                    value={money(f.comparison.expected)} onChange={(x) => setC("expected", parseNum(x.target.value))} />
                </Label>
                <Label text="Actual for the period (HKD)" required error={e.actual}>
                  <input inputMode="numeric" className={`${field} tabular-nums ${border(e.actual)}`} aria-invalid={!!e.actual}
                    value={money(f.comparison.actual)} onChange={(x) => setC("actual", parseNum(x.target.value))} />
                </Label>
              </div>
            </section>
          )}

          <section className="flex flex-col gap-4 border-t border-slate/20 pt-6">
            <h2 className="text-[15px] font-semibold text-navy">Impact & recovery</h2>
            <Label text="Impact" required error={e.impact} hint="What's affected — revenue, client, bank relationship — and by how much.">
              <textarea rows={3} className={`${area} ${border(e.impact)}`} aria-invalid={!!e.impact} value={f.impact} onChange={(x) => set("impact", x.target.value)} />
            </Label>
            <Label text="Root cause" required error={e.rootCause} hint="Mark anything still under investigation.">
              <textarea rows={2} className={`${area} ${border(e.rootCause)}`} aria-invalid={!!e.rootCause} value={f.rootCause} onChange={(x) => set("rootCause", x.target.value)} />
            </Label>
            <Label text="Recovery actions / support needed" required error={e.recovery}>
              <textarea rows={2} className={`${area} ${border(e.recovery)}`} aria-invalid={!!e.recovery} value={f.recovery} onChange={(x) => set("recovery", x.target.value)} />
            </Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label text="Who follows up" required error={e.owner}>
                <input className={`${field} ${border(e.owner)}`} aria-invalid={!!e.owner} placeholder="Name / role" value={f.owner} onChange={(x) => set("owner", x.target.value)} />
              </Label>
              <Label text="Follow-up date" error={e.followUp}>
                <input type="date" className={`${field} ${border(e.followUp)}`} aria-invalid={!!e.followUp} value={f.followUp ?? ""} onChange={(x) => set("followUp", x.target.value || undefined)} />
              </Label>
            </div>
          </section>

          <section className="flex flex-col gap-4 border-t border-slate/20 pt-6">
            <h2 className="text-[15px] font-semibold text-navy">Supporting evidence</h2>
            <div className="rounded border border-dashed border-slate/50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="mr-auto text-sm">
                  <p className="font-medium text-night">{f.attachments.length ? `${f.attachments.length} file${f.attachments.length > 1 ? "s" : ""} attached` : "No files attached"}</p>
                  <p className="text-xs text-slate">Optional · up to {MAX_MB} MB each</p>
                </div>
                <label className="flex h-9 cursor-pointer items-center rounded border border-navy px-4 text-sm font-medium text-navy hover:bg-mist">
                  Choose files
                  <input type="file" multiple className="sr-only" onChange={(x) => { addFiles(x.target.files); x.target.value = ""; }} />
                </label>
              </div>
              {f.attachments.length > 0 && (
                <ul className="mt-3 divide-y divide-slate/15 border-t border-slate/15">
                  {f.attachments.map((a, i) => (
                    <li key={a.name + i} className="flex items-center gap-3 py-2 text-sm">
                      <span className="mr-auto truncate">{a.name}</span>
                      <button type="button" onClick={() => set("attachments", f.attachments.filter((_, j) => j !== i))} className="h-7 rounded px-2 text-xs font-semibold text-red-600 hover:bg-red-50">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
              {fileError && <p className="mt-2 text-xs text-red-600">{fileError}</p>}
            </div>
            <Label text="Source record / reference" hint="e.g. forecast file, CRM report or bank correspondence reference.">
              <input className={`${field} border-slate/40`} value={f.reference} onChange={(x) => set("reference", x.target.value)} />
            </Label>
          </section>
        </div>

        <Side f={f} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
        {error ? <p role="alert" className="mr-auto text-sm text-red-600">{error}</p>
          : <p className="mr-auto text-xs text-slate">A saved draft is not a written escalation — submit it to {recipientsFor(f.category === "bank-risk" && f.l4).join(", ")} within the deadline.</p>}
        <Link href={`/bd/web/mbo/escalations?period=${period}`} className={secondary}>Cancel</Link>
        <button type="button" className={secondary} disabled={!!saving} onClick={() => save("draft")}>{saving === "draft" ? "Saving…" : "Save draft"}</button>
        <button className={primary} disabled={!!saving}>{saving === "submit" ? "Submitting…" : "Submit escalation"}</button>
      </div>
    </form>
  );
}

function RaiseEscalation() {
  const sp = useSearchParams();
  const period = sp.get("period") ?? "2026";
  const draftId = sp.get("draft");
  const objectiveId = sp.get("objective") ?? undefined;
  const rows = useRows(async () => {
    const [mbo, draft] = await Promise.all([getMyMbo(period), draftId ? getEscalation(draftId) : null]);
    return [{ objectives: mbo.template.objectives, owner: mbo.member.name, draft }];
  }, [period, draftId]);
  const data = rows?.[0];
  const initial: Form | null = data
    ? data.draft && data.draft.status === "draft"
      ? { ...data.draft, comparison: data.draft.comparison ?? { from: "", to: "" } }
      : blank(period, data.owner, objectiveId)
    : null;

  return (
    <div>
      <PageHeader title={draftId ? "Continue Escalation" : "Raise Escalation"}>
        <BackButton href={`/bd/web/mbo/escalations?period=${period}`} to="My Escalations" />
      </PageHeader>
      <div className={PANEL}>
        {!initial ? <div className="h-64 animate-pulse rounded-md bg-mist" /> : (
          <EscalationForm key={initial.id} initial={initial} objectives={data!.objectives} period={period} />
        )}
      </div>
    </div>
  );
}

export default function RaiseEscalationPage() {
  return <Suspense><RaiseEscalation /></Suspense>;
}
