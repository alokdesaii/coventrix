"use client";

import { useEffect, useRef, useState } from "react";
import { big, field, Filter, fmtDate, PAGE_SIZE, Pager, StatusBadge } from "@/components/client-list";
import { PANEL, Select, usePage } from "@/components/ui";
import { LEAD_OUTCOMES, listLeads, STATUSES, updateLeadStatus, type Lead, type LeadKind, type LeadOutcome, type Page, type Status } from "@/lib/api/clients";

const COLS = ["Name", "Account Number", "Country", "Incorporation Date", "Created By", "Status", ""];

function UpdateStatusDialog({ kind, lead, onClose, onSaved }: { kind: LeadKind; lead: Lead | null; onClose: () => void; onSaved: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<LeadOutcome>("Converted");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Remounted per lead (see `key` below), so form state starts fresh without resetting it here.
  useEffect(() => {
    if (lead) ref.current?.showModal();
    else ref.current?.close();
  }, [lead]);

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-md bg-white p-0 backdrop:bg-night/50">
      <form className="flex flex-col gap-5 p-6" onSubmit={async (e) => {
        e.preventDefault();
        if (!lead) return;
        setSaving(true);
        try { await updateLeadStatus(kind, lead.id, status); onSaved(); onClose(); }
        catch { setError("Could not update the status. Please try again."); }
        finally { setSaving(false); }
      }}>
        <header className="flex items-start gap-3">
          <div className="mr-auto">
            <h2 className="text-lg font-semibold text-navy">Update Status</h2>
            <p className="mt-1 text-sm text-slate">{lead?.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="grid size-8 place-items-center rounded-md bg-mist text-navy transition hover:bg-slate/20">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <Filter label="Status">
          <Select label="Status" className={big} value={status} onChange={setStatus} options={LEAD_OUTCOMES.map((s) => ({ value: s, label: s }))} />
        </Filter>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 rounded border border-slate/40 px-5 text-sm font-medium text-navy hover:bg-mist">Cancel</button>
          <button disabled={saving} className="h-10 rounded bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50">
            {saving ? "Updating…" : "Update Status"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function LeadStatusList({ kind, title }: { kind: LeadKind; title: string }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [data, setData] = useState<Page<Lead> | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [reload, setReload] = useState(0);

  // Any filter change goes back to page 1.
  const [page, setPage] = usePage(JSON.stringify([name, status]));

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      setData(null);
      listLeads(kind, { name, status, page, pageSize: PAGE_SIZE }).then((d) => live && setData(d));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [kind, name, status, page, reload]);

  const from = data && data.total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = data ? Math.min(page * PAGE_SIZE, data.total) : 0;

  return (
    <div>
      <h1 className="mb-5 text-xl font-semibold text-navy">{title}</h1>

      <section className={PANEL.replace("p-5", "")}>
        <div className="grid gap-4 border-b border-slate/20 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate">A/C or Name
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Search by a/c or name" />
          </label>
          <Filter label="Status">
            <Select label="Status" className={big} value={status} onChange={setStatus}
              options={[{ value: "" as Status | "", label: "All" }, ...STATUSES.map((s) => ({ value: s as Status | "", label: s }))]} />
          </Filter>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="text-left text-xs text-slate">
                {COLS.map((c) => <th key={c} className="px-3 py-3 font-medium whitespace-nowrap first:w-1/4 first:pl-5 last:pr-5">{c}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/15 border-t border-slate/15">
              {!data && Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>{COLS.map((c) => <td key={c} className="px-3 py-3.5 first:pl-5"><div className="h-4 w-full max-w-28 animate-pulse rounded bg-mist" /></td>)}</tr>
              ))}
              {data?.items.length === 0 && (
                <tr><td colSpan={COLS.length} className="px-5 py-12 text-center text-sm text-slate">No records found</td></tr>
              )}
              {data?.items.map((l) => (
                <tr key={l.id} className="text-night hover:bg-mist/60">
                  <td className="min-w-40 py-3 pr-3 pl-5 font-medium">{l.name}</td>
                  <td className="px-3 py-3 tabular-nums whitespace-nowrap text-night/80">{l.accountNumber}</td>
                  <td className="min-w-28 px-3 py-3">{l.country}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{fmtDate(l.incorporationDate)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{l.createdBy}</td>
                  <td className="px-3 py-3"><StatusBadge status={l.status} /></td>
                  <td className="py-3 pr-5 pl-3 text-right">
                    {l.status === "Open Lead" ? (
                      <button type="button" onClick={() => setEditing(l)}
                        className="h-8 rounded-md px-3 text-xs font-semibold whitespace-nowrap text-navy hover:bg-mist">
                        Update
                      </button>
                    ) : <span className="sr-only">No action</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate/20 px-5 py-3">
          <p className="text-xs text-slate">
            {data ? <>Showing <span className="font-medium text-night">{from}–{to}</span> of <span className="font-medium text-night">{data.total}</span> records</> : "Loading…"}
          </p>
          {data && data.total > PAGE_SIZE && <Pager page={page} total={data.total} onPage={setPage} />}
        </div>
      </section>

      <UpdateStatusDialog key={editing?.id ?? "none"} kind={kind} lead={editing} onClose={() => setEditing(null)} onSaved={() => setReload((n) => n + 1)} />
    </div>
  );
}
