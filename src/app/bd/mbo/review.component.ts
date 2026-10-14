import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  getReview, listReviewable, periodEnded, PERIODS, RATING_LABELS, requestEvidence, saveReview,
  type Objective, type Review, type ReviewBundle, type ReviewStatus,
} from '../../api/mbo';
import { indicatedRating } from '../../lib/mbo-bands';
import { big } from '../../shared/client-list.component';
import { ChipComponent, escalationSla, EVIDENCE, formatValue } from '../../shared/mbo';
import { LabelComponent, PageHeaderComponent, PANEL, SelectComponent } from '../../shared/ui';

const REVIEW_STATUS: Record<ReviewStatus, { label: string; tone: string }> = {
  'not-started': { label: 'Not started', tone: 'bg-mist text-slate' },
  draft: { label: 'Draft', tone: 'bg-amber-100 text-amber-800' },
  finalized: { label: 'Finalized · not released', tone: 'bg-sky-100 text-sky-800' },
  released: { label: 'Released to employee', tone: 'bg-teal/10 text-[#00857d]' },
};

const area = 'w-full rounded border bg-white px-3 py-2 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-mist';
const border = (bad?: string) => (bad ? 'border-red-400' : 'border-slate/40');
const primary = 'h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40';
const secondary = 'h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40';
const radio = 'size-4 shrink-0 appearance-none rounded-full border border-slate/60 bg-white transition checked:border-[5px] checked:border-navy';
const RATING_OPTIONS = [{ value: '', label: 'Select final rating' }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} · ${RATING_LABELS[5 - n]}` }))];

type Errors = Partial<Record<string, string>>;
type Mode = 'draft' | 'finalize' | 'release';

function validateFinal(b: ReviewBundle, r: Review): Errors {
  const e: Errors = {};
  for (const o of b.template.objectives) {
    const x = r.ratings[o.id];
    if (!x?.rating) e[`${o.id}.rating`] = 'Select a final rating.';
    if (!x?.rationale.trim()) e[`${o.id}.rationale`] = 'Record the rationale for this rating.';
  }
  if (r.gate.breach === undefined) e['gate'] = 'Record whether any compliance breach applies.';
  else if (r.gate.breach && !r.gate.note.trim()) e['gateNote'] = 'Describe the breach and how it gates performance.';
  return e;
}

function indicated(o: Objective, b: ReviewBundle) {
  if (o.kind !== 'revenue' && o.kind !== 'count') return null;
  const t = b.assignment.targets.find((x) => x.objectiveId === o.id)?.target;
  const a = b.progress.find((x) => x.objectiveId === o.id)?.actual;
  if (!t || a === undefined) return null;
  return { target: t, actual: a, pct: (a / t) * 100, rating: indicatedRating(o.kind, t, a, o.bands) };
}

@Component({
  selector: 'app-evidence-cell',
  standalone: true,
  imports: [ChipComponent],
  host: { class: 'flex flex-col gap-2 text-xs' },
  template: `
    @if (p(); as pp) { <span><app-chip [tone]="ev[pp.evidence].tone">{{ ev[pp.evidence].label }}</app-chip></span> }
    <span class="text-night/80">{{ count() }} supporting record{{ count() === 1 ? '' : 's' }}</span>
    @if (p()?.note) { <span class="text-night/70">{{ p()!.note }}</span> }

    @if (o.id === 'escalation') {
      <!-- The employee's escalations for the period: the record the escalation objective is rated on. -->
      <div class="mt-1 flex flex-col gap-1.5 rounded border border-slate/20 p-2.5">
        <p class="font-semibold text-night">Escalation record</p>
        @if (b.escalations.length === 0) {
          <p class="text-slate">No escalations logged this period.</p>
        } @else {
          <p class="text-night/80">
            {{ sent().length }} sent · <span class="font-semibold text-[#00857d]">{{ onTime() }} within SLA</span>
            @if (sent().length - onTime() > 0) { · <span class="font-semibold text-red-700">{{ sent().length - onTime() }} late</span> }
            @if (unsent() > 0) { · <span class="font-semibold text-amber-800">{{ unsent() }} never sent</span> }
          </p>
          <ul class="flex flex-col gap-1">
            @for (e of b.escalations; track e.id) {
              <li class="flex items-start justify-between gap-2">
                <span class="text-night/80">{{ e.title }}{{ e.l4 ? ' · L4' : '' }}</span>
                <app-chip [tone]="sla(e).tone">{{ e.submittedAt ? sla(e).label : 'Draft' }}</app-chip>
              </li>
            }
          </ul>
        }
      </div>
    }

    @if (!locked && !done) {
      @if (asking) {
        <div class="flex flex-col gap-2">
          <textarea #m rows="2" [class]="area + ' border-slate/40 text-xs'" placeholder="What's needed?" [value]="msg" (input)="msg = m.value"></textarea>
          <div class="flex gap-2">
            <button type="button" class="h-8 rounded border border-slate/40 px-3 font-medium text-navy hover:bg-mist" (click)="asking = false; msg = ''">Cancel</button>
            <button type="button" [disabled]="!msg.trim()" class="h-8 rounded bg-navy px-3 font-semibold text-white disabled:opacity-40" (click)="send()">Send request</button>
          </div>
        </div>
      } @else {
        <button type="button" (click)="ask()" class="self-start font-semibold text-navy hover:underline">+ Request more evidence</button>
      }
    }
    @if (done) { <span class="text-[#00857d]">Request sent to {{ b.member.name }}.</span> }
  `,
})
export class EvidenceCellComponent {
  @Input({ required: true }) b!: ReviewBundle;
  @Input({ required: true }) o!: Objective;
  @Input() locked = false;
  @Output() requested = new EventEmitter<void>();
  readonly ev = EVIDENCE;
  readonly area = area;
  readonly sla = escalationSla;
  asking = false;
  msg = '';
  done = false;

  p = () => this.b.progress.find((x) => x.objectiveId === this.o.id);
  count = () => this.b.evidenceCount[this.o.id] ?? 0;
  sent = () => this.b.escalations.filter((e) => e.submittedAt);
  onTime = () => this.sent().filter((e) => escalationSla(e).label === 'Within SLA').length;
  unsent = () => this.b.escalations.length - this.sent().length;

  ask() {
    this.asking = true;
    setTimeout(() => (document.activeElement?.closest('app-evidence-cell') ?? document).querySelector<HTMLTextAreaElement>('textarea')?.focus());
  }

  async send() {
    await requestEvidence(this.b.member.id, this.b.assignment.period, this.o.id, this.msg.trim());
    this.done = true;
    this.requested.emit();
  }
}

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [ChipComponent, LabelComponent, SelectComponent, EvidenceCellComponent],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (!ended) {
      <p class="rounded bg-amber-50 px-4 py-3 text-sm text-amber-900">
        The {{ b.assignment.period }} review period runs to 31 Dec {{ b.assignment.period }}. You can draft ratings now; finalizing needs the full year's evidence.
      </p>
    }

    <section class="overflow-x-auto rounded-md border border-slate/25">
      <table class="w-full min-w-[1000px] text-sm">
        <thead class="bg-label/60 text-left text-xs text-slate">
          <tr>
            <th class="w-[34%] py-2.5 pl-5 pr-3 font-medium">Objective · {{ ended ? 'full-year' : 'year-to-date' }} result</th>
            <th class="w-[24%] px-3 py-2.5 font-medium">Evidence</th>
            <th class="py-2.5 pl-3 pr-5 font-medium">Final rating · MBO Panel / RemCo</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate/15">
          @for (o of b.template.objectives; track o.id) {
            <tr class="align-top">
              <td class="py-4 pl-5 pr-3">
                <div class="flex items-baseline justify-between gap-3">
                  <p class="font-semibold text-night">{{ o.title }}</p>
                  <span class="text-xs font-semibold text-navy">{{ o.weight }}%</span>
                </div>
                @if (ind(o); as i) {
                  <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                    <dt class="text-slate">Target</dt><dd class="tabular-nums text-night">{{ fv(o, i.target) }}</dd>
                    <dt class="text-slate">Actual</dt><dd class="font-semibold tabular-nums text-night">{{ fv(o, i.actual) }}</dd>
                    <dt class="text-slate">Attainment</dt><dd class="font-semibold tabular-nums text-[#00857d]">{{ i.pct.toFixed(1) }}%</dd>
                    <dt class="text-slate">Bands indicate</dt><dd class="text-night">{{ i.rating }} · {{ labels[5 - i.rating] }}</dd>
                  </dl>
                } @else {
                  <ul class="mt-2 list-disc space-y-0.5 pl-4 text-xs text-night/80">
                    @for (c of target(o)?.commitments ?? []; track c) { <li>{{ c }}</li> }
                  </ul>
                }
              </td>
              <td class="px-3 py-4"><app-evidence-cell [b]="b" [o]="o" [locked]="locked()" (requested)="changed.emit(undefined)" /></td>
              <td class="py-4 pl-3 pr-5">
                <div class="flex flex-col gap-3">
                  <app-select [class]="big" [label]="'Final rating for ' + o.title" [disabled]="locked()" [invalid]="!!e()[o.id + '.rating']"
                    [value]="rating(o.id) ? '' + rating(o.id) : ''" (valueChange)="setRating(o.id, { rating: $event ? +$event : undefined })" [options]="ratingOpts" />
                  @if (e()[o.id + '.rating']) { <span class="-mt-2 text-xs text-red-600">{{ e()[o.id + '.rating'] }}</span> }
                  <app-label text="Rationale" [required]="true" [error]="e()[o.id + '.rationale']" [hint]="hint(o)">
                    <textarea rows="2" [disabled]="locked()" [attr.aria-invalid]="!!e()[o.id + '.rationale']" [class]="area + ' ' + border(e()[o.id + '.rationale'])"
                      [value]="r.ratings[o.id]?.rationale ?? ''" (input)="setRating(o.id, { rationale: $any($event.target).value })"></textarea>
                  </app-label>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </section>

    <div class="grid gap-5 lg:grid-cols-2">
      <section class="rounded-md border border-slate/25 p-5">
        <h2 class="text-[15px] font-semibold text-navy">Compliance gate<span class="text-red-600"> *</span></h2>
        <p class="mt-1 text-xs text-slate">Identity, KYC, high-risk flow and Chapter 14A rules aren't a weighted objective, but a breach can gate overall performance.</p>
        <div class="mt-3 flex flex-col gap-2" role="radiogroup" [attr.aria-invalid]="!!e()['gate']">
          @for (g of gates; track g.v) {
            <label class="flex cursor-pointer items-center gap-2 rounded border px-3 py-2.5 text-sm"
              [class]="(r.gate.breach === g.v ? 'border-navy bg-label/50' : 'border-slate/40 hover:bg-mist') + (locked() ? ' pointer-events-none opacity-70' : '')">
              <input type="radio" name="gate" [class]="radio" [checked]="r.gate.breach === g.v" [disabled]="locked()" (change)="setGate({ breach: g.v })" />
              {{ g.label }}
            </label>
          }
          @if (e()['gate']) { <span class="text-xs text-red-600">{{ e()['gate'] }}</span> }
        </div>
        @if (r.gate.breach) {
          <div class="mt-3">
            <app-label text="Breach details" [required]="true" [error]="e()['gateNote']">
              <textarea rows="2" [disabled]="locked()" [attr.aria-invalid]="!!e()['gateNote']" [class]="area + ' ' + border(e()['gateNote'])"
                [value]="r.gate.note" (input)="setGate({ note: $any($event.target).value })"></textarea>
            </app-label>
          </div>
        }
      </section>

      <section class="flex flex-col gap-3 rounded-md border border-slate/25 p-5">
        <h2 class="text-[15px] font-semibold text-navy">Overall</h2>
        <div class="flex items-baseline justify-between gap-3 rounded bg-label/50 px-4 py-3">
          <span class="text-xs text-night/80">Weighted average of ratings</span>
          <span class="text-xl font-semibold tabular-nums text-night">{{ weighted() === null ? rated() + ' / ' + b.template.objectives.length + ' rated' : weighted()!.toFixed(2) }}</span>
        </div>
        <p class="text-xs text-slate">Indicative only — the Panel hasn't confirmed how (or whether) an overall score is used.</p>
        <app-label text="Overall comment (optional)">
          <textarea rows="2" [disabled]="locked()" [class]="area + ' border-slate/40'" [value]="r.overallComment" (input)="r.overallComment = $any($event.target).value"></textarea>
        </app-label>
      </section>
    </div>

    <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
      @if (error) {
        <p role="alert" class="mr-auto text-sm text-red-600">{{ error }}</p>
      } @else if (notice) {
        <p role="status" class="mr-auto text-sm text-[#00857d]">{{ notice }}</p>
      } @else if (tried && hasErrors()) {
        <p role="alert" class="mr-auto text-sm text-red-600">Complete every rating, rationale and the compliance gate before finalizing.</p>
      } @else {
        <p class="mr-auto text-xs text-slate">{{ footnote() }}</p>
      }
      @if (!locked()) {
        <button type="button" [class]="secondary" [disabled]="!!busy" (click)="save('draft')">{{ busy === 'draft' ? 'Saving…' : 'Save draft' }}</button>
        <button type="button" [class]="primary" [disabled]="!!busy || !ended" [title]="ended ? '' : 'Available after the review period ends'" (click)="save('finalize')">
          {{ busy === 'finalize' ? 'Finalizing…' : 'Finalize assessment' }}
        </button>
      }
      @if (r.status === 'finalized') {
        <button type="button" [class]="primary" [disabled]="!!busy" (click)="save('release')">{{ busy === 'release' ? 'Releasing…' : 'Release to employee' }}</button>
      }
    </div>
  `,
})
export class ReviewFormComponent implements OnInit {
  @Input({ required: true }) b!: ReviewBundle;
  @Output() changed = new EventEmitter<ReviewStatus | undefined>();

