import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { getCountItems, getObjectiveDetail, saveProgress, type CountItem, type ObjectiveDetail } from '../../api/mbo';
import { big } from '../../shared/client-list.component';
import { ChipComponent, EVIDENCE, formatValue, ProgressBarComponent } from '../../shared/mbo';
import { BackButtonComponent, LabelComponent, PageHeaderComponent, PANEL, SelectComponent } from '../../shared/ui';

const field = 'h-10 w-full rounded border bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20';
const area = 'w-full rounded border bg-white px-3 py-2 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20';
const border = (bad?: string) => (bad ? 'border-red-400' : 'border-slate/40');
const primary = 'h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40';
const secondary = 'flex h-10 items-center rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40';

// Shared select at form-field height (its own arrow keeps clear of the border).
const tall = '[&_select]:h-10 [&_select]:text-sm';
const MAX_MB = 10;
const ACCEPT = '.pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg,.msg,.eml';
const SOURCE_TYPES: Record<string, string[]> = {
  revenue: ['Revenue register', 'Fee-income reconciliation', 'Closure / origination log', 'Other'],
  count: ['Partner / relationship register', 'Onboarding record', 'CRM stage-change record', 'Meeting / progression note', 'Other'],
  criteria: ['Escalation record', 'Report submission', 'CRM / activity report', 'Coaching record', 'Other'],
  leadership: ['Coaching record', 'Succession plan', 'Culture initiative record', 'Routing record', 'Other'],
};

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const parseNum = (s: string) => { const d = s.replace(/[^\d]/g, ''); return d ? Number(d) : undefined; };
const singular = (unit?: string) => unit?.replace(/ies$/, 'y').replace(/s$/, '') ?? 'item';

type Errors = Partial<Record<string, string>>;
type Draft = { name: string; classification: CountItem['classification']; eventDate: string; contribution: string };
const emptyItem = (): Draft => ({ name: '', classification: 'net-new', eventDate: '', contribution: '' });

/** Count objectives: the actual is the list of counted partners / opportunities. */
@Component({
  selector: 'app-count-items',
  standalone: true,
  imports: [LabelComponent, SelectComponent],
  host: { class: 'flex flex-col gap-3' },
  template: `
    <div class="overflow-x-auto rounded border border-slate/25">
      <table class="w-full min-w-[560px] text-sm">
        <thead class="bg-label/60 text-left text-xs text-slate">
          <tr>
            <th class="py-2 pl-4 pr-3 font-medium">Counted {{ unit }}</th>
            <th class="px-3 py-2 font-medium">Type</th>
            <th class="px-3 py-2 font-medium">Event date</th>
            <th class="py-2 pl-3 pr-4"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate/15">
          @if (items.length === 0) { <tr><td colspan="4" class="px-4 py-5 text-center text-xs text-slate">Nothing counted yet.</td></tr> }
          @for (i of items; track i.id) {
            <tr [class.bg-sky-50]="editing === i.id">
              <td class="py-2.5 pl-4 pr-3">
                <p class="font-medium text-night">{{ i.name }}</p>
                @if (!i.contribution) { <p class="text-xs text-red-600">Contribution missing</p> }
              </td>
              <td class="px-3 py-2.5 text-night/80">{{ i.classification === 'net-new' ? 'Net new' : 'Materially deepened' }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-night/80">{{ fmtDate(i.eventDate) }}</td>
              <td class="py-2 pl-3 pr-4">
                <div class="flex justify-end gap-1">
                  <button type="button" (click)="edit(i)" class="h-8 rounded px-2.5 text-xs font-semibold text-navy hover:bg-mist">Edit</button>
                  <button type="button" [attr.aria-label]="'Remove ' + i.name" (click)="itemsChange.emit(without(i.id))" class="h-8 rounded px-2.5 text-xs font-semibold text-red-600 hover:bg-red-50">Remove</button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    @if (error) { <p class="text-xs text-red-600">{{ error }}</p> }

    <fieldset class="rounded border border-dashed border-slate/50 p-4">
      <legend class="px-1 text-xs font-semibold text-navy">{{ editing ? 'Edit ' + one() : 'Add a ' + one() }}</legend>
      <div class="grid gap-4 sm:grid-cols-2">
        <app-label [text]="cap(one()) + ' name'" [required]="true" [error]="errs['name']">
          <input [class]="field + ' ' + border(errs['name'])" [value]="draft.name" (input)="draft.name = $any($event.target).value" />
        </app-label>
        <app-label text="Type" [required]="true">
          <app-select [class]="tall" label="Type" [value]="draft.classification" (valueChange)="draft.classification = $event" [options]="classOpts" />
        </app-label>
        <app-label text="Qualifying event date" [required]="true" [error]="errs['eventDate']" hint="Onboarding, activation or material progression.">
          <input type="date" [class]="field + ' ' + border(errs['eventDate'])" [max]="today()" [min]="period + '-01-01'"
            [value]="draft.eventDate" (input)="draft.eventDate = $any($event.target).value" />
        </app-label>
        <app-label text="Your contribution" [required]="true" [error]="errs['contribution']">
          <input [class]="field + ' ' + border(errs['contribution'])" placeholder="e.g. Introduced the partner and led onboarding"
            [value]="draft.contribution" (input)="draft.contribution = $any($event.target).value" />
        </app-label>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        @if (editing) { <button type="button" [class]="secondary" (click)="reset()">Cancel edit</button> }
        <button type="button" [class]="primary" (click)="commit()">{{ editing ? 'Update' : 'Add ' + one() }}</button>
      </div>
    </fieldset>
  `,
})
export class CountItemsComponent {
  @Input() unit?: string;
  @Input({ required: true }) items!: CountItem[];
  @Output() itemsChange = new EventEmitter<CountItem[]>();
  @Input({ required: true }) period!: string;
  @Input() error?: string;

