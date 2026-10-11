"use client";

import { useState } from "react";
import { big, Filter } from "@/components/client-list";
import { PaymentMap } from "@/components/payment-map";
import { DateRangeFilter, PageHeader, PANEL, Select, TableCard, todayRange, useRows, type DateRange } from "@/components/ui";
import {
  getPaymentCountByCountry, getPaymentsHkToFranceAndUs,
  type CountryCount, type FlowCurrency, type FlowParty,
} from "@/lib/api/payment-flows";

export default function PaymentFlowsPage() {
  const [range, setRange] = useState<DateRange>(todayRange);
  const [currency, setCurrency] = useState<FlowCurrency>("");
  const [party, setParty] = useState<FlowParty>("");
  const q = { range, currency, party };

  const byCountry = useRows<CountryCount>(() => getPaymentCountByCountry(q), [range, currency, party]);
  const hkFrUs = useRows(() => getPaymentsHkToFranceAndUs(q), [range, currency, party]);

  return (
    <div>
      <PageHeader title="Payment Flows"><DateRangeFilter value={range} onApply={setRange} /></PageHeader>

      <div className={`${PANEL} flex flex-col gap-5`}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Filter label="Currency">
            <Select label="Currency" className={big} value={currency} onChange={setCurrency}
              options={[{ value: "", label: "All currencies" }, { value: "USD", label: "USD" }, { value: "HKD", label: "HKD" }]} />
          </Filter>
          <Filter label="Client">
            <Select label="Client" className={big} value={party} onChange={setParty}
              options={[{ value: "", label: "All" }, ...(["Client", "Beneficiary", "Correspondent Bank"] as const).map((v) => ({ value: v, label: v }))]} />
          </Filter>
        </div>

        <section className="rounded-md border border-slate/25">
          <header className="flex min-h-14 items-center border-b border-slate/20 px-5 py-3">
            <h2 className="text-[15px] font-semibold text-navy">Payments on Map</h2>
          </header>
          <div className="p-5">
            {byCountry ? <PaymentMap data={byCountry} /> : <div className="aspect-[96/47] w-full animate-pulse rounded bg-mist" />}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <TableCard title="Payments From Hong Kong to France and US"
            columns={[{ label: "Region Code" }, { label: "Region Name" }, { label: "Country" }, { label: "Count", numeric: true }]}
            rows={hkFrUs && hkFrUs.map((r) => [r.regionCode, r.region, r.country, r.count])} />
          <TableCard title="Payments Count By Region Country" scroll
            columns={[{ label: "Region Name" }, { label: "Country Name" }, { label: "Count", numeric: true }]}
            rows={byCountry && byCountry.map((r) => [r.region, r.country, r.count])} />
        </div>
      </div>
    </div>
  );
}
