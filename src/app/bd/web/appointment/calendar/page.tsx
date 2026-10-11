"use client";

import type { EventClickArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, PageHeader, Segmented } from "@/components/ui";
import {
  createAppointment, deleteAppointment, listAppointments, saveMinutes,
  type Appointment, type MeetingMode, type MinutesOfMeeting,
} from "@/lib/api/appointments";

const VIEWS = [
  { value: "dayGridMonth", label: "Month" },
  { value: "timeGridWeek", label: "Week" },
  { value: "timeGridDay", label: "Day" },
  { value: "listWeek", label: "List" },
] as const;
type View = (typeof VIEWS)[number]["value"];

const field = "h-10 w-full rounded border border-slate/40 bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20";
const primary = "h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40";
const secondary = "h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist";

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
// <input type="datetime-local"> wants local "yyyy-mm-ddThh:mm".
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const TIME_ZONES = Array.from(new Set([TZ, "Asia/Hong_Kong", "Asia/Singapore", "Asia/Dubai", "Asia/Kolkata", "Europe/London", "America/New_York", "UTC"]));

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5"><span className="text-xs font-medium text-night/70">{text}</span>{children}</label>;
}

// ---------- Create event ----------

function CreateEventForm({ initialStart, mode, onCreated, onCancel }: {
  initialStart: Date; mode: MeetingMode; onCreated: (a: Appointment) => void; onCancel: () => void;
}) {
  const [f, setF] = useState({
    title: "", description: "", guests: "", start: toLocalInput(initialStart),
    end: toLocalInput(new Date(initialStart.getTime() + 60 * 60_000)), timeZone: TZ, mode,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  return (
    <form className="flex flex-col gap-4" onSubmit={async (e) => {
      e.preventDefault();
      const guests = f.guests.split(/[,\s]+/).filter(Boolean);
      const bad = guests.find((g) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g));
      if (!f.title.trim()) return setError("Event title is required.");
      if (f.end <= f.start) return setError("End must be after start.");
      if (bad) return setError(`"${bad}" is not a valid email address.`);
      setSaving(true);
      try {
        onCreated(await createAppointment({
          title: f.title.trim(), description: f.description.trim(), attendees: guests, mode: f.mode as MeetingMode,
          start: new Date(f.start).toISOString(), end: new Date(f.end).toISOString(), timeZone: f.timeZone,
        }));
      } catch { setError("Could not create the event. Please try again."); setSaving(false); }
    }}>
      <Label text="Event Title"><input className={field} autoFocus value={f.title} onChange={(e) => set("title", e.target.value)} /></Label>
      <Label text="Event Description">
        <textarea rows={3} className={`${field} h-auto py-2`} value={f.description} onChange={(e) => set("description", e.target.value)} />
      </Label>
      <Label text="Guests"><input className={field} placeholder="Add guest emails, separated by commas" value={f.guests} onChange={(e) => set("guests", e.target.value)} /></Label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label text="Start Date & Time"><input type="datetime-local" className={field} value={f.start} onChange={(e) => set("start", e.target.value)} /></Label>
        <Label text="End Date & Time"><input type="datetime-local" className={field} value={f.end} min={f.start} onChange={(e) => set("end", e.target.value)} /></Label>
        <Label text="Time Zone">
          <select className={field} value={f.timeZone} onChange={(e) => set("timeZone", e.target.value)}>
            {TIME_ZONES.map((z) => <option key={z}>{z}</option>)}
          </select>
        </Label>
        <Label text="Meeting Type">
          <select className={field} value={f.mode} onChange={(e) => set("mode", e.target.value)}>
            <option>Online</option><option>Offline</option>
          </select>
        </Label>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 border-t border-slate/20 pt-4">
        <button type="button" className={secondary} onClick={onCancel}>Cancel</button>
        <button className={primary} disabled={saving}>{saving ? "Creating…" : "Create Event"}</button>
      </div>
    </form>
  );
}

// ---------- Minutes of meeting ----------

function MinutesForm({ initial, eventId, onSaved, onCancel }: {
  initial?: MinutesOfMeeting; eventId?: string; onSaved: () => void; onCancel: () => void;
}) {
  const [m, setM] = useState<MinutesOfMeeting>(initial ?? { title: "", at: new Date().toISOString(), notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <form className="flex flex-col gap-4" onSubmit={async (e) => {
      e.preventDefault();
      if (!m.title.trim() || !m.notes.trim()) return setError("Meeting title and minutes are required.");
      setSaving(true);
      try { await saveMinutes(m, eventId); onSaved(); }
      catch { setError("Could not save the minutes. Please try again."); setSaving(false); }
    }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label text="Meeting Date & Time">
          <input type="datetime-local" className={field} value={toLocalInput(new Date(m.at))}
            onChange={(e) => e.target.value && setM({ ...m, at: new Date(e.target.value).toISOString() })} />
        </Label>
        <Label text="Meeting Title"><input className={field} value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} /></Label>
      </div>
      <Label text="Minutes">
        <textarea rows={10} className={`${field} h-auto py-2 leading-relaxed`} placeholder="Discussion points, decisions, action items…"
          value={m.notes} onChange={(e) => setM({ ...m, notes: e.target.value })} />
      </Label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 border-t border-slate/20 pt-4">
        <button type="button" className={secondary} onClick={onCancel}>Cancel</button>
        <button className={primary} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

// ---------- Event details ----------

function EventDetails({ ev, onAddMom, onDelete }: { ev: Appointment; onAddMom: () => void; onDelete: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  const rows: [string, React.ReactNode][] = [
    ["Start", fmt(ev.start)],
    ["End", fmt(ev.end)],
    ["Description", ev.description],
    ["Meeting Type", ev.mode],
    ["Meeting Status", ev.status],
    ["Created By", `${ev.createdBy.name} (${ev.createdBy.email})`],
    ["Meeting ID", ev.meetingId],
    ["Meeting Link", ev.meetingLink && <a href={ev.meetingLink} target="_blank" rel="noreferrer" className="text-teal hover:underline">{ev.meetingLink}</a>],
    ["Attendees", ev.attendees.length ? ev.attendees.join(", ") : undefined],
  ];
  return (
    <div className="flex flex-col gap-4">
      <p className="text-base font-semibold text-night">{ev.title}</p>
      <dl className="divide-y divide-slate/15 overflow-hidden rounded border border-slate/25 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[9rem_1fr]">
            <dt className="border-r border-slate/20 bg-label px-3 py-2 font-semibold text-night">{k}</dt>
            <dd className="px-3 py-2 break-words text-night">{v || "—"}</dd>
          </div>
        ))}
      </dl>
      {ev.mom && (
        <div className="rounded border border-slate/25 p-3">
          <p className="mb-1 text-xs font-semibold tracking-wide text-slate uppercase">Minutes of meeting</p>
          <p className="text-sm whitespace-pre-line text-night">{ev.mom.notes}</p>
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-3 border-t border-slate/20 pt-4">
        <button type="button" disabled={deleting}
          onClick={async () => { if (confirm(`Delete "${ev.title}"? This also removes it for attendees.`)) { setDeleting(true); await onDelete(); } }}
          className="h-10 rounded border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40">
          {deleting ? "Deleting…" : "Delete Event"}
        </button>
        <button type="button" className={primary} onClick={onAddMom}>{ev.mom ? "Edit MOM" : "Add MOM"}</button>
      </div>
    </div>
  );
}

// ---------- Page ----------

type Dialog =
  | { kind: "create"; start: Date }
  | { kind: "view"; ev: Appointment }
  | { kind: "mom"; ev?: Appointment }
  | null;

export default function AppointmentCalendarPage() {
  const cal = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<Appointment[] | null>(null);
  const [mode, setMode] = useState<MeetingMode>("Online");
  const [view, setView] = useState<View>("dayGridMonth");
  const [title, setTitle] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);

  const reload = () => listAppointments().then(setEvents);
  useEffect(() => { reload(); }, []);

  const shown: EventInput[] = useMemo(() => (events ?? []).filter((e) => e.mode === mode).map((e) => ({
    id: e.id, title: e.title, start: e.start, end: e.end, classNames: [`mode-${e.mode.toLowerCase()}`],
  })), [events, mode]);

  const api = () => cal.current?.getApi();
  const navBtn = "grid size-9 place-items-center rounded border border-slate/40 bg-white text-navy transition hover:bg-mist";

  return (
    <div>
      <PageHeader title="Appointments" />

      <div className="grid gap-5 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-5">
          <section className="rounded-md bg-navy p-5 text-white">
            <h2 className="text-[15px] font-semibold">Minutes of Meeting</h2>
            <p className="mt-1 text-xs text-white/70">Record minutes for a meeting that isn&apos;t on the calendar.</p>
            <button type="button" onClick={() => setDialog({ kind: "mom" })}
              className="mt-4 h-9 rounded bg-teal px-4 text-sm font-semibold text-ink transition hover:brightness-105">MOM</button>
          </section>

          <section className="rounded-md border border-slate/20 bg-white p-5">
            <h2 className="mb-3 text-[15px] font-semibold text-navy">Meeting type</h2>
            <Segmented label="Meeting type" value={mode} onChange={setMode}
              options={[{ value: "Online", label: "Online" }, { value: "Offline", label: "Offline" }]} />
            <p className="mt-3 flex items-center gap-2 text-xs text-slate">
              <span className={`size-2.5 rounded-sm ${mode === "Online" ? "bg-navy" : "bg-teal"}`} />
              Showing {mode.toLowerCase()} meetings
            </p>
          </section>
        </aside>

        <section className="rounded-md border border-slate/20 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button type="button" className={`${primary} h-9 px-4`} onClick={() => setDialog({ kind: "create", start: nextHour() })}>
              + Create Event
            </button>
            <button type="button" aria-label="Previous" className={navBtn} onClick={() => api()?.prev()}>
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button type="button" aria-label="Next" className={navBtn} onClick={() => api()?.next()}>
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="m9 18 6-6-6-6" /></svg>
            </button>
            <button type="button" className={`${secondary} h-9 px-4`} onClick={() => api()?.today()}>Today</button>
            <h2 className="mx-auto px-2 text-lg font-semibold text-navy">{title}</h2>
            <Segmented label="Calendar view" value={view} onChange={(v) => { setView(v); api()?.changeView(v); }} options={[...VIEWS]} />
          </div>

          <FullCalendar
            ref={cal}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={view}
            headerToolbar={false}
            height="auto"
            firstDay={0}
            nowIndicator
            dayMaxEvents={3}
            eventDisplay="block"
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            events={shown}
            datesSet={(arg) => setTitle(arg.view.title)}
            dateClick={(arg: DateClickArg) => {
              const start = arg.allDay ? new Date(arg.date.getFullYear(), arg.date.getMonth(), arg.date.getDate(), 9) : arg.date;
              setDialog({ kind: "create", start });
            }}
            eventClick={(arg: EventClickArg) => {
              const ev = events?.find((e) => e.id === arg.event.id);
              if (ev) setDialog({ kind: "view", ev });
            }}
          />
          {events === null && <p className="mt-3 text-xs text-slate">Loading appointments…</p>}
        </section>
      </div>

      <Modal open={dialog?.kind === "create"} title="Create Event" width="40rem" onClose={() => setDialog(null)}>
        {dialog?.kind === "create" && (
          <CreateEventForm initialStart={dialog.start} mode={mode} onCancel={() => setDialog(null)}
            onCreated={async (a) => { await reload(); if (a.mode !== mode) setMode(a.mode); setDialog(null); }} />
        )}
      </Modal>

      <Modal open={dialog?.kind === "view"} title="Event Details" width="36rem" onClose={() => setDialog(null)}>
        {dialog?.kind === "view" && (
          <EventDetails ev={dialog.ev} onAddMom={() => setDialog({ kind: "mom", ev: dialog.ev })}
            onDelete={async () => { await deleteAppointment(dialog.ev.id); await reload(); setDialog(null); }} />
        )}
      </Modal>

      <Modal open={dialog?.kind === "mom"} title="Minutes of Meeting" width="44rem" onClose={() => setDialog(null)}>
        {dialog?.kind === "mom" && (
          <MinutesForm eventId={dialog.ev?.id}
            initial={dialog.ev ? (dialog.ev.mom ?? { title: dialog.ev.title, at: dialog.ev.start, notes: "" }) : undefined}
            onCancel={() => setDialog(null)} onSaved={async () => { await reload(); setDialog(null); }} />
        )}
      </Modal>
    </div>
  );
}

function nextHour() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}