  readonly big = big;
  readonly area = area;
  readonly border = border;
  readonly primary = primary;
  readonly secondary = secondary;
  readonly radio = radio;
  readonly ratingOpts = RATING_OPTIONS;
  readonly labels = RATING_LABELS;
  readonly fv = formatValue;
  readonly gates = [{ v: false, label: 'No breach recorded for the period' }, { v: true, label: 'Breach recorded — gates overall performance' }];

  r!: Review;
  ended = false;
  tried = false;
  busy: Mode | null = null;
  notice = '';
  error = '';

  ngOnInit() {
    this.r = structuredClone(this.b.review);
    this.ended = periodEnded(this.b.assignment.period);
  }

  locked = () => this.r.status === 'finalized' || this.r.status === 'released';
  e = (): Errors => (this.tried ? validateFinal(this.b, this.r) : {});
  hasErrors = () => Object.keys(this.e()).length > 0;
  ind = (o: Objective) => indicated(o, this.b);
  target = (o: Objective) => this.b.assignment.targets.find((y) => y.objectiveId === o.id);
  rating = (id: string) => this.r.ratings[id]?.rating;
  rated = () => this.b.template.objectives.filter((o) => this.rating(o.id)).length;
  weighted = () => (this.rated() === this.b.template.objectives.length
    ? this.b.template.objectives.reduce((s, o) => s + (o.weight * this.rating(o.id)!) / 100, 0) : null);
  hint = (o: Objective) => {
    const i = this.ind(o), x = this.rating(o.id);
    return i && x && x !== i.rating ? `Differs from the indicated ${i.rating} — explain why.` : o.criteria ? `Criteria for 3: ${o.criteria[2]}` : undefined;
  };
  footnote = () => (this.r.status === 'released' ? `Released ${new Date(this.r.releasedAt!).toLocaleDateString('en-GB')}. Ratings are final.`
    : this.r.status === 'finalized' ? 'Finalized ratings are locked. Releasing makes them visible to the employee.'
    : 'Ratings stay private to the Panel until released.');