  readonly field = field;
  readonly border = border;
  readonly primary = primary;
  readonly secondary = secondary;
  readonly fmtDate = fmtDate;
  readonly tall = tall;
  readonly classOpts = [{ value: 'net-new', label: 'Net new' }, { value: 'deepened', label: 'Materially deepened / progressed' }];
  readonly today = today;
  draft = emptyItem();
  editing: string | null = null;
  errs: Errors = {};

  one = () => singular(this.unit);
  cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  without = (id: string) => this.items.filter((x) => x.id !== id);

  edit(i: CountItem) {
    this.editing = i.id;
    this.draft = { name: i.name, classification: i.classification, eventDate: i.eventDate, contribution: i.contribution };
    this.errs = {};
  }

  reset() {
    this.editing = null;
    this.draft = emptyItem();
    this.errs = {};
  }

  commit() {
    const d = this.draft, one = this.one(), e: Errors = {};
    if (!d.name.trim()) e['name'] = `Enter the ${one} name.`;
    if (!d.eventDate) e['eventDate'] = 'Enter the date of the qualifying event.';
    else if (d.eventDate > today() || !d.eventDate.startsWith(this.period)) e['eventDate'] = `Use a date in ${this.period}, not in the future.`;
    if (!d.contribution.trim()) e['contribution'] = 'Describe your contribution.';
    const dup = this.items.find((i) => i.id !== this.editing && i.name.trim().toLowerCase() === d.name.trim().toLowerCase());
    if (dup) e['name'] = `This ${one} is already counted. Each ${one} counts once, however many events it has.`;
    this.errs = e;
    if (Object.keys(e).length) return;
    const item: CountItem = { id: this.editing ?? `n${Date.now()}`, ...d, name: d.name.trim(), contribution: d.contribution.trim(), evidenced: false };
    this.itemsChange.emit(this.editing ? this.items.map((i) => (i.id === this.editing ? item : i)) : [...this.items, item]);
    this.reset();
  }
}

