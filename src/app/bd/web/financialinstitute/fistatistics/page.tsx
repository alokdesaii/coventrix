"use client";

import { useEffect, useState } from "react";
import { DateRangeFilter, PageHeader, PANEL, Segmented, Select, TableCard, todayRange, useRows, type Cell, type Column } from "@/components/ui";
import * as api from "@/lib/api/fi-statistics";
import type { Currency, DateRange, Granularity } from "@/lib/api/fi-statistics";

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "USD", label: "USD" },
  { value: "HKD", label: "HKD" },
];
const GRANULARITY: { value: Granularity; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "day", label: "Day" },
];

function CurrencyCard({ title, columns, range, load, currencies = CURRENCIES }: {
  title: string;
  columns: Column[];
  range: DateRange;
  load: (r: DateRange, c: Currency) => Promise<Cell[][]>;
  currencies?: typeof CURRENCIES;
}) {
  const [currency, setCurrency] = useState<Currency>("USD");
  const rows = useRows(() => load(range, currency), [range, currency]);
  return <TableCard title={title} columns={columns} rows={rows}
    controls={<Select label="Currency" value={currency} onChange={setCurrency} options={currencies} />} />;
}

function TotalPaymentsCard({ range }: { range: DateRange }) {
  const [g, setG] = useState<Granularity>("month");
  const rows = useRows(async () => (await api.getPaymentsByDate(range, g)).map((r) => [r.period, r.payments]), [range, g]);
  return <TableCard title="Total no. of payments" rows={rows}
    columns={[{ label: g === "month" ? "Month" : "Day" }, { label: "Payments", numeric: true }]}
    controls={<Segmented label="Granularity" value={g} onChange={setG} options={GRANULARITY} />} />;
}

function BankCostCard({ range }: { range: DateRange }) {
  const [g, setG] = useState<Granularity>("month");
  const [bank, setBank] = useState("");
  const [banks, setBanks] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => { api.getBankList().then((b) => setBanks(b.map((x) => ({ value: x.id, label: x.name })))); }, []);
  const rows = useRows(async () => (await api.getBankCosts(range, g, bank)).map((r) => [r.period, r.amount]), [range, g, bank]);
  return <TableCard title="Bank Cost" rows={rows}
    empty={bank ? "No data found" : "Select a bank to view costs"}
    columns={[{ label: g === "month" ? "Month" : "Day" }, { label: "Amount", numeric: true }]}
    controls={<>
      <Select label="Bank" value={bank} onChange={setBank} className="w-44" options={[{ value: "", label: "Select bank" }, ...banks]} />
      <Segmented label="Granularity" value={g} onChange={setG} options={GRANULARITY} />
    </>} />;
}

export default function FiStatisticsPage() {
  const [range, setRange] = useState<DateRange>(todayRange);

  return (
    <div>
      <PageHeader title="FI Statistics"><DateRangeFilter value={range} onApply={setRange} /></PageHeader>

      <div className={`${PANEL} grid gap-5 lg:grid-cols-2`}>
        <CurrencyCard title="Top correspondent banks by no. of outgoing payments" range={range}
          columns={[{ label: "Bank Name" }, { label: "No. of Payments", numeric: true }]}
          load={async (r, c) => (await api.getTopBanksByPaymentCount(r, c)).map((x) => [x.bank, x.payments])} />
        <CurrencyCard title="Top banks by payments volume" range={range}
          columns={[{ label: "Bank Name" }, { label: "Volume", numeric: true }, { label: "No. of Payments", numeric: true }]}
          load={async (r, c) => (await api.getTopBanksByVolume(r, c)).map((x) => [x.bank, x.volume, x.payments])} />
        <CurrencyCard title="Top correspondent banks by cost" range={range}
          columns={[{ label: "Bank Name" }, { label: "Cost of Bank", numeric: true }, { label: "Volume", numeric: true }]}
          load={async (r, c) => (await api.getTopBanksByCost(r, c)).map((x) => [x.bank, x.cost, x.volume])} />
        <CurrencyCard title="Bank Queries" range={range} currencies={CURRENCIES.slice(0, 1)}
          columns={[{ label: "Bank Name" }, { label: "No. of Payments", numeric: true }]}
          load={async (r, c) => (await api.getBankQueries(r, c)).map((x) => [x.bank, x.payments])} />
        <TotalPaymentsCard range={range} />
        <BankCostCard range={range} />
      </div>
    </div>
  );
}
