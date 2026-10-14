import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import type { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import {
  createAppointment, deleteAppointment, listAppointments, saveMinutes,
  type Appointment, type MeetingMode, type MinutesOfMeeting,
} from '../../api/appointments';
import { ModalComponent, PageHeaderComponent, SegmentedComponent, SelectComponent } from '../../shared/ui';

const VIEWS = [
  { value: 'dayGridMonth', label: 'Month' },
  { value: 'timeGridWeek', label: 'Week' },
  { value: 'timeGridDay', label: 'Day' },
  { value: 'listWeek', label: 'List' },
];
const MODES = [{ value: 'Online', label: 'Online' }, { value: 'Offline', label: 'Offline' }];

const field = 'h-10 w-full rounded border border-slate/40 bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20';
const primary = 'h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40';
const secondary = 'h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist';
const label = 'flex flex-col gap-1.5';
const labelText = 'text-xs font-medium text-night/70';
const tall = '[&_select]:h-10 [&_select]:text-sm';

const fmt = (iso: string) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
// <input type="datetime-local"> wants local "yyyy-mm-ddThh:mm".
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const TIME_ZONES = Array.from(new Set([TZ, 'Asia/Hong_Kong', 'Asia/Singapore', 'Asia/Dubai', 'Asia/Kolkata', 'Europe/London', 'America/New_York', 'UTC']));

function nextHour() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

// ---------- Create event ----------

@Component({
  selector: 'app-create-event-form',
  standalone: true,
  imports: [SelectComponent],
  template: `
    <form class="flex flex-col gap-4" (submit)="submit($event)">
      <label [class]="label"><span [class]="labelText">Event Title</span><input #t [class]="field" [value]="f.title" (input)="f.title = t.value" /></label>
      <label [class]="label"><span [class]="labelText">Event Description</span>
        <textarea #d rows="3" [class]="field + ' h-auto py-2'" [value]="f.description" (input)="f.description = d.value"></textarea>
      </label>
      <label [class]="label"><span [class]="labelText">Guests</span><input #g [class]="field" placeholder="Add guest emails, separated by commas" [value]="f.guests" (input)="f.guests = g.value" /></label>
      <div class="grid gap-4 sm:grid-cols-2">
        <label [class]="label"><span [class]="labelText">Start Date &amp; Time</span><input #s type="datetime-local" [class]="field" [value]="f.start" (input)="f.start = s.value" /></label>
        <label [class]="label"><span [class]="labelText">End Date &amp; Time</span><input #e type="datetime-local" [class]="field" [value]="f.end" [min]="f.start" (input)="f.end = e.value" /></label>
        <label [class]="label"><span [class]="labelText">Time Zone</span>
          <app-select [class]="tall" label="Time Zone" [value]="f.timeZone" (valueChange)="f.timeZone = $event" [options]="zones" />
        </label>
        <label [class]="label"><span [class]="labelText">Meeting Type</span>
          <app-select [class]="tall" label="Meeting Type" [value]="f.mode" (valueChange)="f.mode = $event" [options]="modes" />
        </label>
      </div>
      @if (error) { <p role="alert" class="text-sm text-red-600">{{ error }}</p> }
      <div class="flex justify-end gap-3 border-t border-slate/20 pt-4">
        <button type="button" [class]="secondary" (click)="cancel.emit()">Cancel</button>
        <button [class]="primary" [disabled]="saving">{{ saving ? 'Creating…' : 'Create Event' }}</button>
      </div>
    </form>
  `,
})
export class CreateEventFormComponent implements OnInit {
  @Input({ required: true }) initialStart!: Date;
  @Input({ required: true }) mode!: MeetingMode;
  @Output() created = new EventEmitter<Appointment>();
  @Output() cancel = new EventEmitter<void>();
  readonly field = field;
  readonly primary = primary;
  readonly secondary = secondary;
  readonly label = label;
  readonly labelText = labelText;
  readonly tall = tall;
  readonly zones = TIME_ZONES.map((z) => ({ value: z, label: z }));
  readonly modes = MODES;
  f = { title: '', description: '', guests: '', start: '', end: '', timeZone: TZ, mode: 'Online' as MeetingMode };
  error = '';
  saving = false;

  ngOnInit() {
    this.f.start = toLocalInput(this.initialStart);
    this.f.end = toLocalInput(new Date(this.initialStart.getTime() + 60 * 60_000));
    this.f.mode = this.mode;
    setTimeout(() => document.querySelector<HTMLInputElement>('app-create-event-form input')?.focus());
  }

  async submit(e: Event) {
    e.preventDefault();
    const f = this.f;
    const guests = f.guests.split(/[,\s]+/).filter(Boolean);
    const bad = guests.find((g) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g));
    if (!f.title.trim()) { this.error = 'Event title is required.'; return; }
    if (f.end <= f.start) { this.error = 'End must be after start.'; return; }
    if (bad) { this.error = `"${bad}" is not a valid email address.`; return; }
    this.saving = true;
    try {
      this.created.emit(await createAppointment({
        title: f.title.trim(), description: f.description.trim(), attendees: guests, mode: f.mode,
        start: new Date(f.start).toISOString(), end: new Date(f.end).toISOString(), timeZone: f.timeZone,
      }));
    } catch {
      this.error = 'Could not create the event. Please try again.';
      this.saving = false;
    }
  }
}