@Component({
  selector: 'app-progress-preview',
  standalone: true,
  imports: [ChipComponent, ProgressBarComponent],
  host: { class: 'block' },
  template: `
    @if (!numeric()) {
      <section class="rounded-md border border-slate/25 p-5 text-sm">
        <h2 class="mb-2 text-[15px] font-semibold text-navy">How this is assessed</h2>
        <p class="text-night/80">This objective has no % progress. The MBO Panel rates it against the criteria using the evidence you record here.</p>
        <p class="mt-3 text-xs text-slate">Current status: <app-chip [tone]="ev[d.progress.evidence].tone">{{ ev[d.progress.evidence].label }}</app-chip></p>
      </section>
    } @else {
      <section class="rounded-md border border-slate/25 p-5 text-sm lg:sticky lg:top-24">
        <h2 class="mb-3 text-[15px] font-semibold text-navy">Preview</h2>
        <p class="text-xs text-slate">Actual after this update</p>
        <p class="text-xl font-semibold tabular-nums text-night">{{ fv(d.objective, value()) }}</p>
        <div class="mt-3 flex items-baseline justify-between text-xs text-slate">
          <span>of {{ fv(d.objective, target()) }} annual target</span>
          <span class="text-base font-semibold tabular-nums text-[#00857d]">{{ round(pct()) }}%</span>
        </div>
        <div class="mt-1.5"><app-progress-bar [pct]="pct()" /></div>
        <dl class="mt-4 divide-y divide-slate/15 text-xs">
          <div class="flex justify-between py-2"><dt class="text-slate">Currently recorded</dt><dd class="font-medium tabular-nums text-night">{{ fv(d.objective, current()) }}</dd></div>
          <div class="flex justify-between py-2">
            <dt class="text-slate">Change</dt>
            <dd class="font-semibold tabular-nums" [class]="change() > 0 ? 'text-[#00857d]' : change() < 0 ? 'text-red-600' : 'text-night'">
              {{ change() > 0 ? '+' : change() < 0 ? '−' : '' }}{{ d.objective.kind === 'revenue' ? 'HKD ' + abs(change()).toLocaleString('en-US') : abs(change()) }}
            </dd>
          </div>
        </dl>
        @if (change() < 0) { <p class="mt-2 rounded bg-amber-50 px-2.5 py-2 text-xs text-amber-800">This lowers your recorded actual. Explain why in the progress notes.</p> }
        <p class="mt-3 text-xs text-slate">Progress is % of the annual target, not a rating.</p>
      </section>
    }
  `,
})
export class ProgressPreviewComponent {
  @Input({ required: true }) d!: ObjectiveDetail;
  @Input() newActual?: number;
  readonly ev = EVIDENCE;
  readonly fv = formatValue;
  readonly round = Math.round;
  readonly abs = Math.abs;
  numeric = () => this.d.objective.kind === 'revenue' || this.d.objective.kind === 'count';
  target = () => this.d.target.target ?? 0;
  current = () => this.d.progress.actual ?? 0;
  value = () => this.newActual ?? this.current();
  pct = () => (this.target() ? (this.value() / this.target()) * 100 : 0);
  change = () => this.value() - this.current();
}