  setRating(id: string, patch: Partial<Review['ratings'][string]>) {
    this.r.ratings = { ...this.r.ratings, [id]: { ...(this.r.ratings[id] ?? { rationale: '' }), ...patch } };
  }

  setGate(patch: Partial<Review['gate']>) {
    this.r.gate = { ...this.r.gate, ...patch };
  }

  async save(mode: Mode) {
    this.error = '';
    this.notice = '';
    const name = this.b.member.name;
    if (mode === 'finalize') {
      this.tried = true;
      if (this.hasErrors()) {
        setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
        return;
      }
      if (!confirm(`Finalize ${name}'s ${this.b.assignment.period} assessment? Ratings lock once finalized.`)) return;
    }
    if (mode === 'release' && !confirm(`Release final results to ${name}? They'll see ratings and rationale.`)) return;
    this.busy = mode;
    try {
      this.r = await saveReview(this.r, mode);
      this.changed.emit(this.r.status);
      this.notice = mode === 'draft' ? 'Draft saved.' : mode === 'finalize' ? 'Assessment finalized. Release it when the Panel is ready.' : `Results released to ${name}.`;
    } catch (x) {
      this.error = x instanceof Error ? x.message : "Couldn't save. Please try again.";
    } finally {
      this.busy = null;
    }
  }
}

