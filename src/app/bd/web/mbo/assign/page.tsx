"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { big, Filter } from "@/components/client-list";
import { PageHeader, PANEL, Select, useRows } from "@/components/ui";
import {
  getAssignment, listTeam, PERIODS, ROLE_TEMPLATES, saveAssignment,
  type Objective, type ObjectiveTarget, type RoleId, type TargetAssignment,
} from "@/lib/api/mbo";
import { BandGuide, FrameworkExample, STATUS, StatusChip } from "@/components/mbo";

const field = "h-10 w-full rounded border bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-mist disabled:text-slate";
const fmt = (n?: number) => (n === undefined ? "" : n.toLocaleString("en-US"));
const parse = (s: string) => { const d = s.replace(/[^\d]/g, ""); return d ? Number(d) : undefined; };

function CommitmentList({ items, onChange, disabled, placeholder }: {
  items: string[]; onChange: (v: string[]) => void; disabled: boolean; placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => { if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(""); } };
  return (
    <div className="flex flex-col gap-2">
      {items.map((c, i) => (
        <div key={i} className="flex items-start gap-2">
          <input className={`${field} border-slate/40`} value={c} disabled={disabled} aria-label={`Commitment ${i + 1}`}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          {!disabled && (
            <button type="button" aria-label={`Remove commitment ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="grid size-10 shrink-0 place-items-center rounded text-slate hover:bg-red-50 hover:text-red-600">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <div className="flex gap-2">
          <input className={`${field} border-dashed border-slate/50`} placeholder={placeholder} value={draft} aria-label="New commitment"
            onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
          <button type="button" onClick={add} aria-label="Add commitment"
            className="grid size-10 shrink-0 place-items-center rounded bg-navy text-white transition hover:bg-navy/90">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}

function ObjectiveCard({ n, o, t, set, error, locked, role }: {
  n: number; o: Objective; t: ObjectiveTarget; set: (t: ObjectiveTarget) => void; error?: string; locked: boolean; role: RoleId;
}) {
  const numeric = o.kind === "revenue" || o.kind === "count";
  return (
    <section className="overflow-hidden rounded-md border border-slate/25">
      <header className="flex items-start gap-4 border-b border-slate/20 bg-label/60 px-5 py-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-semibold text-white">{n}</span>
        <div className="mr-auto">
          <h3 className="text-[15px] font-semibold text-navy">{o.title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-night/70">{o.definition}</p>
        </div>
        <span className="shrink-0 rounded bg-white px-2.5 py-1 text-sm font-semibold text-navy tabular-nums" title="Weight is fixed by the role framework">{o.weight}%</span>
      </header>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {numeric ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-night/70">
                Annual target {o.kind === "revenue" ? "(HKD)" : `(${o.unit})`}<span className="text-red-600"> *</span>
              </span>
              <div className="relative">
                {o.kind === "revenue" && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate">HKD</span>}
                <input inputMode="numeric" disabled={locked} aria-invalid={!!error}
                  className={`${field} ${o.kind === "revenue" ? "pl-12" : ""} tabular-nums ${error ? "border-red-400" : "border-slate/40"}`}
                  placeholder={o.kind === "revenue" ? "e.g. 4,000,000" : "e.g. 2"}
                  value={fmt(t.target)} onChange={(e) => set({ ...t, target: parse(e.target.value) })} />
              </div>
              {error && <span className="text-xs text-red-600">{error}</span>}
            </label>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-night/70">
                {o.kind === "leadership" ? "Agreed leadership commitments" : "Agreed commitments"}<span className="text-red-600"> *</span>
              </span>
              <CommitmentList items={t.commitments} disabled={locked} onChange={(commitments) => set({ ...t, commitments })}
                placeholder={o.kind === "leadership" ? "Add a commitment, e.g. quarterly coaching for direct reports" : "Add a commitment"} />
              {error && <span className="text-xs text-red-600">{error}</span>}
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-night/70">Evidence expected</p>
            <p className="mt-1 text-xs leading-relaxed text-slate">{o.evidence}</p>
          </div>
          <details className="group rounded border border-slate/20 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-navy">Framework example</summary>
            <div className="mt-2"><FrameworkExample role={role} objectiveId={o.id} /></div>
          </details>
        </div>

        <div className="rounded border border-slate/20 px-4 py-3">
          <p className="mb-1 text-xs font-semibold tracking-wide text-slate uppercase">Rating guide</p>
          <BandGuide o={o} target={t.target} />
        </div>
      </div>
    </section>
  );
}

function validate(objectives: Objective[], a: TargetAssignment) {
  const errors: Record<string, string> = {};
  for (const o of objectives) {
    const t = a.targets.find((x) => x.objectiveId === o.id)!;
    if ((o.kind === "revenue" || o.kind === "count") && !t.target) errors[o.id] = "Enter an annual target greater than 0.";
    if ((o.kind === "criteria" || o.kind === "leadership") && !t.commitments.some((c) => c.trim())) errors[o.id] = "Add at least one commitment.";
  }
  return errors;
}

function AssignTargets() {
  const sp = useSearchParams();
  const [memberId, setMemberId] = useState(sp.get("member") ?? "u1");
  const [period, setPeriod] = useState(sp.get("period") ?? "2026");
  const [loaded, setLoaded] = useState<{ key: string; a: TargetAssignment } | null>(null);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState<"draft" | "send" | null>(null);
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const team = useRows(() => listTeam(), [refresh]); // reloads after a save so status labels stay current

  const key = `${memberId}|${period}`;
  useEffect(() => {
    let live = true;
    getAssignment(memberId, period).then((a) => { if (live) { setLoaded({ key, a }); setTried(false); setNotice(""); } });
    return () => { live = false; };
  }, [memberId, period, key]);

  const a = loaded?.key === key ? loaded.a : null;
  const member = team?.find((m) => m.id === memberId);
  const template = member ? ROLE_TEMPLATES[member.role] : null;
  const locked = a?.status === "accepted";
  const errors = a && template && tried ? validate(template.objectives, a) : {};

  const setTarget = (t: ObjectiveTarget) => {
    setLoaded((l) => l && { ...l, a: { ...l.a, targets: l.a.targets.map((x) => (x.objectiveId === t.objectiveId ? t : x)) } });
    setNotice("");
  };

  async function save(send: boolean) {
    if (!a || !template) return;
    if (send) {
      setTried(true);
      if (Object.keys(validate(template.objectives, a)).length) {
        requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true], input[aria-label='New commitment']")?.focus());
        return;
      }
    }
    setSaving(send ? "send" : "draft");
    const saved = await saveAssignment(a, send);
    setLoaded({ key, a: saved });
    setSaving(null);
    setRefresh((n) => n + 1);
    setNotice(send ? `Sent to ${member?.name} for acceptance.` : "Draft saved.");
  }

  const options = (team ?? []).map((m) => ({
    value: m.id,
    label: `${m.name} — ${ROLE_TEMPLATES[m.role].label}${m.status[period] !== "not-set" ? ` (${STATUS[m.status[period]].label})` : ""}`,
  }));

  return (
    <div>
      <PageHeader title="Assign MBO Targets">{a && <StatusChip status={a.status} />}</PageHeader>

      <div className={`${PANEL} flex flex-col gap-6`}>
        <section className="grid gap-x-5 gap-y-4 border-b border-slate/20 pb-6 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
          <Filter label="Team member">
            <Select label="Team member" className={big} value={memberId} onChange={setMemberId}
              options={options.length ? options : [{ value: memberId, label: "Loading…" }]} />
          </Filter>
          <Filter label="Review period">
            <Select label="Review period" className={big} value={period} onChange={setPeriod} options={PERIODS} />
          </Filter>
          <div className="flex flex-col gap-1.5 text-xs font-medium text-slate">
            Role template
            <div className="flex min-h-9 flex-col justify-center rounded bg-label/60 px-3 py-1.5">
              <span className="text-sm font-semibold text-navy">{template?.label ?? "—"}</span>
              {template && <span className="text-xs font-normal text-night/70">{template.objectives.length} objectives · 100% weight · weights fixed by framework</span>}
            </div>
          </div>
        </section>

        {locked && (
          <p className="rounded bg-teal/10 px-4 py-3 text-sm text-[#00857d]">
            {member?.name} accepted these targets. They&apos;re read-only for this period; changes need a new agreement.
          </p>
        )}
        {a?.status === "changes-requested" && (
          <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-semibold">{member?.name} asked for changes</p>
            <p className="mt-1 whitespace-pre-line">{a.changeRequest}</p>
          </div>
        )}
        {a?.status === "awaiting-acceptance" && (
          <p className="rounded bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Waiting for {member?.name} to accept. Editing and sending again replaces the version they were sent.
          </p>
        )}

        {!a || !template ? (
          <div className="flex flex-col gap-4">{[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-md bg-mist" />)}</div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {template.objectives.map((o, i) => (
                <ObjectiveCard key={o.id} n={i + 1} o={o} role={template.id} locked={locked} error={errors[o.id]}
                  t={a.targets.find((x) => x.objectiveId === o.id)!} set={setTarget} />
              ))}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-night/70">Notes for {member?.name} (optional)</span>
              <textarea rows={3} disabled={locked} value={a.notes} placeholder="Context for the employee, e.g. how the targets were set"
                onChange={(e) => setLoaded((l) => l && { ...l, a: { ...l.a, notes: e.target.value } })}
                className="w-full rounded border border-slate/40 px-3 py-2 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-mist" />
            </label>

            {!locked && (
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
                {notice && <p role="status" className="mr-auto text-sm text-[#00857d]">{notice}</p>}
                {!notice && tried && Object.keys(errors).length > 0 && (
                  <p role="alert" className="mr-auto text-sm text-red-600">Complete the highlighted objectives before sending.</p>
                )}
                {!notice && !tried && <p className="mr-auto text-xs text-slate">Final ratings are set by the MBO Panel / RemCo, not on this screen.</p>}
                <button type="button" disabled={!!saving} onClick={() => save(false)}
                  className="h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40">
                  {saving === "draft" ? "Saving…" : "Save draft"}
                </button>
                <button type="button" disabled={!!saving} onClick={() => save(true)}
                  className="h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40">
                  {saving === "send" ? "Sending…" : a.status === "awaiting-acceptance" ? "Send updated targets" : "Send for acceptance"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AssignTargetsPage() {
  return <Suspense><AssignTargets /></Suspense>;
}
