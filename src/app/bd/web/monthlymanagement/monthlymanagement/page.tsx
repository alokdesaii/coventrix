"use client";

import { useEffect, useState } from "react";
import { PageHeader, PANEL, Select, TableCard, Tabs } from "@/components/ui";
import {
  getMonthlyReport, saveMonthlyEntries,
  type EntryRow, type MonthlyEntries, type MonthlyReport, type Side,
} from "@/lib/api/monthly";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const TABS = ["General Information", "Clients & Banks", "Products", "Other Information"] as const;
type Tab = (typeof TABS)[number];
const SIDES: { key: Side; label: string }[] = [{ key: "corporate", label: "Corporate" }, { key: "msb", label: "MSB" }];

const num = (n: number, dp = 2) => n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const monthName = (m: number) => MONTHS[m - 1]?.slice(0, 3) ?? String(m);
const input = "h-9 w-full rounded border border-slate/40 bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20";

// ---------- building blocks ----------

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-[15px] font-semibold text-navy">{children}</h2>;
}

/** Label/value table with the shaded label column (same style as the client profile). */
function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    // Gradient keeps the label column shaded to the bottom when a neighbouring card stretches this one.
    <dl className="h-full overflow-hidden rounded-md border border-slate/25 divide-y divide-slate/15 bg-[linear-gradient(to_right,var(--color-label)_50%,white_50%)]">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-2 bg-white text-sm">
          <dt className="border-r border-slate/20 bg-label px-4 py-2.5 font-semibold text-night">{k}</dt>
          <dd className="px-4 py-2.5 text-night tabular-nums">{v === "" || v === undefined ? "—" : v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** List of manually entered two-field rows with an add row underneath. */
function EntryList({ fields, rows, onChange }: { fields: [string, string]; rows: EntryRow[]; onChange: (rows: EntryRow[]) => void }) {
  const [draft, setDraft] = useState<EntryRow>(["", ""]);
  const add = () => {
    if (!draft[0].trim() && !draft[1].trim()) return;
    onChange([...rows, [draft[0].trim(), draft[1].trim()]]);
    setDraft(["", ""]);
  };
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate">
          <th className="w-1/2 py-2.5 pr-2 pl-4 font-medium">{fields[0]}</th>
          <th className="border-l border-slate/15 py-2.5 pr-2 pl-3 font-medium">{fields[1]}</th>
          <th className="w-14 pr-4" />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate/15 border-t border-slate/20">
        {rows.map((r, i) => (
          <tr key={i} className="text-night">
            <td className="py-2.5 pr-2 pl-4">{r[0] || "—"}</td>
            <td className="border-l border-slate/15 py-2.5 pr-2 pl-3">{r[1] || "—"}</td>
            <td className="py-1 pr-4 text-right">
              <button type="button" aria-label={`Remove ${r[0]}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}
                className="grid size-8 place-items-center rounded-md text-slate hover:bg-red-50 hover:text-red-600">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </td>
          </tr>
        ))}
        <tr>
          <td className="py-2.5 pr-2 pl-4"><input className={input} placeholder={fields[0]} aria-label={fields[0]} value={draft[0]}
            onChange={(e) => setDraft([e.target.value, draft[1]])} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} /></td>
          <td className="border-l border-slate/15 py-2.5 pr-2 pl-3"><input className={input} placeholder={fields[1]} aria-label={fields[1]} value={draft[1]}
            onChange={(e) => setDraft([draft[0], e.target.value])} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} /></td>
          <td className="py-2.5 pr-4 text-right">
            <button type="button" onClick={add} aria-label="Add row"
              className="grid size-9 place-items-center rounded bg-navy text-white transition hover:bg-navy/90">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-slate/25">
      <h3 className="border-b border-slate/20 bg-label px-4 py-2.5 text-xs font-semibold tracking-wide text-navy uppercase">{title}</h3>
      {children}
    </div>
  );
}

// ---------- tabs ----------

function GeneralTab({ r }: { r: MonthlyReport }) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <Heading>MBO</Heading>
        <div className="lg:w-1/2">
          <KV rows={[["MBO Target Revenue", r.mbo.targetRevenue], ["MBO Target Net Profit", r.mbo.targetNetProfit], ["MBO Target Cost-Income Ratio", r.mbo.targetCostIncomeRatio]]} />
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <div>
          <Heading>YTD</Heading>
          <KV rows={[["YTD Revenue", num(r.ytd.revenue)], ["YTD Expenses", num(r.ytd.expenses)], ["YTD Net Profit", num(r.ytd.netProfit)], ["YTD Cost-Income Ratio", `${num(r.ytd.costIncomeRatio)}%`]]} />
        </div>
        <div>
          <Heading>Last Month</Heading>
          <KV rows={[["Revenue", num(r.lastMonth.revenue)], ["Expenses", num(r.lastMonth.expenses)], ["Net Profit", num(r.lastMonth.netProfit)]]} />
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <TableCard title="Top 5 Currencies" columns={[{ label: "Currency" }, { label: "Count", numeric: true }]}
          rows={(r.topCurrencies.map((x) => [x.currency, x.count]))} />
        <TableCard title="Number of Transactions" columns={[{ label: "Type" }, { label: "Count", numeric: true }]}
          rows={(r.transactionsByType.map((x) => [x.type, x.count]))} />
        <TableCard title="Year Wise Transactions" scroll columns={[{ label: "Month" }, { label: "Year" }, { label: "Count", numeric: true }]}
          rows={(r.yearWiseTransactions.map((x) => [monthName(x.month), String(x.year), x.count]))} />
        <TableCard title="Year Wise Gross Profit" scroll columns={[{ label: "Month" }, { label: "Year" }, { label: "Amount", numeric: true }]}
          rows={(r.yearWiseGrossProfit.map((x) => [monthName(x.month), String(x.year), num(x.amount)]))} />
      </section>
    </div>
  );
}

type CountedKey = "newClients" | "accountsClosed" | "rejected";

function ClientsBanksTab({ r, e, set }: { r: MonthlyReport; e: MonthlyEntries; set: (fn: (e: MonthlyEntries) => MonthlyEntries) => void }) {
  const counted = (key: CountedKey, title: string, totalLabel: string, fields: [string, string]) => (
    <section>
      <Heading>{title}</Heading>
      <div className="grid gap-5 lg:grid-cols-2">
        {SIDES.map(({ key: side, label }) => (
          <Box key={side} title={label}>
            <label className="flex items-center gap-3 border-b border-slate/20 px-4 py-2.5 text-sm text-night">
              <span className="flex-1">{totalLabel}: <span className="text-slate">total no.</span></span>
              <input className={input.replace("w-full", "w-28 shrink-0")} inputMode="numeric" value={e[key][side].total}
                onChange={(ev) => set((x) => ({ ...x, [key]: { ...x[key], [side]: { ...x[key][side], total: ev.target.value.replace(/\D/g, "") } } }))} />
            </label>
            <EntryList fields={fields} rows={e[key][side].rows}
              onChange={(rows) => set((x) => ({ ...x, [key]: { ...x[key], [side]: { ...x[key][side], rows } } }))} />
          </Box>
        ))}
      </div>
    </section>
  );

  return (
    <div className="flex flex-col gap-8">
      {counted("newClients", "New Clients On-Boarded", "New clients on-boarded", ["Client Name", "Account Number"])}
      {counted("accountsClosed", "Accounts Closed", "Accounts closed", ["Client Name", "Account Number"])}
      {counted("rejected", "Potential New Clients Rejected", "Potential new clients rejected", ["Client Name", "Reason of Rejection"])}

      <section>
        <Heading>Meetings</Heading>
        <div className="grid gap-5 lg:grid-cols-2">
          {SIDES.map(({ key: side, label }) => (
            <Box key={side} title={`${label} meetings`}>
              <EntryList fields={["Client Name", "Account Number"]} rows={e.meetings[side].rows}
                onChange={(rows) => set((x) => ({ ...x, meetings: { ...x.meetings, [side]: { rows } } }))} />
            </Box>
          ))}
        </div>
      </section>

      <section>
        <Heading>Top 10 Clients By Gross Profit</Heading>
        <div className="grid gap-5 lg:grid-cols-2">
          {SIDES.map(({ key: side, label }) => (
            <TableCard key={side} title={label}
              columns={[{ label: "Client Name" }, { label: "Account Number" }, { label: "Profit (HKD)", numeric: true }]}
              rows={r.topClientsByProfit[side].map((x) => [x.client, x.account, num(x.profit)])} />
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div>
          <Heading>Banks (Accounts Opened)</Heading>
          <Box title="Banks">
            <EntryList fields={["Accounts Opened", "Currency"]} rows={e.banksOpened} onChange={(rows) => set((x) => ({ ...x, banksOpened: rows }))} />
          </Box>
        </div>
        <div>
          <Heading>Bank Tracer</Heading>
          <Box title="Bank tracer">
            <EntryList fields={["Bank Tracer", "Status"]} rows={e.bankTracer} onChange={(rows) => set((x) => ({ ...x, bankTracer: rows }))} />
          </Box>
        </div>
      </section>

      <section>
        <Heading>Bank Rank by Cost and No. of Payments</Heading>
        <div className="grid gap-5 lg:grid-cols-2">
          <TableCard title="By Cost" columns={[{ label: "Bank" }, { label: "Cost", numeric: true }]}
            rows={r.bankRankByCost.map((x) => [x.bank, num(x.cost)])} />
          <TableCard title="By Number of Payments" columns={[{ label: "Bank" }, { label: "Number of Payments", numeric: true }]}
            rows={r.bankRankByPayments.map((x) => [x.bank, x.payments])} />
        </div>
      </section>
    </div>
  );
}

function ProductsTab({ r }: { r: MonthlyReport }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-5 lg:grid-cols-2">
        <div>
          <Heading>Bank Notes</Heading>
          <TableCard title="Total Number of Transactions" scroll columns={[{ label: "Year" }, { label: "Month" }, { label: "Count", numeric: true }]}
            rows={r.bankNoteTransactions.map((x) => [String(x.year), monthName(x.month), x.count])} />
        </div>
        <div>
          <Heading>Currencies</Heading>
          <TableCard title="Top 10 Currencies (No. of Transactions)" scroll
            columns={[{ label: "Currency" }, { label: "Count", numeric: true }, { label: "Last Month Count", numeric: true }]}
            rows={r.topCurrenciesProducts.map((x) => [x.currency, x.count, x.lastMonthCount])} />
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <KV rows={[["Bank Notes Sold to Bank", r.bankNotesSoldToBank.amount], ["Total Deals", r.bankNotesSoldToBank.totalDeals]]} />
        <KV rows={[["Bank Notes Sold to Corporate and MSB Clients", r.bankNotesSoldToClients.amount], ["Total Deals", r.bankNotesSoldToClients.totalDeals]]} />
      </section>
    </div>
  );
}

const NOTES: [keyof MonthlyEntries["notes"], string][] = [
  ["marketNews", "Relevant Market News"], ["correspondentBanks", "Correspondent Banks"],
  ["compliance", "Compliance"], ["it", "IT"], ["otherTopics", "Other Topics"],
];

function OtherTab({ e, set }: { e: MonthlyEntries; set: (fn: (e: MonthlyEntries) => MonthlyEntries) => void }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {NOTES.map(([k, label]) => (
        <label key={k} className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-night/70">{label}</span>
          <textarea rows={4} value={e.notes[k]} onChange={(ev) => set((x) => ({ ...x, notes: { ...x.notes, [k]: ev.target.value } }))}
            className="w-full resize-y rounded border border-slate/40 bg-white px-3 py-2 text-sm text-night outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" />
        </label>
      ))}
    </div>
  );
}

// ---------- page ----------

export default function MonthlyManagementPage() {
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [tab, setTab] = useState<Tab>("General Information");
  const [loaded, setLoaded] = useState<{ month: string; report: MonthlyReport } | null>(null);
  const [entries, setEntries] = useState<MonthlyEntries | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let live = true;
    getMonthlyReport(Number(month)).then((r) => { if (live) { setLoaded({ month, report: r }); setEntries(r.entries); setDirty(false); } });
    return () => { live = false; };
  }, [month]);

  const report = loaded?.month === month ? loaded.report : null;
  const set = (fn: (e: MonthlyEntries) => MonthlyEntries) => { setEntries((e) => (e ? fn(e) : e)); setDirty(true); setNotice(""); };
  const editable = tab === "Clients & Banks" || tab === "Other Information";

  return (
    <div>
      <PageHeader title="Monthly Management Report">
        <span className="text-sm font-medium text-slate">Month</span>
        <Select label="Month" className="w-40 [&_select]:h-9 [&_select]:text-sm" value={month}
          onChange={(v) => { if (!dirty || confirm("Discard unsaved changes for this month?")) setMonth(v); }}
          options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
      </PageHeader>

      <div className={PANEL}>
        <Tabs label="Report sections" tabs={TABS} value={tab} onChange={setTab} />

        {!report || !entries ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-md bg-mist" />)}
          </div>
        ) : (
          <>
            {tab === "General Information" && <GeneralTab r={report} />}
            {tab === "Clients & Banks" && <ClientsBanksTab r={report} e={entries} set={set} />}
            {tab === "Products" && <ProductsTab r={report} />}
            {tab === "Other Information" && <OtherTab e={entries} set={set} />}

            {editable && (
              <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
                {notice && <p role="status" className="mr-auto text-sm text-[#00857d]">{notice}</p>}
                {!notice && dirty && <p className="mr-auto text-sm text-slate">You have unsaved changes for {MONTHS[Number(month) - 1]}.</p>}
                <button type="button" disabled={!dirty || saving}
                  onClick={async () => {
                    setSaving(true);
                    try { await saveMonthlyEntries(Number(month), entries); setDirty(false); setNotice("Saved."); }
                    catch { setNotice("Could not save. Please try again."); }
                    finally { setSaving(false); }
                  }}
                  className="h-10 rounded bg-navy px-6 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
