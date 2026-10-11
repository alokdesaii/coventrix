"use client";

import { useState } from "react";
import { fmtDate, PAGE_SIZE, Pager } from "@/components/client-list";
import { DateRangeFilter, downloadCsv, ExportButton, PageHeader, PANEL, todayRange, useRows, type DateRange, usePage } from "@/components/ui";
import { exportConsolidatedPayments, getConsolidatedPayments, type ConsolidatedPaymentRow } from "@/lib/api/reports";

const GROUPS = ["Outward Payments", "Inward Payments", "Book Transfers"];
const CSV_HEAD = ["Client Name", "Client Type", "Client ID", "Date Boarded", "Total No. of Outward Payment", "Total Volume Of OP",
  "Total No Of Inward Payment", "Total Volume Of IP", "Total Number Of Book Transfer", "Total Volume Of BT"];

const nums = (r: ConsolidatedPaymentRow) =>
  [r.outwardCount, r.outwardVolume, r.inwardCount, r.inwardVolume, r.bookTransferCount, r.bookTransferVolume];

const th = "px-3 py-2.5 font-medium whitespace-nowrap";
const td = "px-3 py-3 whitespace-nowrap";

export default function ConsolidatedPaymentsPage() {
  const [range, setRange] = useState<DateRange>(todayRange);
  const [total, setTotal] = useState(0);

  // Any filter change goes back to page 1.
  const [page, setPage] = usePage(JSON.stringify([range]));
  const rows = useRows(async () => {
    const res = await getConsolidatedPayments(range, page, PAGE_SIZE);
    setTotal(res.total);
    return res.items;
  }, [range, page]);

  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div>
      <PageHeader title="Consolidated Payments">
        <DateRangeFilter value={range} onApply={setRange} />
        <ExportButton onExport={async () => downloadCsv("consolidated-payments.csv", CSV_HEAD,
          (await exportConsolidatedPayments(range)).map((r) => [r.clientName, r.clientType, r.clientId, r.dateBoarded, ...nums(r)]))} />
      </PageHeader>

      <section className={PANEL.replace("p-5", "")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-[13px]">
            <thead className="text-xs text-slate">
              <tr className="text-left">
                <th rowSpan={2} className={`${th} sticky left-0 z-10 bg-white pl-5`}>Client Name</th>
                <th rowSpan={2} className={th}>Client Type</th>
                <th rowSpan={2} className={th}>Client ID</th>
                <th rowSpan={2} className={th}>Date Boarded</th>
                {GROUPS.map((g) => (
                  <th key={g} colSpan={2} className={`${th} border-b border-l border-slate/15 text-center text-navy`}>{g}</th>
                ))}
              </tr>
              <tr className="text-right">
                {GROUPS.map((g) => [
                  <th key={`${g}n`} className={`${th} border-l border-slate/15`}>No.</th>,
                  <th key={`${g}v`} className={`${th} last:pr-5`}>Volume</th>,
                ])}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/15 border-t border-slate/15">
              {rows === null && Array.from({ length: 8 }, (_, i) => (
                <tr key={i}>{Array.from({ length: 10 }, (_, j) => (
                  <td key={j} className={`${td} first:pl-5`}><div className="h-4 w-16 animate-pulse rounded bg-mist" /></td>
                ))}</tr>
              ))}
              {rows?.length === 0 && (
                <tr><td colSpan={10} className="px-5 py-12 text-center text-sm text-slate">No records found</td></tr>
              )}
              {rows?.map((r) => (
                <tr key={r.clientId} className="group text-night hover:bg-mist/60">
                  <td className={`${td} sticky left-0 bg-white pl-5 font-medium group-hover:bg-mist`}>{r.clientName}</td>
                  <td className={td}>{r.clientType}</td>
                  <td className={`${td} tabular-nums`}>{r.clientId}</td>
                  <td className={td}>{fmtDate(r.dateBoarded)}</td>
                  {nums(r).map((n, i) => (
                    <td key={i} className={`${td} text-right tabular-nums ${i % 2 === 0 ? "border-l border-slate/15" : ""} last:pr-5`}>
                      {n.toLocaleString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate/20 px-5 py-3">
          <p className="text-xs text-slate">
            {rows ? <>Showing <span className="font-medium text-night">{from}–{to}</span> of <span className="font-medium text-night">{total}</span> records</> : "Loading…"}
          </p>
          {total > PAGE_SIZE && <Pager page={page} total={total} onPage={setPage} />}
        </div>
      </section>
    </div>
  );
}
