import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { acceptTargets, getMyMbo, PERIODS, requestTargetChanges, type MyMbo, type Objective, type Progress } from '../../api/mbo';
import { big } from '../../shared/client-list.component';
import { ChipComponent, EVIDENCE, formatValue, ProgressBarComponent, StatusChipComponent } from '../../shared/mbo';
import { PageHeaderComponent, PANEL, SelectComponent } from '../../shared/ui';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const primary = 'h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40';
const secondary = 'h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40';
const numericKind = (o: Objective) => o.kind === 'revenue' || o.kind === 'count';

/** Shown while targets wait for the employee: review, then accept or ask for changes. */
@Component({
  selector: 'app-review-targets',
  standalone: true,
  host: { class: 'flex flex-col gap-5' },
  template: `
    <div class="rounded bg-sky-50 px-4 py-3 text-sm text-sky-900">
      <p class="font-semibold">Your {{ period }} targets are ready for you to review</p>
      <p class="mt-0.5 text-sky-800">Accept them to start tracking progress, or ask your manager for changes.</p>
    </div>

    @if (d.assignment.notes) {
      <div class="rounded border border-slate/25 px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate">Note from your manager</p>
        <p class="mt-1 whitespace-pre-line text-sm text-night">{{ d.assignment.notes }}</p>
      </div>
    }

    <div class="overflow-x-auto rounded-md border border-slate/25">
      <table class="w-full min-w-[720px] text-sm">
        <thead class="bg-label/60 text-left text-xs text-slate">
          <tr>
            <th class="py-2.5 pl-5 pr-3 font-medium">Objective</th>
            <th class="px-3 py-2.5 text-right font-medium">Weight</th>
            <th class="py-2.5 pl-3 pr-5 font-medium">Agreed target / commitments</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate/15">
          @for (o of d.template.objectives; track o.id) {
            <tr class="align-top">
              <td class="py-3 pl-5 pr-3">
                <p class="font-semibold text-night">{{ o.title }}</p>
                <p class="mt-0.5 text-xs text-night/70">{{ o.definition }}</p>
              </td>
              <td class="px-3 py-3 text-right font-semibold tabular-nums text-navy">{{ o.weight }}%</td>
              <td class="py-3 pl-3 pr-5 text-night">
                @if (numeric(o)) {
                  <span class="font-semibold tabular-nums">{{ fv(o, target(o).target) }} <span class="font-normal text-slate">/ year</span></span>
                } @else {
                  <ul class="list-disc space-y-1 pl-4 text-sm">@for (c of target(o).commitments; track c) { <li>{{ c }}</li> }</ul>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (asking) {
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium text-night/70">What should change, and why?<span class="text-red-600"> *</span></span>
        <textarea #c rows="3" [value]="comment" (input)="comment = c.value" placeholder="e.g. The CBD target assumes a bank already onboarded last year."
          class="w-full rounded border border-slate/40 px-3 py-2 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20"></textarea>
      </label>
    }

    <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
      @if (error) { <p role="alert" class="mr-auto text-sm text-red-600">{{ error }}</p> }
      @if (asking) {
        <button type="button" [class]="secondary" [disabled]="busy" (click)="asking = false; comment = ''">Cancel</button>
        <button type="button" [class]="primary" [disabled]="busy || !comment.trim()" (click)="run(requestChanges)">{{ busy ? 'Sending…' : 'Send to manager' }}</button>
      } @else {
        <button type="button" [class]="secondary" [disabled]="busy" (click)="ask()">Request changes</button>
        <button type="button" [class]="primary" [disabled]="busy" (click)="run(accept)">{{ busy ? 'Accepting…' : 'Accept targets' }}</button>
      }
    </div>
  `,
})
export class ReviewTargetsComponent {
  @Input({ required: true }) d!: MyMbo;
  @Input({ required: true }) period!: string;
  @Output() done = new EventEmitter<void>();
  readonly primary = primary;
  readonly secondary = secondary;
  readonly numeric = numericKind;
  readonly fv = formatValue;
  asking = false;
  comment = '';
  busy = false;
  error = '';

  target = (o: Objective) => this.d.assignment.targets.find((x) => x.objectiveId === o.id)!;
  accept = () => acceptTargets(this.period);
  requestChanges = () => requestTargetChanges(this.period, this.comment.trim());

  ask() {
    this.asking = true;
    setTimeout(() => document.querySelector<HTMLTextAreaElement>('app-review-targets textarea')?.focus());
  }

  async run(fn: () => Promise<unknown>) {
    this.busy = true;
    this.error = '';
    try {
      await fn();
      this.done.emit();
    } catch {
      this.error = 'Something went wrong. Please try again.';
      this.busy = false;
    }
  }
}