@Component({
  selector: 'app-update-form',
  standalone: true,
  imports: [RouterLink, LabelComponent, SelectComponent, CountItemsComponent, ProgressPreviewComponent],
  template: `
    <form (submit)="submit($event)" novalidate class="flex flex-col gap-6">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div class="flex flex-col gap-6">
          <section class="flex flex-col gap-4">
            <h2 class="text-[15px] font-semibold text-navy">{{ kind === 'revenue' ? 'Cumulative actual' : kind === 'count' ? 'Counted ' + d.objective.unit : 'Evidence for a commitment' }}</h2>

            @if (kind === 'revenue' || kind === 'count') {
              <div class="grid gap-4 sm:grid-cols-2">
                <app-label text="Actuals as of" [required]="true" [error]="e()['asOf']">
                  <input type="date" [class]="field + ' ' + border(e()['asOf'])" [attr.aria-invalid]="!!e()['asOf']" [value]="asOf"
                    [min]="period + '-01-01'" [max]="today()" (input)="asOf = $any($event.target).value" />
                </app-label>
                @if (kind === 'revenue') {
                  <app-label text="Cumulative actual to date (HKD)" [required]="true" [error]="e()['actual']"
                    [hint]="'Enter the full year-to-date total — it replaces ' + fv(d.objective, d.progress.actual) + ', it isn\\'t added to it.'">
                    <div class="relative">
                      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate">HKD</span>
                      <input #act inputmode="numeric" [attr.aria-invalid]="!!e()['actual']" [class]="field + ' pl-12 tabular-nums ' + border(e()['actual'])"
                        [value]="actual === undefined ? '' : actual.toLocaleString('en-US')" (input)="setActual(act)" />
                    </div>
                  </app-label>
                }
              </div>
            }

            @if (kind === 'count') {
              @if (items === null) { <div class="h-32 animate-pulse rounded bg-mist"></div> }
              @else { <app-count-items [unit]="d.objective.unit" [items]="items" (itemsChange)="items = $event" [period]="period" [error]="e()['items']" /> }
            }

            @if (kind === 'criteria' || kind === 'leadership') {
              <div class="grid gap-4 sm:grid-cols-2">
                <app-label text="Agreed commitment" [required]="true" [error]="e()['commitment']">
                  <app-select [class]="tall" label="Agreed commitment" [value]="commitment" [invalid]="!!e()['commitment']" (valueChange)="commitment = $event" [options]="commitmentOpts()" />
                </app-label>
                <app-label text="Activity date" [required]="true" [error]="e()['activityDate']">
                  <input type="date" [class]="field + ' ' + border(e()['activityDate'])" [attr.aria-invalid]="!!e()['activityDate']"
                    [min]="period + '-01-01'" [max]="today()" [value]="activityDate" (input)="activityDate = $any($event.target).value" />
                </app-label>
              </div>
            }

            <app-label [text]="isCriteria() ? 'What happened' : 'Progress notes'" [required]="true" [error]="e()['notes']" [hint]="notesHint()">
              <textarea rows="3" [class]="area + ' ' + border(e()['notes'])" [attr.aria-invalid]="!!e()['notes']" [value]="notes" (input)="notes = $any($event.target).value"></textarea>
            </app-label>
          </section>

          <section class="flex flex-col gap-4 border-t border-slate/20 pt-6">
            <div>
              <h2 class="text-[15px] font-semibold text-navy">Supporting evidence</h2>
              <p class="mt-0.5 text-xs text-slate">Expected: {{ d.objective.evidence }}</p>
            </div>

            <div class="rounded border border-dashed p-4" [class]="e()['evidence'] ? 'border-red-400' : 'border-slate/50'">
              <div class="flex flex-wrap items-center gap-3">
                <svg viewBox="0 0 24 24" class="size-5 text-slate" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7" /></svg>
                <div class="mr-auto text-sm">
                  <p class="font-medium text-night">{{ files.length ? files.length + ' file' + (files.length > 1 ? 's' : '') + ' attached' : 'No files attached' }}</p>
                  <p class="text-xs text-slate">PDF, Office, image, CSV or email · up to {{ maxMb }} MB each</p>
                </div>
                <label class="flex h-9 cursor-pointer items-center rounded border border-navy px-4 text-sm font-medium text-navy hover:bg-mist">
                  Choose files
                  <input #fi type="file" multiple [accept]="accept" class="sr-only" (change)="addFiles(fi.files); fi.value = ''" />
                </label>
              </div>
              @if (files.length > 0) {
                <ul class="mt-3 divide-y divide-slate/15 border-t border-slate/15">
                  @for (f of files; track f.name + f.size) {
                    <li class="flex items-center gap-3 py-2 text-sm">
                      <span class="mr-auto truncate text-night">{{ f.name }}</span>
                      <span class="text-xs tabular-nums text-slate">{{ (f.size / 1024).toFixed(0) }} KB</span>
                      <button type="button" [attr.aria-label]="'Remove ' + f.name" (click)="removeFile(f)" class="h-7 rounded px-2 text-xs font-semibold text-red-600 hover:bg-red-50">Remove</button>
                    </li>
                  }
                </ul>
              }
              @if (fileError) { <p class="mt-2 text-xs text-red-600">{{ fileError }}</p> }
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <app-label text="Source record type">
                <app-select [class]="tall" label="Source record type" [value]="sourceType" (valueChange)="sourceType = $event" [options]="sourceOpts()" />
              </app-label>
              <app-label text="Record reference / link" hint="CRM ID, register reference or document link.">
                <input [class]="field + ' border-slate/40'" [value]="reference" (input)="reference = $any($event.target).value" />
              </app-label>
            </div>
            @if (e()['evidence']) { <p role="alert" class="text-xs text-red-600">{{ e()['evidence'] }}</p> }
          </section>
        </div>

        <app-progress-preview [d]="d" [newActual]="newActual()" />
      </div>

      <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
        <p class="mr-auto text-xs text-slate">Saving records progress and evidence for review. It doesn't approve a rating.</p>
        <a [routerLink]="'/bd/web/mbo/objective/' + d.objective.id" [queryParams]="{ period }" [class]="secondary">Cancel</a>
        <button [class]="primary" [disabled]="saving">{{ saving ? 'Saving…' : 'Save update' }}</button>
      </div>
    </form>
  `,
})
export class UpdateFormComponent implements OnInit {
  @Input({ required: true }) d!: ObjectiveDetail;
  @Input({ required: true }) period!: string;

