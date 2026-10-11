"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { getCurrentUserId, listDemoUsers, setCurrentUserId } from "@/lib/api/mbo";
import { DETAIL_TITLES, type NavIcon, type NavItem } from "./nav";

const ICONS: Record<NavIcon, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  bank: "M3 9 12 4l9 5M5 10v8m4.67-8v8m4.66-8v8M19 10v8M3 20h18",
  briefcase: "M4 8h16v11H4zM9 8V5h6v3M4 13h16",
  report: "M6 3h9l4 4v14H6zM9 12h6M9 16h6M9 8h3",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6.5 6.5 0 0 1 3.5 6",
  chart: "M4 4v15a1 1 0 0 0 1 1h15M8 16v-4M12 16V8M16 16v-6M20 16V6",
  flow: "M4 7h15M15 3l4 4-4 4M20 17H5M9 21l-4-4 4-4",
  calendar: "M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  dot: "",
};

function Icon({ name }: { name: NavIcon }) {
  if (name === "dot") return <span className="mx-[7px] size-1.5 shrink-0 rounded-full bg-current" />;
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

const row = "flex h-10 w-full items-center gap-3 rounded px-3 text-sm font-medium transition";
const idle = "text-white/80 hover:bg-white/10 hover:text-white";
const on = "bg-white/15 text-white";

function Sidebar({ nav, open, onClose }: { nav: NavItem[]; open: boolean; onClose: () => void }) {
  const path = usePathname();
  const [expanded, setExpanded] = useState<string | null>(
    nav.find((n) => n.children?.some((c) => path.startsWith(c.href)))?.label ?? null,
  );

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy text-white transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex h-16 items-center px-6">
        <Logo tone="light" className="h-7 w-auto" />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="Main">
        <ul className="flex flex-col gap-1">
          {nav.map((item) => {
            if (!item.children) {
              const active = path === item.href;
              return (
                <li key={item.label}>
                  <Link href={item.href!} onClick={onClose} className={`${row} ${active ? on : idle}`} aria-current={active ? "page" : undefined}>
                    <Icon name={item.icon} />
                    {item.label}
                  </Link>
                </li>
              );
            }
            const isOpen = expanded === item.label;
            return (
              <li key={item.label}>
                <button type="button" className={`${row} ${idle}`} aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : item.label)}>
                  <Icon name={item.icon} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <svg viewBox="0 0 24 24" className={`size-4 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
                {isOpen && (
                  <ul className="mt-1 ml-[22px] flex flex-col gap-0.5 border-l border-white/20 pl-3">
                    {item.children.map((c) => {
                      const active = path === c.href;
                      return (
                        <li key={c.href}>
                          {c.disabled ? (
                            <span aria-disabled="true" title="Coming soon" className="flex h-9 cursor-not-allowed items-center rounded-md px-3 text-[13px] text-white/35">{c.label}</span>
                          ) : (
                          <Link href={c.href} onClick={onClose} className={`flex h-9 items-center rounded-md px-3 text-[13px] transition ${active ? on : idle}`} aria-current={active ? "page" : undefined}>
                            {c.label}
                          </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

function breadcrumbs(nav: NavItem[], path: string): string[] {
  for (const n of nav) {
    if (n.href === path) return n.href === "/bd/dashboard" ? ["Home"] : ["Home", n.label];
    const c = n.children?.find((c) => c.href === path);
    if (c) return ["Home", n.label, c.label];
  }
  // Detail pages: /bd/web/<section>/<page>/<id> -> parent menu item + DETAIL_TITLES entry.
  const [, , , section, page, sub] = path.split("/");
  const parent = nav.find((n) => n.children?.some((c) => c.href.split("/")[3] === section));
  const title = DETAIL_TITLES[`${page}/${sub}`] ?? DETAIL_TITLES[page];
  if (parent && title) return ["Home", parent.label, title];
  return ["Home"];
}

export function AppShell({ nav, children }: { nav: NavItem[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const crumbs = breadcrumbs(nav, usePathname());
  const [uid, setUid] = useState(getCurrentUserId());
  const users = listDemoUsers();
  const me = users.find((u) => u.id === uid)!;
  const initials = me.name.split(" ").map((w) => w[0]).join("").slice(0, 2);

  return (
    <div className="min-h-dvh bg-mist">
      <Sidebar nav={nav} open={open} onClose={() => setOpen(false)} />
      {open && <div className="fixed inset-0 z-30 bg-night/40 md:hidden" onClick={() => setOpen(false)} />}

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate/20 bg-white px-4 sm:px-6">
          <button type="button" className="-ml-1 rounded-md p-2 text-navy hover:bg-mist md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-sm text-slate">
              {crumbs.map((c, i) => (
                <li key={c} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden>/</span>}
                  {i === crumbs.length - 1
                    ? <span className="font-medium text-teal" aria-current="page">{c}</span>
                    : i === 0 ? <Link href="/bd/dashboard" className="hover:text-navy">{c}</Link> : c}
                </li>
              ))}
            </ol>
          </nav>
          {/* ponytail: demo "View as" switch — replace with the signed-in user's menu once auth exists. */}
          <label className="relative ml-auto flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm font-medium text-night hover:bg-mist">
            <span className="grid size-8 place-items-center rounded-full bg-navy text-xs font-semibold text-white">{initials}</span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span>{me.name}</span>
              <span className="text-[11px] font-normal text-slate">Demo · view as</span>
            </span>
            <svg viewBox="0 0 24 24" className="size-4 text-slate" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="m6 9 6 6 6-6" /></svg>
            <select aria-label="View the portal as" value={uid} className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => { setCurrentUserId(e.target.value); setUid(e.target.value); }}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
            </select>
          </label>
        </header>
        {/* key: switching user remounts the page so it reloads as that person */}
        <main key={uid} className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