@Component({
  selector: 'app-my-mbo',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, SelectComponent, StatusChipComponent, ChipComponent, ProgressBarComponent, ReviewTargetsComponent],
  template: `
    <app-page-header title="My MBO">
      <!-- Escalations don't depend on target acceptance (capacity / bank risk can arise any time). -->
      <a routerLink="/bd/web/mbo/escalations/new" [queryParams]="{ period }" [class]="secondary + ' flex h-9 items-center'">Raise escalation</a>
      @if (accepted()) {
        <a routerLink="/bd/web/mbo/progress" [queryParams]="{ period }" [class]="primary + ' flex h-9 items-center'">Update progress / evidence</a>
      }
    </app-page-header>

    <div [class]="panel + ' flex flex-col gap-6'">
      <section class="grid gap-x-6 gap-y-4 border-b border-slate/20 pb-6 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
        <div>
          <p class="text-base font-semibold text-night">{{ d?.member?.name ?? ' ' }}</p>
          <p class="mt-0.5 text-sm text-night/80">{{ d?.template?.label }}</p>
          <p class="mt-0.5 text-xs text-slate">Harbour &amp; Hills HK · {{ d?.member?.unit }}</p>
        </div>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Review period
          <app-select [class]="big" label="Review period" [value]="period" (valueChange)="period = $event; load()" [options]="periods" />
        </div>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">
          Targets
          <span>@if (d) { <app-status-chip [status]="d.assignment.status" /> } @else { &nbsp; }</span>
        </div>
        <div class="flex flex-col gap-1 text-xs font-medium text-slate">
          Final rating
          <span class="text-sm font-semibold text-night">{{ d?.finalRating ? d!.finalRating!.rating : 'Not yet assessed' }}</span>
          <span class="font-normal">MBO Panel / RemCo only</span>
          <span aria-disabled="true" title="Coming soon" class="mt-1 cursor-not-allowed font-semibold text-slate">Past results →</span>
        </div>
      </section>

      @if (!d) {
        <div class="flex flex-col gap-4">@for (i of [0, 1]; track i) { <div class="h-40 animate-pulse rounded-md bg-mist"></div> }</div>
      } @else if (d.assignment.status === 'awaiting-acceptance') {
        <app-review-targets [d]="d" [period]="period" (done)="load()" />
      } @else if (d.assignment.status === 'changes-requested') {
        <div class="rounded bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p class="font-semibold">You asked your manager to change these targets</p>
          <p class="mt-1 whitespace-pre-line">“{{ d.assignment.changeRequest }}”</p>
          <p class="mt-2 text-amber-800">They'll send revised targets for you to review.</p>
        </div>
      } @else if (!accepted()) {
        <div class="rounded-md border border-dashed border-slate/40 px-5 py-12 text-center">
          <p class="text-sm font-semibold text-night">No targets for {{ period }} yet</p>
          <p class="mt-1 text-sm text-slate">Your manager hasn't sent your MBO targets for this period. You'll be able to review and accept them here.</p>
        </div>
      } @else {
        <section>
          <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-[15px] font-semibold text-navy">My agreed objectives</h2>
            <p class="text-xs text-slate">Actuals to {{ fmtDate(d.asOf) }} · progress is % of the annual target, not a rating</p>
          </div>
          <div class="overflow-x-auto rounded-md border border-slate/25">
            <table class="w-full min-w-[920px] text-sm">
              <thead class="bg-label/60 text-left text-xs text-slate">
                <tr>
                  <th class="w-[34%] py-2.5 pl-5 pr-3 font-medium">Objective</th>
                  <th class="px-3 py-2.5 text-right font-medium">Weight</th>
                  <th class="px-3 py-2.5 font-medium">Agreed target</th>
                  <th class="px-3 py-2.5 font-medium">Actual to date</th>
                  <th class="px-3 py-2.5 font-medium">Progress / evidence</th>
                  <th class="py-2.5 pl-3 pr-5"><span class="sr-only">Details</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate/15">
                @for (o of d.template.objectives; track o.id) {
                  <tr class="align-middle">
                    <td class="py-3.5 pl-5 pr-3">
                      <p class="font-semibold text-night">{{ o.title }}</p>
                      <p class="mt-0.5 line-clamp-2 text-xs text-night/70">{{ o.definition }}</p>
                    </td>
                    <td class="px-3 py-3.5 text-right font-semibold tabular-nums text-navy">{{ o.weight }}%</td>
                    <td class="px-3 py-3.5 text-night">
                      @if (numeric(o)) { <span class="font-medium tabular-nums">{{ fv(o, t(o).target) }}</span> }
                      @else { <span class="text-xs">{{ t(o).commitments.length }} agreed commitment{{ t(o).commitments.length === 1 ? '' : 's' }}</span> }
                    </td>
                    <td class="px-3 py-3.5 tabular-nums text-night">
                      @if (numeric(o)) { {{ fv(o, p(o).actual) }} } @else { <span class="text-xs text-slate">Assessed on evidence</span> }
                    </td>
                    <td class="px-3 py-3.5">
                      @if (pct(o) !== null) {
                        <div class="flex min-w-36 flex-col gap-1.5">
                          <span class="text-sm font-semibold tabular-nums text-[#00857d]">{{ round(pct(o)!) }}%</span>
                          <app-progress-bar [pct]="pct(o)!" />
                          @if (p(o).evidence !== 'evidenced') { <app-chip [tone]="ev[p(o).evidence].tone">{{ ev[p(o).evidence].label }}</app-chip> }
                        </div>
                      } @else {
                        <app-chip [tone]="ev[p(o).evidence].tone">{{ ev[p(o).evidence].label }}</app-chip>
                      }
                    </td>
                    <td class="py-3.5 pl-3 pr-5 text-right">
                      <a [routerLink]="'/bd/web/mbo/objective/' + o.id" [queryParams]="{ period: d.assignment.period }" [attr.aria-label]="'Details for ' + o.title"
                        class="inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs font-semibold text-navy hover:bg-mist">
                        Details
                        <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot class="border-t border-slate/25 text-xs text-slate">
                <tr>
                  <td class="py-2.5 pl-5 pr-3 font-medium text-night">Total weight</td>
                  <td class="px-3 py-2.5 text-right font-semibold text-navy">{{ totalWeight() }}%</td>
                  <td colspan="4" class="py-2.5 pl-3 pr-5">Weights are fixed by the {{ d.template.label }} framework.</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <div class="grid gap-5 lg:grid-cols-2">
          <section class="rounded-md border border-slate/25 p-5">
            <div class="mb-3 flex items-center gap-3">
              <h2 class="mr-auto text-[15px] font-semibold text-navy">Needs your attention</h2>
              @if (attention().length > 0) {
                <app-chip tone="bg-amber-100 text-amber-800">{{ attention().length }} evidence action{{ attention().length > 1 ? 's' : '' }}</app-chip>
              }
            </div>
            @if (attention().length === 0) {
              <p class="text-sm text-slate">All objectives have evidence recorded.</p>
            } @else {
              <ul class="divide-y divide-slate/15">
                @for (x of attention(); track x.objectiveId) {
                  <li class="flex items-start gap-4 py-3">
                    <div class="mr-auto">
                      <p class="text-sm font-semibold text-night">{{ obj(x.objectiveId).title }}</p>
                      <p class="mt-0.5 text-xs text-night/70">{{ x.note ?? obj(x.objectiveId).evidence }}</p>
                    </div>
                    <app-chip [tone]="ev[x.evidence].tone">{{ ev[x.evidence].label }}</app-chip>
                  </li>
                }
              </ul>
            }
          </section>

          <section class="rounded-md border border-slate/25 p-5 text-sm">
            <div class="mb-3 flex items-center justify-between gap-3">
              <h2 class="text-[15px] font-semibold text-navy">Escalation &amp; assessment</h2>
              <a routerLink="/bd/web/mbo/escalations" class="text-xs font-semibold text-navy hover:underline">My escalations →</a>
            </div>
            <dl class="divide-y divide-slate/15">
              <div class="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt class="font-medium text-night">≥10% variance or capacity issue</dt><dd class="text-night/80">Escalate in writing to your manager within 2–3 business days.</dd></div>
              <div class="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt class="font-medium text-night">Bank query risk</dt><dd class="text-night/80">Escalate immediately.</dd></div>
              <div class="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt class="font-medium text-night">Final rating</dt><dd class="text-night/80">Set by the MBO Panel / RemCo only, on a 1–5 scale. 3 means the agreed target is met.</dd></div>
            </dl>
          </section>
        </div>
      }
    </div>
  `,
})
export class MyMboComponent implements OnInit {
  readonly panel = PANEL;
  readonly big = big;
  readonly periods = PERIODS;
  readonly primary = primary;
  readonly secondary = secondary;
  readonly ev = EVIDENCE;
  readonly fv = formatValue;
  readonly fmtDate = fmtDate;
  readonly numeric = numericKind;
  readonly round = Math.round;

  period = '2026';
  d: MyMbo | null = null;
  private req = 0;

  accepted = () => this.d?.assignment.status === 'accepted';
  t = (o: Objective) => this.d!.assignment.targets.find((x) => x.objectiveId === o.id)!;
  p = (o: Objective): Progress => this.d!.progress.find((x) => x.objectiveId === o.id)!;
  obj = (id: string) => this.d!.template.objectives.find((x) => x.id === id)!;
  attention = () => this.d!.progress.filter((x) => x.evidence !== 'evidenced');
  totalWeight = () => this.d!.template.objectives.reduce((s, o) => s + o.weight, 0);
  /** % of annual target for numeric objectives with an actual; null otherwise. */
  pct = (o: Objective) => {
    const target = this.t(o).target, actual = this.p(o).actual;
    return numericKind(o) && target && actual !== undefined ? (actual / target) * 100 : null;
  };

  ngOnInit() { this.load(); }

  async load() {
    const n = ++this.req;
    this.d = null;
    const d = await getMyMbo(this.period);
    if (n === this.req) this.d = d;
  }
}
