"use client";

import Image from "next/image";
import { useState } from "react";
import { Logo } from "@/components/logo";
import type { Department } from "@/lib/api/auth";
import { LoginForm } from "./login-card";

const DEPARTMENTS: { id: Department; label: string; img: string }[] = [
  { id: "bd-cbd", label: "BD/CBD", img: "img-block-bd.png" },
  { id: "it", label: "IT", img: "img-block-it.png" },
  { id: "marketing", label: "Marketing", img: "img-block-marketing.png" },
  { id: "legal", label: "Legal", img: "img-block-legal.png" },
  { id: "customer-service", label: "Customer Service", img: "img-block-cs.png" },
  { id: "payment", label: "Payment", img: "img-block-payments.png" },
  { id: "compliance", label: "Compliance", img: "img-block-compliance.png" },
];

const BADGES = ["digicert", "iso-certified", "secured-platform", "password-security", "transaction-alerts", "3-eye"];
const POWERED_BY = ["qor3-plus-white", "edge-plus", "conentrix", "digiqor-plus", "ficoy-plus", "xirni", "h-intelligence", "prolink-plus"];
const SITE = "https://coventrix.harbourandhills.com";

export default function LoginPage() {
  const [active, setActive] = useState<Department | null>(null);

  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top_left,#00bfb340,transparent_55%),linear-gradient(160deg,#023e63,#012a45_60%,#000c14)] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:py-14">
        <header className="flex justify-center">
          <Logo tone="light" className="h-10 w-auto sm:h-12" />
        </header>

        <section aria-label="Select your department" className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {DEPARTMENTS.map((d) => {
            const open = active === d.id;
            return (
              <div key={d.id}
                className={`relative aspect-[5/6] overflow-hidden rounded-md ring-2 transition ${open ? "ring-teal" : "ring-white/80 hover:ring-teal"}`}>
                <Image src={`/assets/login/${d.img}`} alt="" fill sizes="(min-width:768px) 25vw, 50vw"
                  className={`object-cover transition duration-300 ${open ? "scale-105 blur-sm" : ""}`} />
                {open ? (
                  <div className="absolute inset-0 bg-navy/85 backdrop-blur-sm">
                    <LoginForm department={d.id} onBack={() => setActive(null)} />
                  </div>
                ) : (
                  <button type="button" onClick={() => setActive(d.id)}
                    className="absolute inset-x-3 bottom-3 h-10 rounded-md bg-white text-sm font-semibold text-navy shadow-md transition hover:bg-mist focus-visible:outline-2 focus-visible:outline-teal">
                    {d.label}
                  </button>
                )}
              </div>
            );
          })}
        </section>

        <section className="grid gap-8 border-t border-white/20 pt-8 md:grid-cols-12">
          <div className="md:col-span-5">
            <h2 className="mb-3 text-sm font-semibold">Security Information</h2>
            <ul className="list-disc space-y-2 pl-4 text-xs leading-relaxed text-slate marker:text-teal">
              <li>Before logging in, please ensure that the URL address on the address bar of your internet browser starts with <a className="text-teal hover:underline" href={SITE}>{SITE}</a>.</li>
              <li>Never share your PIN, OTP, User ID, or Password with anyone. Sharing these details can lead to unauthorized access to your account.</li>
              <li>Do not enter login or other sensitive information in any pop up window.</li>
              <li>Contact us at <a className="text-teal hover:underline" href="mailto:tech.support@harbourandhills.com">tech.support@harbourandhills.com</a> for any issue related to login.</li>
              <li>The URL is inaccessible in sanctioned/embargoed countries.</li>
            </ul>
          </div>
          <div className="md:col-span-7">
            <h2 className="mb-3 text-sm font-semibold">Digital Security</h2>
            <ul className="list-disc pl-4 text-xs leading-relaxed text-slate marker:text-teal">
              <li>Before logging in, please ensure that the URL address on the address bar of your internet browser starts with <a className="text-teal hover:underline" href={SITE}>{SITE}</a>.</li>
            </ul>
            <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {BADGES.map((b) => (
                <li key={b} className="flex h-14 items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/assets/login/${b}.svg`} alt={b.replace(/-/g, " ")} className="max-h-full max-w-full" />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="border-t border-white/20 pt-8 text-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-slate">Powered by</p>
          <ul className="flex flex-wrap items-center justify-center gap-3">
            {POWERED_BY.map((p) => (
              <li key={p}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/assets/login/${p}.svg`} alt={p.replace(/-/g, " ")} className="h-6 w-auto" />
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-slate">© {new Date().getFullYear()} Harbour and Hills Financial Services Limited</p>
        </footer>
      </div>
    </main>
  );
}