// ---------- Minutes of meeting ----------

@Component({
  selector: 'app-minutes-form',
  standalone: true,
  template: `
    <form class="flex flex-col gap-4" (submit)="submit($event)">
      <div class="grid gap-4 sm:grid-cols-2">
        <label [class]="label"><span [class]="labelText">Meeting Date &amp; Time</span>
          <input #at type="datetime-local" [class]="field" [value]="local(m.at)" (input)="at.value && (m.at = iso(at.value))" />
        </label>
        <label [class]="label"><span [class]="labelText">Meeting Title</span><input #t [class]="field" [value]="m.title" (input)="m.title = t.value" /></label>
      </div>
      <label [class]="label"><span [class]="labelText">Minutes</span>
        <textarea #n rows="10" [class]="field + ' h-auto py-2 leading-relaxed'" placeholder="Discussion points, decisions, action items…" [value]="m.notes" (input)="m.notes = n.value"></textarea>
      </label>
      @if (error) { <p role="alert" class="text-sm text-red-600">{{ error }}</p> }
      <div class="flex justify-end gap-3 border-t border-slate/20 pt-4">
        <button type="button" [class]="secondary" (click)="cancel.emit()">Cancel</button>
        <button [class]="primary" [disabled]="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
      </div>
    </form>
  `,
})
export class MinutesFormComponent implements OnInit {
  @Input() initial?: MinutesOfMeeting;
  @Input() eventId?: string;
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  readonly field = field;
  readonly primary = primary;
  readonly secondary = secondary;
  readonly label = label;
  readonly labelText = labelText;
  m: MinutesOfMeeting = { title: '', at: new Date().toISOString(), notes: '' };
  saving = false;
  error = '';

  local = (iso: string) => toLocalInput(new Date(iso));
  iso = (local: string) => new Date(local).toISOString();
  ngOnInit() { if (this.initial) this.m = { ...this.initial }; }

  async submit(e: Event) {
    e.preventDefault();
    if (!this.m.title.trim() || !this.m.notes.trim()) { this.error = 'Meeting title and minutes are required.'; return; }
    this.saving = true;
    try {
      await saveMinutes(this.m, this.eventId);
      this.saved.emit();
    } catch {
      this.error = 'Could not save the minutes. Please try again.';
      this.saving = false;
    }
  }
}

// ---------- Event details ----------

