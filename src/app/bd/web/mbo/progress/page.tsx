"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { big, Filter } from "@/components/client-list";
import { Chip, EVIDENCE, formatValue, ProgressBar } from "@/components/mbo";
import { BackButton, Label, PageHeader, PANEL, Select, useRows } from "@/components/ui";
import {
  getCountItems, getObjectiveDetail, saveProgress,
  type CountItem, type ObjectiveDetail,
} from "@/lib/api/mbo";

const field = "h-10 w-full rounded border bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20";
const area = "w-full rounded border bg-white px-3 py-2 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20";
const border = (bad?: string) => (bad ? "border-red-400" : "border-slate/40");
const primary = "h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40";
const secondary = "flex h-10 items-center rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40";

const MAX_MB = 10;
const ACCEPT = ".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg,.msg,.eml";
const SOURCE_TYPES: Record<string, string[]> = {
  revenue: ["Revenue register", "Fee-income reconciliation", "Closure / origination log", "Other"],
  count: ["Partner / relationship register", "Onboarding record", "CRM stage-change record", "Meeting / progression note", "Other"],
  criteria: ["Escalation record", "Report submission", "CRM / activity report", "Coaching record", "Other"],
  leadership: ["Coaching record", "Succession plan", "Culture initiative record", "Routing record", "Other"],
};

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const parseNum = (s: string) => { const d = s.replace(/[^\d]/g, ""); return d ? Number(d) : undefined; };
const singular = (unit?: string) => unit?.replace(/ies$/, "y").replace(/s$/, "") ?? "item";

type Errors = Partial<Record<string, string>>;
const EMPTY_ITEM = { name: "", classification: "net-new" as CountItem["classification"], eventDate: "", contribution: "" };

