"use client";

import { useState } from "react";
import { PANEL, Segmented, Select, TableCard, useRows } from "@/components/ui";
import { getWidget, type BankRow, type Granularity, type Period, type WidgetId } from "@/lib/api/dashboard";

type Control = "period" | "granularity" | "period+granularity";

const WIDGETS: { id: WidgetId; title: string; column: string; control: Control }[] = [
  { id: "outgoing-payments", title: "Top correspondent banks by no. of outgoing payments", column: "No. of Payments", control: "period" },
  { id: "payments-volume", title: "Top banks by payments volume", column: "Volume", control: "period" },
  { id: "cost", title: "Top correspondent banks by cost", column: "Cost of Bank", control: "period" },
  { id: "payments-count", title: "Top banks by no. of payments", column: "No. of Payments", control: "period" },
  { id: "total-payments", title: "Total no. of payments", column: "No. of Payments", control: "granularity" },
  { id: "bank-cost", title: "Bank Cost", column: "Cost", control: "period+granularity" },
];

const PERIODS: { value: Period; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "60d", label: "Last 60 days" },
  { value: "90d", label: "Last 90 days" },
];

const GRANULARITY: { value: Granularity; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "day", label: "Day" },
];

function Widget({ id, title, column, control }: (typeof WIDGETS)[number]) {
  const hasPeriod = control !== "granularity";
  const hasGran = control !== "period";
  const [period, setPeriod] = useState<Period>("30d");
  const [granularity, setGranularity] = useState<Granularity>("month");
  const rows = useRows<BankRow>(
    () => getWidget(id, { period: hasPeriod ? period : undefined, granularity: hasGran ? granularity : undefined }),
    [id, period, granularity, hasPeriod, hasGran]);

  return (
    <TableCard
      title={title}
      columns={[{ label: "Bank Name" }, { label: column, numeric: true }]}
      rows={rows && rows.map((r) => [r.bank, r.value])}
      controls={<>
        {hasGran && <Segmented label="Granularity" value={granularity} onChange={setGranularity} options={GRANULARITY} />}
        {hasPeriod && <Select label="Period" value={period} onChange={setPeriod} options={PERIODS} />}
      </>}
    />
  );
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-5 text-xl font-semibold text-navy">Dashboard</h1>
      <div className={`${PANEL} grid gap-5 lg:grid-cols-2`}>
        {WIDGETS.map((w) => <Widget key={w.id} {...w} />)}
      </div>
    </div>
  );
}