@Component({
  selector: 'app-event-details',
  standalone: true,
  host: { class: 'flex flex-col gap-4' },
  template: `
    <p class="text-base font-semibold text-night">{{ ev.title }}</p>
    <dl class="divide-y divide-slate/15 overflow-hidden rounded border border-slate/25 text-sm">
      @for (r of rows(); track r[0]) {
        <div class="grid grid-cols-[9rem_1fr]">
          <dt class="border-r border-slate/20 bg-label px-3 py-2 font-semibold text-night">{{ r[0] }}</dt>
          <dd class="break-words px-3 py-2 text-night">
            @if (r[0] === 'Meeting Link' && r[1]) { <a [href]="r[1]" target="_blank" rel="noreferrer" class="text-teal hover:underline">{{ r[1] }}</a> }
            @else { {{ r[1] || '—' }} }
          </dd>
        </div>
      }
    </dl>
    @if (ev.mom) {
      <div class="rounded border border-slate/25 p-3">
        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate">Minutes of meeting</p>
        <p class="whitespace-pre-line text-sm text-night">{{ ev.mom.notes }}</p>
      </div>
    }
    <div class="flex flex-wrap justify-between gap-3 border-t border-slate/20 pt-4">
      <button type="button" [disabled]="deleting" (click)="remove()"
        class="h-10 rounded border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40">
        {{ deleting ? 'Deleting…' : 'Delete Event' }}
      </button>
      <button type="button" [class]="primary" (click)="addMom.emit()">{{ ev.mom ? 'Edit MOM' : 'Add MOM' }}</button>
    </div>
  `,
})
export class EventDetailsComponent {
  @Input({ required: true }) ev!: Appointment;
  @Output() addMom = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();
  readonly primary = primary;
  deleting = false;

  rows = (): [string, string | undefined][] => {
    const ev = this.ev;
    return [
      ['Start', fmt(ev.start)],
      ['End', fmt(ev.end)],
      ['Description', ev.description],
      ['Meeting Type', ev.mode],
      ['Meeting Status', ev.status],
      ['Created By', `${ev.createdBy.name} (${ev.createdBy.email})`],
      ['Meeting ID', ev.meetingId],
      ['Meeting Link', ev.meetingLink],
      ['Attendees', ev.attendees.length ? ev.attendees.join(', ') : undefined],
    ];
  };

  async remove() {
    if (!confirm(`Delete "${this.ev.title}"? This also removes it for attendees.`)) return;
    this.deleting = true;
    await deleteAppointment(this.ev.id);
    this.deleted.emit();
  }
}

// ---------- Page ----------

type Dialog = { kind: 'create'; start: Date } | { kind: 'view'; ev: Appointment } | { kind: 'mom'; ev?: Appointment } | null;

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [FullCalendarModule, PageHeaderComponent, SegmentedComponent, ModalComponent, CreateEventFormComponent, MinutesFormComponent, EventDetailsComponent],
  template: `
    <app-page-header title="Appointments" />

    <div class="grid gap-5 xl:grid-cols-[16rem_minmax(0,1fr)]">
      <aside class="flex flex-col gap-5">
        <section class="rounded-md bg-navy p-5 text-white">
          <h2 class="text-[15px] font-semibold">Minutes of Meeting</h2>
          <p class="mt-1 text-xs text-white/70">Record minutes for a meeting that isn't on the calendar.</p>
          <button type="button" (click)="dialog = { kind: 'mom' }" class="mt-4 h-9 rounded bg-teal px-4 text-sm font-semibold text-ink transition hover:brightness-105">MOM</button>
        </section>

        <section class="rounded-md border border-slate/20 bg-white p-5">
          <h2 class="mb-3 text-[15px] font-semibold text-navy">Meeting type</h2>
          <app-segmented label="Meeting type" [value]="mode" (valueChange)="setMode($event)" [options]="modes" />
          <p class="mt-3 flex items-center gap-2 text-xs text-slate">
            <span class="size-2.5 rounded-sm" [class]="mode === 'Online' ? 'bg-navy' : 'bg-teal'"></span>
            Showing {{ mode.toLowerCase() }} meetings
          </p>
        </section>
      </aside>

      <section class="rounded-md border border-slate/20 bg-white p-5">
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <button type="button" [class]="primary + ' h-9 px-4'" (click)="dialog = { kind: 'create', start: nextHour() }">+ Create Event</button>
          <button type="button" aria-label="Previous" [class]="navBtn" (click)="api()?.prev()">
            <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button type="button" aria-label="Next" [class]="navBtn" (click)="api()?.next()">
            <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
          <button type="button" [class]="secondary + ' h-9 px-4'" (click)="api()?.today()">Today</button>
          <h2 class="mx-auto px-2 text-lg font-semibold text-navy">{{ title }}</h2>
          <app-segmented label="Calendar view" [value]="view" (valueChange)="view = $event; api()?.changeView($event)" [options]="views" />
        </div>

        <full-calendar #cal [options]="options" [events]="shown" />
        @if (events === null) { <p class="mt-3 text-xs text-slate">Loading appointments…</p> }
      </section>
    </div>

    <app-modal [open]="dialog?.kind === 'create'" title="Create Event" width="40rem" (closed)="dialog = null">
      @if (createDialog(); as d) {
        <app-create-event-form [initialStart]="d.start" [mode]="mode" (cancel)="dialog = null" (created)="onCreated($event)" />
      }
    </app-modal>

    <app-modal [open]="dialog?.kind === 'view'" title="Event Details" width="36rem" (closed)="dialog = null">
      @if (viewDialog(); as d) {
        <app-event-details [ev]="d.ev" (addMom)="dialog = { kind: 'mom', ev: d.ev }" (deleted)="afterChange()" />
      }
    </app-modal>

    <app-modal [open]="dialog?.kind === 'mom'" title="Minutes of Meeting" width="44rem" (closed)="dialog = null">
      @if (momDialog(); as d) {
        <app-minutes-form [eventId]="d.ev?.id" [initial]="d.ev ? (d.ev.mom ?? { title: d.ev.title, at: d.ev.start, notes: '' }) : undefined"
          (cancel)="dialog = null" (saved)="afterChange()" />
      }
    </app-modal>
  `,
})
export class AppointmentComponent implements OnInit {
  @ViewChild('cal') cal?: FullCalendarComponent;