type Reviewable = Awaited<ReturnType<typeof listReviewable>>[number];

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [PageHeaderComponent, SelectComponent, ChipComponent, ReviewFormComponent],
  template: `
    <app-page-header title="Review & Final Assessment">
      <app-chip tone="bg-label text-navy">MBO Panel / RemCo view</app-chip>
      @if (b) { <app-chip [tone]="statusOf().tone">{{ statusOf().label }}</app-chip> }
    </app-page-header>

    <div [class]="panel + ' flex flex-col gap-6'">
      <section class="grid gap-x-5 gap-y-4 border-b border-slate/20 pb-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)]">
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Review period
          <app-select [class]="big" label="Review period" [value]="periodId" (valueChange)="periodId = $event; memberId = ''; loadList()" [options]="periods" />
        </div>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Employee
          <app-select [class]="big" label="Employee" [value]="memberId" (valueChange)="memberId = $event; loadBundle()" [options]="employeeOpts()" />
        </div>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">
          Role
          <span class="flex min-h-9 items-center rounded bg-label/60 px-3 text-sm font-semibold text-navy">{{ b?.template?.label ?? '—' }}</span>
        </div>
      </section>

      @if (list && !list.length) {
        <div class="rounded-md border border-dashed border-slate/40 px-5 py-12 text-center text-sm text-slate">No employee has accepted targets for {{ periodId }}, so there's nothing to assess.</div>
      } @else if (!b) {
        <div class="h-64 animate-pulse rounded-md bg-mist"></div>
      } @else {
        <!-- re-keyed per employee + period: a fresh form each time -->
        @for (k of [b.member.id + '|' + periodId]; track k) { <app-review-form [b]="b" (changed)="onChanged($event)" /> }
      }
    </div>
  `,
})
export class ReviewComponent implements OnInit {
  @Input() set period(v: string | undefined) { if (v) this.periodId = v; } // ?period=
  @Input() set member(v: string | undefined) { if (v) this.memberId = v; } // ?member=

