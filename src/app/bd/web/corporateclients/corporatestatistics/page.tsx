"use client";

import { useState } from "react";
import { DateRangeFilter, PageHeader, PANEL, TableCard, todayRange, useRows, type Cell, type DateRange } from "@/components/ui";
import * as api from "@/lib/api/corporate-statistics";

export default function CorporateStatisticsPage() {
  const [range, setRange] = useState<DateRange>(todayRange);

  const profit = useRows<Cell[]>(async () => (await api.getTopClientsByProfit(range)).map((r) => [r.client, r.balance]), [range]);
  const payments = useRows<Cell[]>(async () => (await api.getTopClientsByPayments(range)).map((r) => [r.client, r.payments]), [range]);
  const queries = useRows<Cell[]>(async () => (await api.getTopClientsByQueries(range)).map((r) => [r.client, r.queries]), [range]);
  const active = useRows<Cell[]>(async () => { const r = await api.getActiveInactive(range); return [[r.active, r.inactive]]; }, [range]);
  const industry = useRows<Cell[]>(async () => (await api.getClientsPerIndustry(range)).map((r) => [r.industry, r.count]), [range]);
  const country = useRows<Cell[]>(async () => (await api.getClientsPerCountry(range)).map((r) => [r.country || "Not specified", r.count]), [range]);

  return (
    <div>
      <PageHeader title="Corporate Statistics"><DateRangeFilter value={range} onApply={setRange} /></PageHeader>
      <div className={`${PANEL} grid gap-5 lg:grid-cols-2`}>
        <TableCard title="Top Clients By Total Profit" rows={profit}
          columns={[{ label: "Client Name" }, { label: "Balance", numeric: true }]} />
        <TableCard title="Top Clients By Commercial Payments" rows={payments}
          columns={[{ label: "Client Name" }, { label: "No. of Payments", numeric: true }]} />
        <TableCard title="Top Clients By Queries" rows={queries}
          columns={[{ label: "Client Name" }, { label: "No. of Queries", numeric: true }]} />
        <TableCard title="Active / Inactive Clients" rows={active}
          columns={[{ label: "Active Clients" }, { label: "Inactive Clients" }]} />
        <TableCard title="Clients Per Industry" rows={industry} scroll
          columns={[{ label: "Industry" }, { label: "Count", numeric: true }]} />
        <TableCard title="Clients Per Country" rows={country} scroll
          columns={[{ label: "Country" }, { label: "Count", numeric: true }]} />
      </div>
    </div>
  );
}