  private router = inject(Router);
  readonly field = field;
  readonly area = area;
  readonly border = border;
  readonly primary = primary;
  readonly secondary = secondary;
  readonly today = today;
  readonly fv = formatValue;
  readonly maxMb = MAX_MB;
  readonly accept = ACCEPT;

  asOf = '';
  actual?: number;
  items: CountItem[] | null = null;
  commitment = '';
  activityDate = '';
  notes = '';
  files: File[] = [];
  fileError = '';
  sourceType = '';
  reference = '';
  tried = false;
  saving = false;

  get kind() { return this.d.objective.kind; }
  isCriteria = () => this.kind === 'criteria' || this.kind === 'leadership';
  readonly tall = tall;
  sourceOpts = () => [{ value: '', label: 'Select type' }, ...SOURCE_TYPES[this.kind].map((t) => ({ value: t, label: t }))];
  commitmentOpts = () => this.d.target.commitments.map((c) => ({ value: c, label: c }));
  newActual = () => (this.kind === 'count' ? this.items?.length : this.actual);
  notesHint = () => (this.kind === 'revenue' ? 'What closed since the last update, and your contribution.'
    : this.kind === 'count' ? 'What changed since the last update.'
    : 'e.g. Escalated a 12% variance to my manager in writing on day 2, with root cause and recovery plan.');

  async ngOnInit() {
    const end = `${this.period}-12-31`;
    this.asOf = today() < end ? today() : end;
    this.actual = this.d.progress.actual;
    this.commitment = this.d.target.commitments[0] ?? '';
    if (this.kind === 'count') this.items = await getCountItems(this.period, this.d.objective.id);
  }

  setActual(el: HTMLInputElement) {
    this.actual = parseNum(el.value);
    el.value = this.actual === undefined ? '' : this.actual.toLocaleString('en-US');
  }

  validate(): Errors {
    const e: Errors = {}, p = this.period;
    const badDate = (v: string) => v > today() || !v.startsWith(p);
    if (this.kind === 'revenue' || this.kind === 'count') {
      if (!this.asOf) e['asOf'] = 'Enter the date these actuals run to.';
      else if (badDate(this.asOf)) e['asOf'] = `Use a date in ${p}, not in the future.`;
    }
    if (this.kind === 'revenue' && this.actual === undefined) e['actual'] = 'Enter the cumulative year-to-date total.';
    if (this.kind === 'count' && this.items?.some((i) => !i.contribution)) e['items'] = `Add your contribution for every counted ${singular(this.d.objective.unit)} (Edit).`;
    if (this.isCriteria()) {
      if (!this.commitment) e['commitment'] = 'Choose the commitment this evidences.';
      if (!this.activityDate) e['activityDate'] = 'Enter the activity date.';
      else if (badDate(this.activityDate)) e['activityDate'] = `Use a date in ${p}, not in the future.`;
    }
    if (!this.notes.trim()) e['notes'] = this.isCriteria() ? 'Describe what happened.' : 'Add progress notes.';
    if (!this.files.length && !this.reference.trim()) e['evidence'] = 'Attach a file or add a record reference.';
    return e;
  }
  e = (): Errors => (this.tried ? this.validate() : {});

  addFiles(list: FileList | null) {
    const picked = Array.from(list ?? []), limit = MAX_MB * 1024 * 1024;
    const tooBig = picked.filter((f) => f.size > limit);
    const ok = picked.filter((f) => f.size <= limit);
    this.files = [...this.files, ...ok.filter((f) => !this.files.some((p) => p.name === f.name && p.size === f.size))];
    this.fileError = tooBig.length ? `${tooBig.map((f) => f.name).join(', ')} ${tooBig.length > 1 ? 'are' : 'is'} over ${MAX_MB} MB.` : '';
  }

  removeFile(f: File) { this.files = this.files.filter((x) => x !== f); }