  readonly primary = primary;
  readonly secondary = secondary;
  readonly navBtn = 'grid size-9 place-items-center rounded border border-slate/40 bg-white text-navy transition hover:bg-mist';
  readonly views = VIEWS;
  readonly modes = MODES;
  readonly nextHour = nextHour;

  events: Appointment[] | null = null;
  shown: EventInput[] = [];
  mode: MeetingMode = 'Online';
  view = 'dayGridMonth';
  title = '';
  dialog: Dialog = null;

  readonly options: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: false,
    height: 'auto',
    firstDay: 0,
    nowIndicator: true,
    dayMaxEvents: 3,
    eventDisplay: 'block',
    slotMinTime: '06:00:00',
    slotMaxTime: '22:00:00',
    allDaySlot: false,
    // FullCalendar fires this outside a template binding; defer so it doesn't change state mid-check.
    datesSet: (arg) => setTimeout(() => (this.title = arg.view.title)),
    dateClick: (arg: DateClickArg) => {
      const start = arg.allDay ? new Date(arg.date.getFullYear(), arg.date.getMonth(), arg.date.getDate(), 9) : arg.date;
      this.dialog = { kind: 'create', start };
    },
    eventClick: (arg: EventClickArg) => {
      const ev = this.events?.find((e) => e.id === arg.event.id);
      if (ev) this.dialog = { kind: 'view', ev };
    },
  };

  api = () => this.cal?.getApi();
  createDialog = () => (this.dialog?.kind === 'create' ? this.dialog : null);
  viewDialog = () => (this.dialog?.kind === 'view' ? this.dialog : null);
  momDialog = () => (this.dialog?.kind === 'mom' ? this.dialog : null);

  ngOnInit() { this.reload(); }

  async reload() {
    this.events = await listAppointments();
    this.refreshShown();
  }

  setMode(m: MeetingMode) {
    this.mode = m;
    this.refreshShown();
  }

  private refreshShown() {
    this.shown = (this.events ?? []).filter((e) => e.mode === this.mode).map((e) => ({
      id: e.id, title: e.title, start: e.start, end: e.end, classNames: [`mode-${e.mode.toLowerCase()}`],
    }));
  }

  async onCreated(a: Appointment) {
    await this.reload();
    if (a.mode !== this.mode) this.setMode(a.mode);
    this.dialog = null;
  }

  async afterChange() {
    await this.reload();
    this.dialog = null;
  }
}
