import { Component, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getObjectiveDetail, type ObjectiveDetail } from '../../api/mbo';
import { BandGuideComponent, ChipComponent, EVIDENCE, formatValue, FrameworkExampleComponent, ProgressBarComponent } from '../../shared/mbo';
import { BackButtonComponent, PageHeaderComponent, PANEL } from '../../shared/ui';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const primary = 'flex h-9 items-center rounded bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40';
const secondary = 'flex h-9 items-center rounded border border-slate/40 bg-white px-4 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40';
const stat = 'text-xl font-semibold tabular-nums';

@Component({
  selector: 'app-objective-details',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, BackButtonComponent, BandGuideComponent, ChipComponent, FrameworkExampleComponent, ProgressBarComponent],
  template: `
    @if (missing) {
      <app-page-header title="Objective Details"><app-back-button href="/bd/web/mbo/my" to="My MBO" /></app-page-header>
      <div [class]="panel + ' py-14 text-center'">
        <p class="text-sm font-semibold text-night">This objective isn't available</p>
        <p class="mt-1 text-sm text-slate">Your {{ periodId }} targets may not be accepted yet. Open My MBO to review them.</p>
      </div>
    } @else {
      <app-page-header [title]="d?.objective?.title ?? 'Objective Details'">
        <a routerLink="/bd/web/mbo/escalations/new" [queryParams]="{ objective: id, period: periodId }" [class]="secondary">Raise escalation</a>
        <a routerLink="/bd/web/mbo/progress" [queryParams]="{ objective: id, period: periodId }" [class]="primary">Update progress / evidence</a>
        <app-back-button href="/bd/web/mbo/my" to="My MBO" />
      </app-page-header>

      @if (!d) {
        <div [class]="panel + ' flex flex-col gap-4'">@for (i of [0, 1]; track i) { <div class="h-36 animate-pulse rounded-md bg-mist"></div> }</div>
      } @else {
        <div [class]="panel + ' flex flex-col gap-6'">
          <section class="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-slate/20 pb-5 text-sm">
            <span class="text-night/80">Objective <span class="font-semibold text-night">{{ d.index + 1 }} of {{ d.mbo.template.objectives.length }}</span></span>
            <span class="text-night/80">Weight <span class="font-semibold text-navy">{{ d.objective.weight }}%</span></span>
            <span class="text-night/80">Period <span class="font-semibold text-night">{{ periodId }} · 1 Jan–31 Dec</span></span>
            <span class="text-night/80">Final rating <span class="font-semibold text-night">Not yet assessed</span> <span class="text-xs text-slate">(MBO Panel / RemCo)</span></span>
          </section>

          <section>
            <h2 class="mb-4 text-[15px] font-semibold text-navy">Progress</h2>
            @if (numeric()) {
              <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <div class="flex flex-col gap-1"><span class="text-xs font-medium text-slate">Agreed annual target</span><span [class]="stat + ' text-night'">{{ fv(d.objective, d.target.target) }}</span></div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-medium text-slate">Actual to date</span><span [class]="stat + ' text-night'">{{ fv(d.objective, d.progress.actual) }}</span>
                  <span class="text-xs text-slate">As of {{ fmtDate(d.mbo.asOf) }}</span>
                </div>
                <div class="flex flex-col gap-1"><span class="text-xs font-medium text-slate">Remaining to target</span><span [class]="stat + ' text-night'">{{ fv(d.objective, remaining()) }}</span></div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-medium text-slate">Progress</span>
                  <span [class]="stat + ' text-[#00857d]'">{{ round(pct()) }}%</span>
                  <app-progress-bar [pct]="pct()" />
                  <span class="text-xs text-slate">of annual target · not a rating</span>
                </div>
              </div>
            } @else {
              <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div>
                  <p class="mb-2 text-xs font-medium text-slate">{{ d.objective.kind === 'leadership' ? 'Agreed leadership commitments' : 'Agreed commitments' }}</p>
                  <ul class="divide-y divide-slate/15 rounded border border-slate/20">
                    @for (c of d.target.commitments; track c) { <li class="px-4 py-2.5 text-sm text-night">{{ c }}</li> }
                  </ul>
                </div>
                <div class="flex flex-col gap-1.5">
                  <span class="text-xs font-medium text-slate">Evidence status</span>
                  <span><app-chip [tone]="ev[d.progress.evidence].tone">{{ ev[d.progress.evidence].label }}</app-chip></span>
                  <span class="text-xs text-slate">Assessed on evidence by the MBO Panel; there's no % progress for this objective.</span>
                </div>
              </div>
            }
          </section>

          <div class="grid gap-5 lg:grid-cols-2">
            <section class="rounded-md border border-slate/25 p-5">
              <h2 class="mb-3 text-[15px] font-semibold text-navy">Measurement &amp; guidance</h2>
              <dl class="flex flex-col gap-4 text-sm">
                <div><dt class="font-semibold text-night">What counts</dt><dd class="mt-1 text-night/80">{{ d.objective.definition }}</dd></div>
                <div><dt class="font-semibold text-night">Evidence expected</dt><dd class="mt-1 text-night/80">{{ d.objective.evidence }}</dd></div>
                <div><dt class="font-semibold text-night">Framework example</dt><dd class="mt-1">@if (d.objective.example === null) { <span class="text-night/60">None mapped</span> } @else { <app-framework-example [role]="d.mbo.template.id" [objectiveId]="d.objective.id" [example]="d.objective.example" /> }</dd></div>
                <div>
                  <dt class="font-semibold text-night">When to escalate</dt>
                  <dd class="mt-1 text-night/80">A ≥10% variance or capacity issue needs a written escalation within 2–3 business days; bank query risk, immediately.</dd>
                </div>
              </dl>
            </section>
            <section class="rounded-md border border-slate/25 p-5">
              <h2 class="mb-1 text-[15px] font-semibold text-navy">Rating guide</h2>
              <p class="mb-2 text-xs text-slate">For reference only. Rating 3 means the agreed target is met; the Panel sets the final rating.</p>
              <app-band-guide [o]="d.objective" [target]="d.target.target" />
            </section>
          </div>

          <section>
            <div class="mb-3 flex items-baseline justify-between gap-2">
              <h2 class="text-[15px] font-semibold text-navy">Supporting records</h2>
              <span class="text-xs text-slate">{{ d.records.length }} record{{ d.records.length === 1 ? '' : 's' }}</span>
            </div>
            @if (d.records.length === 0) {
              <div class="rounded-md border border-dashed border-slate/40 px-5 py-8 text-center">
                <p class="text-sm font-semibold text-night">No evidence recorded yet</p>
                <p class="mt-1 text-sm text-slate">{{ d.progress.note ?? 'Add records such as: ' + d.objective.evidence }}</p>
              </div>
            } @else {
              <div class="overflow-x-auto rounded-md border border-slate/25">
                <table class="w-full min-w-[640px] text-sm">
                  <thead class="bg-label/60 text-left text-xs text-slate">
                    <tr>
                      <th class="py-2.5 pl-5 pr-3 font-medium">Record</th>
                      <th class="px-3 py-2.5 font-medium">Type</th>
                      <th class="px-3 py-2.5 font-medium">Date</th>
                      <th class="py-2.5 pl-3 pr-5"><span class="sr-only">Open</span></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate/15">
                    @for (r of d.records; track r.id) {
                      <tr>
                        <td class="py-3 pl-5 pr-3"><p class="font-semibold text-night">{{ r.title }}</p><p class="mt-0.5 text-xs text-night/70">{{ r.description }}</p></td>
                        <td class="px-3 py-3 text-night">{{ r.type }}</td>
                        <td class="whitespace-nowrap px-3 py-3 text-night">{{ fmtDate(r.date) }}</td>
                        <td class="py-3 pl-3 pr-5 text-right">
                          <button type="button" disabled title="Document viewer connects to the evidence store" class="h-8 rounded px-3 text-xs font-semibold text-navy hover:bg-mist">View</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        </div>
      }
    }
  `,
})
export class ObjectiveDetailsComponent implements OnInit {
  @Input() id = ''; // :id route param
  @Input() set period(v: string | undefined) { if (v) this.periodId = v; } // ?period=

  readonly panel = PANEL;
  readonly primary = primary;
  readonly secondary = secondary;
  readonly stat = stat;
  readonly ev = EVIDENCE;
  readonly fv = formatValue;
  readonly fmtDate = fmtDate;
  readonly round = Math.round;

  periodId = '2026';
  d: ObjectiveDetail | null = null;
  missing = false;

  numeric = () => this.d!.objective.kind === 'revenue' || this.d!.objective.kind === 'count';
  pct = () => (this.d!.target.target && this.d!.progress.actual !== undefined ? (this.d!.progress.actual / this.d!.target.target) * 100 : 0);
  remaining = () => Math.max(0, (this.d!.target.target ?? 0) - (this.d!.progress.actual ?? 0));

  async ngOnInit() {
    this.d = await getObjectiveDetail(this.periodId, this.id);
    this.missing = !this.d;
  }
}