  async submit(ev: Event) {
    ev.preventDefault();
    this.tried = true;
    if (Object.keys(this.validate()).length) {
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
      return;
    }
    this.saving = true;
    const k = this.kind;
    await saveProgress(this.period, {
      objectiveId: this.d.objective.id, asOf: this.asOf, notes: this.notes.trim(), sourceType: this.sourceType, reference: this.reference.trim(),
      attachments: this.files.map((f) => ({ name: f.name, size: f.size })),
      ...(k === 'revenue' ? { actual: this.actual } : {}),
      ...(k === 'count' ? { items: this.items ?? [] } : {}),
      ...(this.isCriteria() ? { commitment: this.commitment, activityDate: this.activityDate } : {}),
    });
    this.router.navigate(['/bd/web/mbo/objective', this.d.objective.id], { queryParams: { period: this.period } });
  }
}

@Component({
  selector: 'app-update-progress',
  standalone: true,
  imports: [PageHeaderComponent, BackButtonComponent, SelectComponent, ChipComponent, UpdateFormComponent],
  template: `
    <app-page-header title="Update Progress & Evidence">
      @if (d) { <app-back-button [href]="'/bd/web/mbo/objective/' + objectiveId + '?period=' + periodId" to="Objective Details" /> }
      @else { <app-back-button href="/bd/web/mbo/my" to="My MBO" /> }
    </app-page-header>

    @if (missing) {
      <div [class]="panel + ' py-14 text-center'">
        <p class="text-sm font-semibold text-night">Nothing to update yet</p>
        <p class="mt-1 text-sm text-slate">Accept your {{ periodId }} targets on My MBO first.</p>
      </div>
    } @else if (!d) {
      <div [class]="panel + ' flex flex-col gap-4'">@for (i of [0, 1]; track i) { <div class="h-36 animate-pulse rounded-md bg-mist"></div> }</div>
    } @else {
      <div [class]="panel + ' flex flex-col gap-6'">
        <section class="grid gap-x-6 gap-y-4 border-b border-slate/20 pb-6 md:grid-cols-[minmax(0,1.4fr)_auto_auto_auto] md:items-end">
          <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Objective
            <app-select [class]="big" label="Objective" [value]="objectiveId" (valueChange)="switchTo($event)" [options]="objectiveOpts()" />
          </div>
          <div class="text-xs text-slate">Weight<p class="text-sm font-semibold text-navy">{{ d.objective.weight }}%</p></div>
          <div class="text-xs text-slate">
            Agreed target
            <p class="text-sm font-semibold text-night">{{ numeric() ? fv(d.objective, d.target.target) : d.target.commitments.length + ' commitments' }}</p>
          </div>
          <div class="text-xs text-slate">Evidence<p><app-chip [tone]="ev[d.progress.evidence].tone">{{ ev[d.progress.evidence].label }}</app-chip></p></div>
        </section>
        <!-- re-keyed: switching objective starts a fresh form -->
        @for (k of [objectiveId + '|' + periodId]; track k) { <app-update-form [d]="d" [period]="periodId" /> }
      </div>
    }
  `,
})
export class UpdateProgressComponent {
  // Bound from ?objective= and ?period=; the router reuses this component when only the query changes.
  @Input() set objective(v: string | undefined) { this.objectiveId = v || 'revenue'; this.load(); }
  @Input() set period(v: string | undefined) { this.periodId = v || '2026'; this.load(); }

  private router = inject(Router);
  readonly panel = PANEL;
  readonly big = big;
  readonly ev = EVIDENCE;
  readonly fv = formatValue;

  objectiveId = 'revenue';
  periodId = '2026';
  d: ObjectiveDetail | null = null;
  missing = false;
  private req = 0;

  numeric = () => this.d!.objective.kind === 'revenue' || this.d!.objective.kind === 'count';
  objectiveOpts = () => this.d!.mbo.template.objectives.map((o, i) => ({ value: o.id, label: `${i + 1}. ${o.title}` }));

  switchTo(id: string) {
    this.router.navigate([], { queryParams: { objective: id, period: this.periodId }, replaceUrl: true });
  }

  async load() {
    const n = ++this.req;
    await Promise.resolve(); // let both query inputs land before fetching
    if (n !== this.req) return;
    this.d = null;
    this.missing = false;
    const d = await getObjectiveDetail(this.periodId, this.objectiveId);
    if (n !== this.req) return;
    this.d = d;
    this.missing = !d;
  }
}