  readonly panel = PANEL;
  readonly big = big;
  readonly periods = PERIODS;

  periodId = '2025';
  memberId = '';
  list: Reviewable[] | null = null;
  b: ReviewBundle | null = null;
  saved: Record<string, ReviewStatus> = {}; // status after saves on this page
  private req = 0;

  employeeOpts = () => (this.list?.length
    ? this.list.map((x) => ({ value: x.member.id, label: `${x.member.name} — ${REVIEW_STATUS[x.status].label}` }))
    : [{ value: '', label: this.list ? 'No accepted targets for this period' : 'Loading…' }]);
  statusOf = () => REVIEW_STATUS[this.saved[`${this.b!.member.id}|${this.periodId}`] ?? this.b!.review.status];

  ngOnInit() { this.loadList(); }

  async loadList(keepForm = false) {
    if (!keepForm) this.list = null;
    const list = await listReviewable(this.periodId);
    this.list = list;
    if (keepForm) return; // refresh labels only; don't tear the form down
    if (!list.some((x) => x.member.id === this.memberId)) this.memberId = list[0]?.member.id ?? '';
    this.loadBundle();
  }

  async loadBundle() {
    const n = ++this.req;
    this.b = null;
    if (!this.memberId) return;
    const b = await getReview(this.memberId, this.periodId);
    if (n === this.req) this.b = b;
  }

  onChanged(st?: ReviewStatus) {
    if (st && this.b) this.saved[`${this.b.member.id}|${this.periodId}`] = st;
    this.loadList(true);
  }
}