/** Count objectives: the actual is the list of counted partners / opportunities. */
function CountItems({ unit, items, setItems, period, error }: {
  unit?: string; items: CountItem[]; setItems: (v: CountItem[]) => void; period: string; error?: string;
}) {
  const [draft, setDraft] = useState(EMPTY_ITEM);
  const [editing, setEditing] = useState<string | null>(null);
  const [errs, setErrs] = useState<Errors>({});
  const one = singular(unit);

  function commit() {
    const e: Errors = {};
    if (!draft.name.trim()) e.name = `Enter the ${one} name.`;
    if (!draft.eventDate) e.eventDate = "Enter the date of the qualifying event.";
    else if (draft.eventDate > today() || !draft.eventDate.startsWith(period)) e.eventDate = `Use a date in ${period}, not in the future.`;
    if (!draft.contribution.trim()) e.contribution = "Describe your contribution.";
    const dup = items.find((i) => i.id !== editing && i.name.trim().toLowerCase() === draft.name.trim().toLowerCase());
    if (dup) e.name = `This ${one} is already counted. Each ${one} counts once, however many events it has.`;
    setErrs(e);
    if (Object.keys(e).length) return;
    const item: CountItem = { id: editing ?? `n${Date.now()}`, ...draft, name: draft.name.trim(), contribution: draft.contribution.trim(), evidenced: false };
    setItems(editing ? items.map((i) => (i.id === editing ? item : i)) : [...items, item]);
    setDraft(EMPTY_ITEM); setEditing(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded border border-slate/25">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-label/60 text-left text-xs text-slate">
            <tr>
              <th className="py-2 pr-3 pl-4 font-medium">Counted {unit}</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Event date</th>
              <th className="py-2 pr-4 pl-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate/15">
            {items.length === 0 && <tr><td colSpan={4} className="px-4 py-5 text-center text-xs text-slate">Nothing counted yet.</td></tr>}
            {items.map((i) => (
              <tr key={i.id} className={editing === i.id ? "bg-sky-50" : ""}>
                <td className="py-2.5 pr-3 pl-4">
                  <p className="font-medium text-night">{i.name}</p>
                  {!i.contribution && <p className="text-xs text-red-600">Contribution missing</p>}
                </td>
                <td className="px-3 py-2.5 text-night/80">{i.classification === "net-new" ? "Net new" : "Materially deepened"}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-night/80">{fmtDate(i.eventDate)}</td>
                <td className="py-2 pr-4 pl-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" onClick={() => { setEditing(i.id); setDraft({ name: i.name, classification: i.classification, eventDate: i.eventDate, contribution: i.contribution }); setErrs({}); }}
                      className="h-8 rounded px-2.5 text-xs font-semibold text-navy hover:bg-mist">Edit</button>
                    <button type="button" aria-label={`Remove ${i.name}`} onClick={() => setItems(items.filter((x) => x.id !== i.id))}
                      className="h-8 rounded px-2.5 text-xs font-semibold text-red-600 hover:bg-red-50">Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <fieldset className="rounded border border-dashed border-slate/50 p-4">
        <legend className="px-1 text-xs font-semibold text-navy">{editing ? `Edit ${one}` : `Add a ${one}`}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text={`${one[0].toUpperCase()}${one.slice(1)} name`} required error={errs.name}>
            <input className={`${field} ${border(errs.name)}`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Label>
          <Label text="Type" required>
            <select className={`${field} border-slate/40`} value={draft.classification}
              onChange={(e) => setDraft({ ...draft, classification: e.target.value as CountItem["classification"] })}>
              <option value="net-new">Net new</option>
              <option value="deepened">Materially deepened / progressed</option>
            </select>
          </Label>
          <Label text="Qualifying event date" required error={errs.eventDate} hint="Onboarding, activation or material progression.">
            <input type="date" className={`${field} ${border(errs.eventDate)}`} max={today()} min={`${period}-01-01`}
              value={draft.eventDate} onChange={(e) => setDraft({ ...draft, eventDate: e.target.value })} />
          </Label>
          <Label text="Your contribution" required error={errs.contribution}>
            <input className={`${field} ${border(errs.contribution)}`} placeholder="e.g. Introduced the partner and led onboarding"
              value={draft.contribution} onChange={(e) => setDraft({ ...draft, contribution: e.target.value })} />
          </Label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {editing && <button type="button" className={secondary} onClick={() => { setEditing(null); setDraft(EMPTY_ITEM); setErrs({}); }}>Cancel edit</button>}
          <button type="button" className={primary} onClick={commit}>{editing ? "Update" : `Add ${one}`}</button>
        </div>
      </fieldset>
    </div>
  );
}

function Preview({ d, newActual }: { d: ObjectiveDetail; newActual?: number }) {
  const o = d.objective;
  if (o.kind !== "revenue" && o.kind !== "count") {
    return (
      <section className="rounded-md border border-slate/25 p-5 text-sm">
        <h2 className="mb-2 text-[15px] font-semibold text-navy">How this is assessed</h2>
        <p className="text-night/80">This objective has no % progress. The MBO Panel rates it against the criteria using the evidence you record here.</p>
        <p className="mt-3 text-xs text-slate">Current status: <Chip tone={EVIDENCE[d.progress.evidence].tone}>{EVIDENCE[d.progress.evidence].label}</Chip></p>
      </section>
    );
  }
  const target = d.target.target ?? 0;
  const current = d.progress.actual ?? 0;
  const value = newActual ?? current;
  const pct = target ? (value / target) * 100 : 0;
  const change = value - current;
  return (
    <section className="rounded-md border border-slate/25 p-5 text-sm lg:sticky lg:top-24">
      <h2 className="mb-3 text-[15px] font-semibold text-navy">Preview</h2>
      <p className="text-xs text-slate">Actual after this update</p>
      <p className="text-xl font-semibold text-night tabular-nums">{formatValue(o, value)}</p>
      <div className="mt-3 flex items-baseline justify-between text-xs text-slate">
        <span>of {formatValue(o, target)} annual target</span>
        <span className="text-base font-semibold text-[#00857d] tabular-nums">{Math.round(pct)}%</span>
      </div>
      <div className="mt-1.5"><ProgressBar pct={pct} /></div>
      <dl className="mt-4 divide-y divide-slate/15 text-xs">
        <div className="flex justify-between py-2"><dt className="text-slate">Currently recorded</dt><dd className="font-medium text-night tabular-nums">{formatValue(o, current)}</dd></div>
        <div className="flex justify-between py-2">
          <dt className="text-slate">Change</dt>
          <dd className={`font-semibold tabular-nums ${change > 0 ? "text-[#00857d]" : change < 0 ? "text-red-600" : "text-night"}`}>
            {change > 0 ? "+" : change < 0 ? "−" : ""}{o.kind === "revenue" ? `HKD ${Math.abs(change).toLocaleString("en-US")}` : Math.abs(change)}
          </dd>
        </div>
      </dl>
      {change < 0 && <p className="mt-2 rounded bg-amber-50 px-2.5 py-2 text-xs text-amber-800">This lowers your recorded actual. Explain why in the progress notes.</p>}
      <p className="mt-3 text-xs text-slate">Progress is % of the annual target, not a rating.</p>
    </section>
  );
}

function UpdateForm({ d, period }: { d: ObjectiveDetail; period: string }) {
  const router = useRouter();
  const o = d.objective;
  const kind = o.kind;
  const [asOf, setAsOf] = useState(today() < `${period}-12-31` ? today() : `${period}-12-31`);
  const [actual, setActual] = useState<number | undefined>(d.progress.actual);
  const [items, setItems] = useState<CountItem[] | null>(null);
  const [commitment, setCommitment] = useState(d.target.commitments[0] ?? "");
  const [activityDate, setActivityDate] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [reference, setReference] = useState("");
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (kind === "count") getCountItems(period, o.id).then(setItems);
  }, [kind, period, o.id]);

  function validate(): Errors {
    const e: Errors = {};
    const badDate = (v: string) => v > today() || !v.startsWith(period);
    if (kind === "revenue" || kind === "count") {
      if (!asOf) e.asOf = "Enter the date these actuals run to.";
      else if (badDate(asOf)) e.asOf = `Use a date in ${period}, not in the future.`;
    }
    if (kind === "revenue" && actual === undefined) e.actual = "Enter the cumulative year-to-date total.";
    if (kind === "count" && items?.some((i) => !i.contribution)) e.items = `Add your contribution for every counted ${singular(o.unit)} (Edit).`;
    if (kind === "criteria" || kind === "leadership") {
      if (!commitment) e.commitment = "Choose the commitment this evidences.";
      if (!activityDate) e.activityDate = "Enter the activity date.";
      else if (badDate(activityDate)) e.activityDate = `Use a date in ${period}, not in the future.`;
    }
    if (!notes.trim()) e.notes = kind === "criteria" || kind === "leadership" ? "Describe what happened." : "Add progress notes.";
    if (!files.length && !reference.trim()) e.evidence = "Attach a file or add a record reference.";
    return e;
  }
  const e: Errors = tried ? validate() : {};

  function addFiles(list: FileList | null) {
    const picked = Array.from(list ?? []);
    const tooBig = picked.filter((f) => f.size > MAX_MB * 1024 * 1024);
    const ok = picked.filter((f) => f.size <= MAX_MB * 1024 * 1024);
    setFiles((prev) => [...prev, ...ok.filter((f) => !prev.some((p) => p.name === f.name && p.size === f.size))]);
    setFileError(tooBig.length ? `${tooBig.map((f) => f.name).join(", ")} ${tooBig.length > 1 ? "are" : "is"} over ${MAX_MB} MB.` : "");
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setTried(true);
    const missing = Object.keys(validate()).length > 0;
    if (missing) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    setSaving(true);
    await saveProgress(period, {
      objectiveId: o.id, asOf, notes: notes.trim(), sourceType, reference: reference.trim(),
      attachments: files.map((f) => ({ name: f.name, size: f.size })),
      ...(kind === "revenue" ? { actual } : {}),
      ...(kind === "count" ? { items: items ?? [] } : {}),
      ...(kind === "criteria" || kind === "leadership" ? { commitment, activityDate } : {}),
    });
    router.push(`/bd/web/mbo/objective/${o.id}?period=${period}`);
  }

  const newActual = kind === "count" ? items?.length : actual;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <h2 className="text-[15px] font-semibold text-navy">
              {kind === "revenue" ? "Cumulative actual" : kind === "count" ? `Counted ${o.unit}` : "Evidence for a commitment"}
            </h2>

            {(kind === "revenue" || kind === "count") && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Label text="Actuals as of" required error={e.asOf}>
                  <input type="date" className={`${field} ${border(e.asOf)}`} aria-invalid={!!e.asOf} value={asOf}
                    min={`${period}-01-01`} max={today()} onChange={(x) => setAsOf(x.target.value)} />
                </Label>
                {kind === "revenue" && (
                  <Label text="Cumulative actual to date (HKD)" required error={e.actual}
                    hint={`Enter the full year-to-date total — it replaces ${formatValue(o, d.progress.actual)}, it isn't added to it.`}>
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate">HKD</span>
                      <input inputMode="numeric" aria-invalid={!!e.actual} className={`${field} pl-12 tabular-nums ${border(e.actual)}`}
                        value={actual === undefined ? "" : actual.toLocaleString("en-US")} onChange={(x) => setActual(parseNum(x.target.value))} />
                    </div>
                  </Label>
                )}
              </div>
            )}

            {kind === "count" && (items === null
              ? <div className="h-32 animate-pulse rounded bg-mist" />
              : <CountItems unit={o.unit} items={items} setItems={setItems} period={period} error={e.items} />)}

            {(kind === "criteria" || kind === "leadership") && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Label text="Agreed commitment" required error={e.commitment}>
                  <select className={`${field} ${border(e.commitment)}`} aria-invalid={!!e.commitment} value={commitment} onChange={(x) => setCommitment(x.target.value)}>
                    {d.target.commitments.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Label>
                <Label text="Activity date" required error={e.activityDate}>
                  <input type="date" className={`${field} ${border(e.activityDate)}`} aria-invalid={!!e.activityDate}
                    min={`${period}-01-01`} max={today()} value={activityDate} onChange={(x) => setActivityDate(x.target.value)} />
                </Label>
              </div>
            )}

            <Label text={kind === "criteria" || kind === "leadership" ? "What happened" : "Progress notes"} required error={e.notes}
              hint={kind === "revenue" ? "What closed since the last update, and your contribution." : kind === "count" ? "What changed since the last update." : "e.g. Escalated a 12% variance to my manager in writing on day 2, with root cause and recovery plan."}>
              <textarea rows={3} className={`${area} ${border(e.notes)}`} aria-invalid={!!e.notes} value={notes} onChange={(x) => setNotes(x.target.value)} />
            </Label>
          </section>

          <section className="flex flex-col gap-4 border-t border-slate/20 pt-6">
            <div>
              <h2 className="text-[15px] font-semibold text-navy">Supporting evidence</h2>
              <p className="mt-0.5 text-xs text-slate">Expected: {o.evidence}</p>
            </div>

            <div className={`rounded border border-dashed p-4 ${e.evidence ? "border-red-400" : "border-slate/50"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <svg viewBox="0 0 24 24" className="size-5 text-slate" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7" /></svg>
                <div className="mr-auto text-sm">
                  <p className="font-medium text-night">{files.length ? `${files.length} file${files.length > 1 ? "s" : ""} attached` : "No files attached"}</p>
                  <p className="text-xs text-slate">PDF, Office, image, CSV or email · up to {MAX_MB} MB each</p>
                </div>
                <label className="flex h-9 cursor-pointer items-center rounded border border-navy px-4 text-sm font-medium text-navy hover:bg-mist">
                  Choose files
                  <input type="file" multiple accept={ACCEPT} className="sr-only" onChange={(x) => { addFiles(x.target.files); x.target.value = ""; }} />
                </label>
              </div>
              {files.length > 0 && (
                <ul className="mt-3 divide-y divide-slate/15 border-t border-slate/15">
                  {files.map((f) => (
                    <li key={f.name + f.size} className="flex items-center gap-3 py-2 text-sm">
                      <span className="mr-auto truncate text-night">{f.name}</span>
                      <span className="text-xs text-slate tabular-nums">{(f.size / 1024).toFixed(0)} KB</span>
                      <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((x) => x !== f))}
                        className="h-7 rounded px-2 text-xs font-semibold text-red-600 hover:bg-red-50">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
              {fileError && <p className="mt-2 text-xs text-red-600">{fileError}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Label text="Source record type">
                <select className={`${field} border-slate/40`} value={sourceType} onChange={(x) => setSourceType(x.target.value)}>
                  <option value="">Select type</option>
                  {SOURCE_TYPES[kind].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Label>
              <Label text="Record reference / link" hint="CRM ID, register reference or document link.">
                <input className={`${field} border-slate/40`} value={reference} onChange={(x) => setReference(x.target.value)} />
              </Label>
            </div>
            {e.evidence && <p role="alert" className="text-xs text-red-600">{e.evidence}</p>}
          </section>
        </div>

        <Preview d={d} newActual={newActual} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
        <p className="mr-auto text-xs text-slate">Saving records progress and evidence for review. It doesn&apos;t approve a rating.</p>
        <Link href={`/bd/web/mbo/objective/${o.id}?period=${period}`} className={secondary}>Cancel</Link>
        <button className={primary} disabled={saving}>{saving ? "Saving…" : "Save update"}</button>
      </div>
    </form>
  );
}

function UpdateProgress() {
  const router = useRouter();
  const sp = useSearchParams();
  const period = sp.get("period") ?? "2026";
  const objectiveId = sp.get("objective") ?? "revenue";
  const rows = useRows(async () => [await getObjectiveDetail(period, objectiveId)], [period, objectiveId]);
  const d = rows?.[0];

  return (
    <div>
      <PageHeader title="Update Progress & Evidence">
        {d ? <BackButton href={`/bd/web/mbo/objective/${objectiveId}?period=${period}`} to="Objective Details" />
          : <BackButton href="/bd/web/mbo/my" to="My MBO" />}
      </PageHeader>

      {rows && !d ? (
        <div className={`${PANEL} py-14 text-center`}>
          <p className="text-sm font-semibold text-night">Nothing to update yet</p>
          <p className="mt-1 text-sm text-slate">Accept your {period} targets on My MBO first.</p>
        </div>
      ) : !d ? (
        <div className={`${PANEL} flex flex-col gap-4`}>{[0, 1].map((i) => <div key={i} className="h-36 animate-pulse rounded-md bg-mist" />)}</div>
      ) : (
        <div className={`${PANEL} flex flex-col gap-6`}>
          <section className="grid gap-x-6 gap-y-4 border-b border-slate/20 pb-6 md:grid-cols-[minmax(0,1.4fr)_auto_auto_auto] md:items-end">
            <Filter label="Objective">
              <Select label="Objective" className={big} value={objectiveId}
                onChange={(v) => router.replace(`/bd/web/mbo/progress?objective=${v}&period=${period}`)}
                options={d.mbo.template.objectives.map((o, i) => ({ value: o.id, label: `${i + 1}. ${o.title}` }))} />
            </Filter>
            <div className="text-xs text-slate">Weight<p className="text-sm font-semibold text-navy">{d.objective.weight}%</p></div>
            <div className="text-xs text-slate">
              Agreed target
              <p className="text-sm font-semibold text-night">
                {d.objective.kind === "revenue" || d.objective.kind === "count" ? formatValue(d.objective, d.target.target) : `${d.target.commitments.length} commitments`}
              </p>
            </div>
            <div className="text-xs text-slate">Evidence<p><Chip tone={EVIDENCE[d.progress.evidence].tone}>{EVIDENCE[d.progress.evidence].label}</Chip></p></div>
          </section>
          {/* key: switching objective starts a fresh form */}
          <UpdateForm key={`${objectiveId}|${period}`} d={d} period={period} />
        </div>
      )}
    </div>
  );
}

export default function UpdateProgressPage() {
  return <Suspense><UpdateProgress /></Suspense>;
}
