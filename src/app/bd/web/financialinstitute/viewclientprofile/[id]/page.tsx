"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { PANEL } from "@/components/ui";
import { getClientProfile, type Address, type ClientProfile, type Contact } from "@/lib/api/clients";

type Row = [label: string, value: string | number | undefined];

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

const addressRows = (a: Address | null): Row[] => [
  ["Floor", a?.floor], ["Block / Unit", a?.blockUnit], ["Building Name", a?.buildingName],
  ["Street No. and Name", a?.street], ["State", a?.state], ["Country", a?.country],
];

const contactRows = (c: Contact | undefined): Row[] => [
  ["Referred By", c?.referredBy], ["Referral Partner", c?.referralPartner], ["Mobile Number", c?.mobile],
  ["Phone Area Code", c?.phoneAreaCode], ["Phone Number", c?.phone], ["Fax Area Code", c?.faxAreaCode],
  ["Fax No", c?.fax], ["Website", c?.website], ["Email", c?.email],
];

function Fields({ rows }: { rows: Row[] }) {
  return (
    <dl className="flex-1 divide-y divide-slate/15 bg-[linear-gradient(to_right,var(--color-label)_50%,transparent_50%)]">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-2 text-sm last:border-b last:border-slate/15">
          <dt className="border-r border-slate/20 bg-label px-5 py-3 font-semibold text-night">{label}</dt>
          <dd className="px-5 py-3 break-words text-night">{value === undefined || value === "" ? "" : value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col overflow-hidden rounded-md border border-slate/25 bg-white">
      <header className="flex min-h-14 items-center gap-3 border-b border-slate/20 px-5 py-3">
        <h2 className="mr-auto text-[15px] font-semibold text-navy">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function ContactsDialog({ contacts, dialog }: { contacts: Contact[]; dialog: React.RefObject<HTMLDialogElement | null> }) {
  return (
    <dialog ref={dialog} onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      className="m-auto w-[min(56rem,calc(100%-2rem))] rounded-md bg-white p-0 backdrop:bg-night/50">
      <header className="sticky top-0 z-10 flex items-center bg-white px-6 pt-5 pb-4">
        <h2 className="mr-auto text-xl font-semibold text-navy">View All Contact Details</h2>
        <button type="button" onClick={() => dialog.current?.close()} aria-label="Close"
          className="grid size-8 place-items-center rounded-md bg-mist text-navy transition hover:bg-slate/20">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </header>
      <div className="flex flex-col gap-5 px-6 pb-6">
        {contacts.map((c, i) => {
          const rows = contactRows(c);
          const pairs = Array.from({ length: Math.ceil(rows.length / 2) }, (_, r) => [rows[r * 2], rows[r * 2 + 1]] as const);
          return (
            <table key={i} aria-label={`Contact ${i + 1}`} className="w-full table-fixed border-collapse border border-slate/30 text-sm">
              <colgroup><col className="w-[18%]" /><col className="w-[32%]" /><col className="w-[18%]" /><col className="w-[32%]" /></colgroup>
              <tbody>
                {pairs.map((pair, r) => (
                  <tr key={r}>
                    {pair.map((cell, j) => cell
                      ? [
                          <th key={`l${j}`} scope="row" className="border border-slate/30 bg-label px-4 py-3 text-left font-semibold text-night">{cell[0]}</th>,
                          <td key={`v${j}`} className="border border-slate/30 px-4 py-3 break-words text-night">{cell[1] || ""}</td>,
                        ]
                      : [<td key="e1" className="border border-slate/30 bg-label" />, <td key="e2" className="border border-slate/30" />])}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      </div>
    </dialog>
  );
}

const LIST = "/bd/web/financialinstitute/nbfi";

export default function ViewClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [profile, setProfile] = useState<ClientProfile | null | undefined>(undefined);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => { getClientProfile(id).then(setProfile); }, [id]);

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <h1 className="mr-auto text-xl font-semibold text-navy">View Client Profile</h1>
        <Link href={LIST} onClick={(e) => { if (history.length > 1) { e.preventDefault(); history.back(); } }}
          className="flex h-9 items-center gap-1.5 rounded border border-slate/40 bg-white px-3.5 text-sm font-medium text-navy transition hover:bg-mist">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="m15 18-6-6 6-6" /></svg>
          Back
        </Link>
      </div>

      {profile === undefined && (
        <div className={`${PANEL} grid gap-5 lg:grid-cols-2`}>
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-72 animate-pulse rounded-md border border-slate/25 bg-white" />)}
        </div>
      )}

      {profile === null && (
        <div className={`${PANEL} py-16 text-center text-sm text-slate`}>Client not found.</div>
      )}

      {profile && (
        <>
          <div className={PANEL}>
          <div className="mb-5 overflow-hidden rounded-md border border-slate/25 bg-white lg:w-[calc(50%-0.625rem)]">
            <Fields rows={[["Client Name", profile.clientName]]} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Corporate Client">
              <Fields rows={[
                ["Company Name", profile.companyName],
                ["Country", profile.country],
                ["Date of Incorporation", fmtDate(profile.incorporationDate)],
                ["Business Registration Number", profile.registrationNumber],
                ["Number of Partners", profile.partners],
              ]} />
            </Card>
            <Card title="Client Corporate Address"><Fields rows={addressRows(profile.corporateAddress)} /></Card>
            <Card title="Client Correspondence Address"><Fields rows={addressRows(profile.correspondenceAddress)} /></Card>
            <Card title="Other Details" action={profile.contacts.length > 1 && (
              <button type="button" onClick={() => dialog.current?.showModal()}
                className="h-8 rounded px-3 text-xs font-semibold text-teal transition hover:bg-teal/10">
                View all contacts ({profile.contacts.length})
              </button>
            )}>
              <Fields rows={contactRows(profile.contacts[0])} />
            </Card>
          </div>

          </div>

          <ContactsDialog contacts={profile.contacts} dialog={dialog} />
        </>
      )}
    </div>
  );
}
