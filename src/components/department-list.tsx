"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/client-list";
import { downloadCsv, ExportButton, PageHeader, PANEL, useRows } from "@/components/ui";
import { listDepartmentClients, type Department } from "@/lib/api/clients";

const COLS = ["Client Name", "Status", "Account Type", "Account Number"];

export function DepartmentList({ dept, title }: { dept: Department; title: string }) {
  const router = useRouter();
  const rows = useRows(() => listDepartmentClients(dept), [dept]);
  const href = (account: string) => `/bd/web/cbdbddepartment/viewclientpaymentreports/${account}`;

  return (
    <div>
      <PageHeader title={title}>
        <ExportButton onExport={async () => downloadCsv(`${dept}-department.csv`, COLS,
          (await listDepartmentClients(dept)).map((c) => [c.name, c.status, c.accountType, c.accountNumber]))} />
      </PageHeader>

      <section className={PANEL.replace("p-5", "")}>
        <header className="flex min-h-14 items-center border-b border-slate/20 px-5 py-3">
          <h2 className="mr-auto text-[15px] font-semibold text-navy">Shipment List</h2>
          {rows && <span className="text-xs text-slate">{rows.length} clients</span>}
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="text-left text-xs text-slate">
                {COLS.map((c) => <th key={c} className="px-3 py-3 font-medium first:pl-5 last:pr-5">{c}</th>)}
                <th className="w-12 pr-5"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/15 border-t border-slate/15">
              {rows === null && Array.from({ length: 8 }, (_, i) => (
                <tr key={i}>{[...COLS, ""].map((c) => <td key={c} className="px-3 py-3.5 first:pl-5"><div className="h-4 w-full max-w-32 animate-pulse rounded bg-mist" /></td>)}</tr>
              ))}
              {rows?.length === 0 && (
                <tr><td colSpan={COLS.length + 1} className="px-5 py-12 text-center text-sm text-slate">No records found</td></tr>
              )}
              {rows?.map((c) => (
                // Whole row opens the client's payment reports; the chevron link keeps it keyboard-accessible.
                <tr key={c.accountNumber} onClick={() => router.push(href(c.accountNumber))}
                  className="cursor-pointer text-night hover:bg-mist/60">
                  <td className="py-3 pr-3 pl-5 font-medium">{c.name}</td>
                  <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-3 py-3">{c.accountType}</td>
                  <td className="px-3 py-3 tabular-nums whitespace-nowrap text-night/80">{c.accountNumber}</td>
                  <td className="py-3 pr-5 text-right">
                    <Link href={href(c.accountNumber)} onClick={(e) => e.stopPropagation()} aria-label={`Open payment reports for ${c.name}`}
                      className="inline-grid size-8 place-items-center rounded text-slate hover:bg-mist hover:text-navy">
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="m9 18 6-6-6-6" /></svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
