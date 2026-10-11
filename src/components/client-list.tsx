"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { downloadCsv, ExportButton, PageHeader, PANEL, Select, usePage } from "@/components/ui";
import {
  exportClients, listClients, STATUSES, WAY_SIDES, WAY_TYPES,
  type Client, type ClientKind, type Page, type Status, type WaySide, type WayType,
} from "@/lib/api/clients";

export const PAGE_SIZE = 50;

export const STATUS_TONE: Partial<Record<Status, string>> = {
  "Activated": "bg-teal/10 text-[#00857d]",
  "Converted": "bg-teal/10 text-[#00857d]",
  "Activation Required": "bg-amber-100 text-amber-800",
  "In Progress": "bg-sky-100 text-sky-800",
  "Open Lead": "bg-sky-100 text-sky-800",
  "Rejected": "bg-red-100 text-red-700",
  "Suspended": "bg-red-100 text-red-700",
  "Stop": "bg-red-100 text-red-700",
};

const opts = <T extends string>(xs: readonly T[]) => [{ value: "" as T | "", label: "All" }, ...xs.map((x) => ({ value: x as T | "", label: x }))];
export function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_TONE[status] ?? "bg-mist text-slate"}`}>{status}</span>;
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const btn = "grid h-8 min-w-8 place-items-center rounded-md px-2 text-xs font-medium transition disabled:pointer-events-none disabled:opacity-40";
  const arrow = (d: string, p: number, label: string) => (
    <button type="button" className={`${btn} text-slate hover:bg-mist hover:text-navy`} disabled={p < 1 || p > pages || p === page} onClick={() => onPage(p)} aria-label={label}>
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d={d} /></svg>
    </button>
  );
  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      {arrow("m11 17-5-5 5-5M18 17l-5-5 5-5", 1, "First page")}
      {arrow("m15 18-6-6 6-6", page - 1, "Previous page")}
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button key={p} type="button" onClick={() => onPage(p)} aria-current={p === page ? "page" : undefined}
          className={`${btn} ${p === page ? "bg-navy text-white" : "text-night hover:bg-mist"}`}>{p}</button>
      ))}
      {arrow("m9 18 6-6-6-6", page + 1, "Next page")}
      {arrow("m13 17 5-5-5-5M6 17l5-5-5-5", pages, "Last page")}
    </nav>
  );
}

export const field = "h-9 w-full rounded border border-slate/40 bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20";
export const big = "[&_select]:h-9 [&_select]:text-sm";
export const Filter = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5 text-xs font-medium text-slate" aria-label={label}>{label}{children}</div>
);
const COLS = ["Name", "Account Number", "Country", "Incorporation Date", "Way Type", "Way Side", "Status", ""];

export function ClientList({ kind, title, searchLabel = "Name" }: { kind: ClientKind; title: string; searchLabel?: string }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [wayType, setWayType] = useState<WayType | "">("");
  const [waySide, setWaySide] = useState<WaySide | "">("");
  const [data, setData] = useState<Page<Client> | null>(null);

  // Any filter change goes back to page 1.
  const [page, setPage] = usePage(JSON.stringify([name, status, wayType, waySide]));
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      setData(null);
      listClients(kind, { name, status, wayType, waySide, page, pageSize: PAGE_SIZE }).then((d) => live && setData(d));
    }, 250); // debounce name typing
    return () => { live = false; clearTimeout(t); };
  }, [kind, name, status, wayType, waySide, page]);

  const from = data && data.total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = data ? Math.min(page * PAGE_SIZE, data.total) : 0;

  return (
    <div>
      <PageHeader title={title}>
        <ExportButton onExport={async () => downloadCsv(`${kind}-clients.csv`,
          ["Name", "Account Number", "Country", "Incorporation Date", "Way Type", "Way Side", "Status"],
          (await exportClients(kind, { name, status, wayType, waySide }))
            .map((c) => [c.name, c.accountNumber, c.country, c.incorporationDate, c.wayType, c.waySide, c.status]))} />
      </PageHeader>

      <section className={PANEL.replace("p-5", "")}>
        <div className="grid gap-4 border-b border-slate/20 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate">{searchLabel}
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder={`Search by ${searchLabel.toLowerCase()}`} />
          </label>
          <Filter label="Status"><Select label="Status" value={status} onChange={setStatus} options={opts(STATUSES)} className={big} /></Filter>
          <Filter label="Way Type"><Select label="Way Type" value={wayType} onChange={setWayType} options={opts(WAY_TYPES)} className={big} /></Filter>
          <Filter label="Way Side"><Select label="Way Side" value={waySide} onChange={setWaySide} options={opts(WAY_SIDES)} className={big} /></Filter>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-[13px]">
            <thead>
              <tr className="text-left text-xs text-slate">
                {COLS.map((c) => <th key={c} className="px-3 first:w-1/4 first:pl-5 last:pr-5 py-3 font-medium whitespace-nowrap">{c}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/15 border-t border-slate/15">
              {!data && Array.from({ length: 8 }, (_, i) => (
                <tr key={i}>{COLS.map((c) => <td key={c} className="px-3 py-3.5"><div className="h-4 w-full max-w-28 animate-pulse rounded bg-mist" /></td>)}</tr>
              ))}
              {data?.items.length === 0 && (
                <tr><td colSpan={COLS.length} className="px-5 py-12 text-center text-sm text-slate">No records found</td></tr>
              )}
              {data?.items.map((c) => (
                <tr key={c.id} className="text-night hover:bg-mist/60">
                  <td className="min-w-40 pl-5 pr-3 py-3 font-medium">{c.name}</td>
                  <td className="px-3 py-3 tabular-nums whitespace-nowrap text-night/80">{c.accountNumber}</td>
                  <td className="min-w-28 px-3 py-3">{c.country}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{fmtDate(c.incorporationDate)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{c.wayType}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{c.waySide}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-3 py-3 pr-5 text-right">
                    <Link href={`/bd/web/financialinstitute/viewclientprofile/${c.id}`} aria-label={`View ${c.name}`} title="View" className="inline-grid size-8 place-items-center rounded-md text-navy hover:bg-mist"><svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg></Link>
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
    </div>
  );
}
