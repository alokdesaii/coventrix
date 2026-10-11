"use client";

import Link from "next/link";
import { useState } from "react";
import { big, Filter } from "@/components/client-list";
import { Chip, ESC_STATUS, escalationSla as sla } from "@/components/mbo";
import { BackButton, Modal, PageHeader, PANEL, Select, useRows } from "@/components/ui";
import { listEscalations, PERIODS, ROLE_TEMPLATES, type Escalation } from "@/lib/api/mbo";
import { CATEGORY_LABEL, variancePct } from "@/lib/mbo-sla";

const fmtDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
// ponytail: objective titles come from the Sales Rep template until the API returns the employee's role with each escalation
const objectiveTitle = (id?: string) => ROLE_TEMPLATES["sales-rep"].objectives.find((o) => o.id === id)?.title ?? "Not linked";

function Row({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] text-sm">
      <dt className="border-r border-slate/20 bg-label px-3 py-2 font-semibold text-night">{k}</dt>
      <dd className="px-3 py-2 whitespace-pre-line text-night">{v || "—"}</dd>
    </div>
  );
}

function Detail({ e }: { e: Escalation }) {
  const s = sla(e);
  const pct = e.comparison && variancePct(e.comparison.expected, e.comparison.actual);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={ESC_STATUS[e.status].tone}>{ESC_STATUS[e.status].label}</Chip>
        <Chip tone={s.tone}>{s.label}</Chip>
      </div>
      <dl className="divide-y divide-slate/15 overflow-hidden rounded border border-slate/25">
        <Row k="Category" v={CATEGORY_LABEL[e.category]} />
        <Row k="Linked objective" v={objectiveTitle(e.objectiveId)} />
        <Row k="Discovered" v={`${fmtDate(e.discovered)}${e.discoveredTime ? ` · ${e.discoveredTime}` : ""}`} />
        {e.comparison && (
          <Row k="Variance" v={`${pct! > 0 ? "+" : ""}${pct!.toFixed(1)}% · expected HKD ${e.comparison.expected.toLocaleString("en-US")}, actual HKD ${e.comparison.actual.toLocaleString("en-US")} (${fmtDate(e.comparison.from)} – ${fmtDate(e.comparison.to)})`} />
        )}
        <Row k="Impact" v={e.impact} />
        <Row k="Root cause" v={e.rootCause} />
        <Row k="Recovery actions" v={e.recovery} />
        <Row k="Follow-up" v={[e.owner, e.followUp && `by ${fmtDate(e.followUp)}`].filter(Boolean).join(" ")} />
        <Row k="Sent to" v={`${e.recipients.join(", ")}${e.submittedAt ? ` · ${fmtDate(e.submittedAt)}` : " (not sent yet)"}`} />
        {e.l4 && <Row k="Level" v="L4 — bank-relationship issue" />}
        <Row k="Evidence" v={[...e.attachments.map((a) => a.name), e.reference].filter(Boolean).join("\n")} />
      </dl>
    </div>
  );
}

export default function EscalationsPage() {
  const [period, setPeriod] = useState("2026");
  const rows = useRows(() => listEscalations(period), [period]);
  const [open, setOpen] = useState<Escalation | null>(null);
  const drafts = rows?.filter((e) => e.status === "draft").length ?? 0;

  return (
    <div>
      <PageHeader title="My Escalations">
        <Link href={`/bd/web/mbo/escalations/new?period=${period}`} className="flex h-9 items-center rounded bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/90">
          + Raise escalation
        </Link>
        <BackButton href="/bd/web/mbo/my" to="My MBO" />
      </PageHeader>

      <section className={PANEL.replace("p-5", "")}>
        <div className="flex flex-wrap items-end gap-4 border-b border-slate/20 p-5">
          <div className="w-64"><Filter label="Review period"><Select label="Review period" className={big} value={period} onChange={setPeriod} options={PERIODS} /></Filter></div>
          <p className="ml-auto max-w-md text-xs text-slate">
            ≥10% variances and capacity issues: in writing within 3 business days. Bank-relationship or query risk: the same day.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead className="text-left text-xs text-slate">
              <tr>
                <th className="py-3 pr-3 pl-5 font-medium">Issue</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Discovered</th>
                <th className="px-3 py-3 font-medium">SLA</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="py-3 pr-5 pl-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate/15 border-t border-slate/15">
              {rows === null && [0, 1, 2].map((i) => (
                <tr key={i}>{[0, 1, 2, 3, 4, 5].map((j) => <td key={j} className="px-3 py-3.5 first:pl-5"><div className="h-4 w-24 animate-pulse rounded bg-mist" /></td>)}</tr>
              ))}
              {rows?.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate">No escalations for {period}.</td></tr>
              )}
              {rows?.map((e) => {
                const s = sla(e);
                return (
                  <tr key={e.id} className="text-night hover:bg-mist/60">
                    <td className="py-3 pr-3 pl-5">
                      <p className="font-semibold">{e.title}</p>
                      <p className="mt-0.5 text-xs text-slate">{objectiveTitle(e.objectiveId)}</p>
                    </td>
                    <td className="px-3 py-3">{CATEGORY_LABEL[e.category]}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{fmtDate(e.discovered)}</td>
                    <td className="px-3 py-3"><Chip tone={s.tone}>{s.label}</Chip></td>
                    <td className="px-3 py-3"><Chip tone={ESC_STATUS[e.status].tone}>{ESC_STATUS[e.status].label}</Chip></td>
                    <td className="py-3 pr-5 pl-3 text-right whitespace-nowrap">
                      {e.status === "draft"
                        ? <Link href={`/bd/web/mbo/escalations/new?draft=${e.id}&period=${period}`} className="inline-flex h-8 items-center rounded px-3 text-xs font-semibold text-navy hover:bg-mist">Continue draft</Link>
                        : <button type="button" onClick={() => setOpen(e)} className="h-8 rounded px-3 text-xs font-semibold text-navy hover:bg-mist">View</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate/20 px-5 py-3 text-xs text-slate">
          {rows ? `${rows.length} escalation${rows.length === 1 ? "" : "s"}${drafts ? ` · ${drafts} draft${drafts > 1 ? "s" : ""} not yet sent — a draft is not a written escalation` : ""}` : "Loading…"}
        </div>
      </section>

      <Modal open={!!open} title={open?.title ?? ""} width="40rem" onClose={() => setOpen(null)}>
        {open && <Detail e={open} />}
      </Modal>
    </div>
  );
}
