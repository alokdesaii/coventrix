"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Shared UI primitives for portal screens.

export function Select<T extends string>({ value, onChange, options, label, className = "", invalid, disabled }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label} aria-invalid={invalid || undefined} disabled={disabled}
        className={`h-8 w-full appearance-none truncate rounded border ${invalid ? "border-red-400" : "border-slate/40"} bg-white disabled:bg-mist disabled:text-slate pr-8 pl-3 text-xs font-medium text-night outline-none focus:border-teal focus:ring-2 focus:ring-teal/20`}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-slate" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 rounded bg-mist p-0.5 text-xs font-medium">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`h-7 rounded-md px-3 transition ${value === o.value ? "bg-white text-navy shadow-sm" : "text-slate hover:text-navy"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export type Column = { label: string; numeric?: boolean };
export type Cell = string | number;

// Card with a title, header controls and a simple table. rows=null shows a loading skeleton.
export function TableCard({ title, controls, columns, rows, empty = "No data found", scroll }: {
  title: string;
  controls?: React.ReactNode;
  columns: Column[];
  rows: Cell[][] | null;
  empty?: string;
  /** Cap the body height and scroll it under a sticky header (long lists). */
  scroll?: boolean;
}) {
  const align = (c: Column) => (c.numeric ? "text-right" : "text-left");
  return (
    <section className="flex flex-col rounded-md border border-slate/25 bg-white">
      <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-slate/20 px-5 py-3">
        <h2 className="min-w-40 flex-1 text-[15px] font-semibold text-navy">{title}</h2>
        {controls}
      </header>
      <div className={scroll ? "max-h-[26rem] overflow-y-auto" : undefined}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="text-xs text-slate">
            {columns.map((c) => <th key={c.label} className={`px-5 py-2.5 font-medium ${align(c)}`}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate/15 border-t border-slate/15">
          {rows === null &&
            [0, 1, 2].map((i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.label} className="px-5 py-3">
                    <div className={`h-4 animate-pulse rounded bg-mist ${c.numeric ? "ml-auto w-10" : "w-20"}`} />
                  </td>
                ))}
              </tr>
            ))}
          {rows?.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-5 py-8 text-center text-xs text-slate">{empty}</td>
            </tr>
          )}
          {rows?.map((r, i) => (
            <tr key={i} className="hover:bg-mist/60">
              {r.map((v, j) => (
                <td key={j} className={`px-5 py-3 text-night ${align(columns[j])} ${columns[j].numeric ? "tabular-nums" : j === 0 ? "font-medium" : ""}`}>
                  {typeof v === "number" ? v.toLocaleString() : v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  );
}

// Main white container that holds a page's blocks (title sits above it on the page background).
export const PANEL = "rounded-md border border-slate/20 bg-white p-5";

// Refetches whenever deps change; null while loading. Results are tagged with the deps they were
// loaded for, so stale data reads as "loading" without resetting state inside the effect.
export function useRows<T>(load: () => Promise<T[]>, deps: unknown[]) {
  const key = JSON.stringify(deps);
  const [state, setState] = useState<{ key: string; rows: T[] } | null>(null);
  useEffect(() => {
    let live = true;
    load().then((rows) => live && setState({ key, rows }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state?.key === key ? state.rows : null;
}

/** Page number that falls back to 1 whenever `filterKey` changes. */
export function usePage(filterKey: string) {
  const [s, setS] = useState({ key: filterKey, page: 1 });
  return [s.key === filterKey ? s.page : 1, (page: number) => setS({ key: filterKey, page })] as const;
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <h1 className="mr-auto text-xl font-semibold text-navy">{title}</h1>
      {children}
    </div>
  );
}

export type DateRange = { from: string; to: string }; // ISO yyyy-mm-dd
export const todayRange = (): DateRange => {
  const d = new Date().toISOString().slice(0, 10);
  return { from: d, to: d };
};

const dateInput = "h-9 rounded border border-slate/40 bg-white px-3 text-sm text-night outline-none focus:border-teal focus:ring-2 focus:ring-teal/20";

// "Sort by" from/to picker; only applies on the search button.
export function DateRangeFilter({ value, onApply }: { value: DateRange; onApply: (r: DateRange) => void }) {
  const [draft, setDraft] = useState(value);
  const invalid = draft.from > draft.to;
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (!invalid) onApply(draft); }}>
      <span className="text-sm font-medium text-slate">Sort by</span>
      <input type="date" aria-label="From date" className={dateInput} value={draft.from} max={draft.to}
        onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
      <span className="text-sm text-slate">to</span>
      <input type="date" aria-label="To date" className={dateInput} value={draft.to} min={draft.from}
        onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
      <button disabled={invalid} aria-label="Apply date range"
        className="grid size-9 place-items-center rounded bg-navy text-white transition hover:bg-navy/90 disabled:opacity-40">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}

export function downloadCsv(filename: string, head: string[], rows: Cell[][]) {
  const esc = (v: Cell) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ onExport }: { onExport: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy}
      onClick={async () => { setBusy(true); try { await onExport(); } finally { setBusy(false); } }}
      className="flex h-9 items-center gap-2 rounded bg-teal px-3.5 text-sm font-semibold text-ink transition hover:brightness-105 disabled:opacity-50">
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" /></svg>
      {busy ? "Exporting…" : "Export"}
    </button>
  );
}

/** Underlined tab bar; sits flush at the top of a PANEL (negative margins cancel its padding). */
export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: readonly T[]; value: T; onChange: (t: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="-mx-5 -mt-5 mb-6 flex gap-1 overflow-x-auto border-b border-slate/20 px-5">
      {tabs.map((t) => (
        <button key={t} type="button" role="tab" aria-selected={value === t} onClick={() => onChange(t)}
          className={`-mb-px border-b-2 px-3 py-3.5 text-sm font-medium whitespace-nowrap transition ${value === t ? "border-teal text-navy" : "border-transparent text-slate hover:text-navy"}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

/** Modal dialog: opens while `open` is true; closes on ✕, Esc or backdrop click. */
export function Modal({ open, title, onClose, children, width = "32rem" }: {
  open: boolean; title: string; onClose: () => void; children: React.ReactNode; width?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}
      style={{ width: `min(${width}, calc(100% - 2rem))` }}
      className="m-auto rounded-md bg-white p-0 backdrop:bg-night/50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate/20 bg-white px-5 py-4">
        <h2 className="mr-auto text-lg font-semibold text-navy">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close"
          className="grid size-8 place-items-center rounded bg-mist text-navy transition hover:bg-slate/20">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </header>
      <div className="p-5">{open && children}</div>
    </dialog>
  );
}

/** Form field wrapper: label (+ required star), control, then error or hint. */
export function Label({ text, required, error, hint, children }: { text: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-night/70">{text}{required && <span className="text-red-600"> *</span>}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : hint && <span className="text-xs text-slate">{hint}</span>}
    </label>
  );
}


/** "Back" button for the far right of a PageHeader. `to` names the destination for screen readers / tooltip. */
export function BackButton({ href, to }: { href: string; to: string }) {
  return (
    <Link href={href} title={`Back to ${to}`} aria-label={`Back to ${to}`}
      className="flex h-9 items-center gap-1.5 rounded border border-slate/40 bg-white px-3.5 text-sm font-medium text-navy transition hover:bg-mist">
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="m15 18-6-6 6-6" /></svg>
      Back
    </Link>
  );
}
