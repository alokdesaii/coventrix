"use client";

import { useState } from "react";
import { fmtDate, PAGE_SIZE, Pager } from "@/components/client-list";
import { DateRangeFilter, downloadCsv, ExportButton, PageHeader, PANEL, todayRange, useRows, type DateRange, usePage } from "@/components/ui";
import { exportTransactionReport, getTransactionReport, type TransactionRow } from "@/lib/api/reports";

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Col = { label: string; csv: string; cell: (r: TransactionRow) => React.ReactNode; raw: (r: TransactionRow) => string | number; numeric?: boolean };

// Order and CSV headers match the live report.
const COLS: Col[] = [
  { label: "Client Name", csv: "Client Name", cell: (r) => r.clientName, raw: (r) => r.clientName },
  { label: "Remitter Country", csv: "Remitter Country", cell: (r) => r.remitterCountry, raw: (r) => r.remitterCountry },
  { label: "Bank Country", csv: "Bank Country", cell: (r) => r.bankCountry, raw: (r) => r.bankCountry },
  { label: "Type", csv: "Type", cell: (r) => r.type, raw: (r) => r.type },
  { label: "Bank Assigned", csv: "Bank Assigned", cell: (r) => r.bankAssigned, raw: (r) => r.bankAssigned },
  { label: "Ref No", csv: "Ref No", cell: (r) => r.refNo, raw: (r) => r.refNo },
  { label: "Approver Date", csv: "Approver Date", cell: (r) => fmtDate(r.approverDate), raw: (r) => r.approverDate },
  { label: "Pay In Amount", csv: "Pay In Amount", cell: (r) => money(r.payInAmount), raw: (r) => r.payInAmount, numeric: true },
  { label: "Currency", csv: "Pay In Currency", cell: (r) => r.payInCurrency, raw: (r) => r.payInCurrency },
  { label: "P/L", csv: "PL", numeric: true, raw: (r) => r.pl,
    cell: (r) => <span className={r.pl < 0 ? "text-red-600" : "text-[#00857d]"}>{r.pl < 0 ? "−" : "+"}{money(Math.abs(r.pl))}</span> },
  { label: "Main Client Name", csv: "Main Client Name", cell: (r) => r.mainClientName, raw: (r) => r.mainClientName },
  { label: "Beneficiary Name", csv: "Beneficiary Name", cell: (r) => r.beneficiaryName, raw: (r) => r.beneficiaryName },
  { label: "Beneficiary Country", csv: "Beneficiary Country", cell: (r) => r.beneficiaryCountry, raw: (r) => r.beneficiaryCountry },
  { label: "Payment Created", csv: "Payment Created Date", cell: (r) => fmtDate(r.paymentCreatedDate), raw: (r) => r.paymentCreatedDate },
  { label: "Bank Assigned At", csv: "BankAssign DateTime", cell: (r) => fmtDateTime(r.bankAssignedAt), raw: (r) => r.bankAssignedAt },
  { label: "Client Onboarded", csv: "ClientOnBoardingDate", cell: (r) => fmtDate(r.clientOnboardingDate), raw: (r) => r.clientOnboardingDate },
];

const cellCls = "px-3 py-3 whitespace-nowrap";

export default function TransactionwiseReportPage() {
  const [range, setRange] = useState<DateRange>(todayRange);
  const [total, setTotal] = useState(0);

  // Any filter change goes back to page 1.
  const [page, setPage] = usePage(JSON.stringify([range]));
  const rows = useRows(async () => {
    const res = await getTransactionReport(range, page, PAGE_SIZE);
    setTotal(res.total);
    return res.items;
  }, [range, page]);

  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div>
      <PageHeader title="Transactionwise Report">
        <DateRangeFilter value={range} onApply={setRange} />
        <ExportButton onExport={async () => downloadCsv("transactionwise-report.csv", COLS.map((c) => c.csv),
          (await exportTransactionReport(range)).map((r) => COLS.map((c) => c.raw(r))))} />
      </PageHeader>

      <section className={PANEL.replace("p-5", "")}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-xs text-slate">
                {COLS.map((c, i) => (
                  <th key={c.label} className={`${cellCls} py-3 font-medium ${c.numeric ? "text-right" : ""} ${i === 0 ? "sticky left-0 z-10 border-r border-slate/15 bg-white pl-5" : ""} last:pr-5`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/15 border-t border-slate/15">
              {rows === null && Array.from({ length: 8 }, (_, i) => (
                <tr key={i}>{COLS.map((c) => <td key={c.label} className={`${cellCls} first:pl-5`}><div className="h-4 w-20 animate-pulse rounded bg-mist" /></td>)}</tr>
              ))}
              {rows?.length === 0 && (
                <tr><td colSpan={COLS.length} className="px-5 py-12 text-center text-sm text-slate">No records found</td></tr>
              )}
              {rows?.map((r) => (
                <tr key={r.refNo} className="group text-night hover:bg-mist/60">
                  {COLS.map((c, i) => (
                    <td key={c.label} className={`${cellCls} ${c.numeric ? "text-right tabular-nums" : ""} ${i === 0 ? "sticky left-0 border-r border-slate/15 bg-white pl-5 font-medium group-hover:bg-mist" : ""} last:pr-5`}>
                      {c.cell(r)}
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
