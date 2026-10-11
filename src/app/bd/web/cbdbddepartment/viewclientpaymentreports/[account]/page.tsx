"use client";

import Link from "next/link";
import { use, useState } from "react";
import { DateRangeFilter, PageHeader, PANEL, TableCard, Tabs, todayRange, useRows, type DateRange } from "@/components/ui";
import { getClientPaymentReport, PAYMENT_TYPES, type ClientPaymentReport, type PaymentType } from "@/lib/api/clients";

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const LIST = "/bd/web/cbdbddepartment/cbddepartment";

export default function ClientPaymentReportsPage({ params }: { params: Promise<{ account: string }> }) {
  const account = decodeURIComponent(use(params).account);
  const [range, setRange] = useState<DateRange>(todayRange);
  const [type, setType] = useState<PaymentType>("Incoming");

  // useRows works on lists; wrap the single report in one.
  const data = useRows<ClientPaymentReport>(async () => [await getClientPaymentReport(account, type, range)], [account, type, range]);
  const r = data?.[0];

  return (
    <div>
      <PageHeader title="Client Payment Reports">
        <DateRangeFilter value={range} onApply={setRange} />
        <Link href={LIST} onClick={(e) => { if (history.length > 1) { e.preventDefault(); history.back(); } }}
          className="flex h-9 items-center gap-1.5 rounded border border-slate/40 bg-white px-3.5 text-sm font-medium text-navy transition hover:bg-mist">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="m15 18-6-6 6-6" /></svg>
          Back
        </Link>
      </PageHeader>

      <div className={PANEL}>
        <Tabs label="Payment type" tabs={PAYMENT_TYPES} value={type} onChange={setType} />

        <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-base font-semibold text-night">{r ? (r.client?.name ?? "Unknown client") : " "}</p>
          <p className="text-sm text-slate tabular-nums">{account}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <TableCard title="Payment By Monthly"
            columns={[{ label: "Report Name" }, { label: "Payment Amount", numeric: true }]}
            rows={r ? r.monthly.map((x) => [x.report, money(x.amount)]) : null} />
          <TableCard title="Payment By Country"
            columns={[{ label: "Country" }, { label: "Report Name" }, { label: "Payment Amount", numeric: true }]}
            rows={r ? r.byCountry.map((x) => [x.country, x.report, money(x.amount)]) : null} />
          <TableCard title="Payment By Currency"
            columns={[{ label: "Currency" }, { label: "Report Name" }, { label: "Payment Amount", numeric: true }]}
            rows={r ? r.byCurrency.map((x) => [x.currency, x.report, money(x.amount)]) : null} />
        </div>
      </div>
    </div>
  );
}
