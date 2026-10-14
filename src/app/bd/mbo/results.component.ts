import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { acknowledgeResults, getMyResults, listMyHistory, RATING_LABELS, type HistoryEntry, type ReviewBundle } from '../../api/mbo';
import { ChipComponent, formatValue } from '../../shared/mbo';
import { BackButtonComponent, PageHeaderComponent, PANEL } from '../../shared/ui';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// Rating chip tones: 4–5 teal, 3 navy-tint, 1–2 amber/red.
const RATING_TONE = ['', 'bg-red-100 text-red-700', 'bg-amber-100 text-amber-800', 'bg-label text-navy', 'bg-teal/10 text-[#00857d]', 'bg-teal/15 text-[#00857d]'];

const HISTORY_LABEL: Record<HistoryEntry['status'], { label: string; tone: string }> = {
  released: { label: 'Released', tone: 'bg-teal/10 text-[#00857d]' },
  'in-progress': { label: 'In progress', tone: 'bg-sky-100 text-sky-800' },
  'no-targets': { label: 'No targets', tone: 'bg-mist text-slate' },
};

@Component({
  selector: 'app-results-view',
  standalone: true,
  imports: [ChipComponent],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <section class="grid gap-x-6 gap-y-4 border-b border-slate/20 pb-6 sm:grid-cols-2 xl:grid-cols-4">
      <div>
        <p class="text-xs font-medium text-slate">Released</p>
        <p class="mt-1 text-sm font-semibold text-night">{{ fmtDate(r.releasedAt!) }}</p>
        <p class="text-xs text-slate">by the MBO Panel / RemCo</p>
      </div>
      <div>
        <p class="text-xs font-medium text-slate">Weighted average of ratings</p>
        <p class="mt-1 text-sm font-semibold tabular-nums text-night">{{ weighted().toFixed(2) }}</p>
        <p class="text-xs text-slate">Indicative · not a separate rating</p>
      </div>
      <div>
        <p class="text-xs font-medium text-slate">Compliance gate</p>
        <p class="mt-1"><app-chip [tone]="r.gate.breach ? 'bg-red-100 text-red-700' : 'bg-teal/10 text-[#00857d]'">{{ r.gate.breach ? 'Breach recorded' : 'No breach recorded' }}</app-chip></p>
        @if (r.gate.breach) { <p class="mt-1 text-xs text-night/80">{{ r.gate.note }}</p> }
      </div>
      <div>
        <p class="text-xs font-medium text-slate">Acknowledgement</p>
        @if (ackAt) {
          <p class="mt-1 text-sm font-semibold text-[#00857d]">Acknowledged {{ fmtDate(ackAt) }}</p>
        } @else {
          <button type="button" [disabled]="busy" (click)="ack()" class="mt-1 h-9 rounded bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40">
            {{ busy ? 'Saving…' : 'Acknowledge results' }}
          </button>
        }
        <p class="mt-1 text-xs text-slate">Confirms you've read them, not that you agree.</p>
      </div>
    </section>

    <section class="overflow-x-auto rounded-md border border-slate/25">
      <table class="w-full min-w-[720px] text-sm">
        <thead class="bg-label/60 text-left text-xs text-slate">
          <tr>
            <th class="w-[26%] py-2.5 pl-5 pr-3 font-medium">Objective</th>
            <th class="w-[22%] px-3 py-2.5 font-medium">Target · final actual</th>
            <th class="w-[18%] px-3 py-2.5 font-medium">Final rating</th>
            <th class="py-2.5 pl-3 pr-5 font-medium">Panel rationale</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate/15">
          @for (o of b.template.objectives; track o.id) {
            <tr class="align-top">
              <td class="py-3.5 pl-5 pr-3">
                <p class="font-semibold text-night">{{ o.title }}</p>
                <p class="mt-0.5 text-xs text-slate">Weight {{ o.weight }}%</p>
              </td>
              <td class="px-3 py-3.5 text-xs">
                @if (o.kind === 'revenue' || o.kind === 'count') {
                  <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 whitespace-nowrap">
                    <dt class="text-slate">Target</dt><dd class="tabular-nums text-night">{{ fv(o, t(o.id)?.target) }}</dd>
                    <dt class="text-slate">Actual</dt><dd class="font-semibold tabular-nums text-night">{{ fv(o, p(o.id)?.actual) }}</dd>
                    @if (pct(o.id) !== null) { <dt class="text-slate">Attainment</dt><dd class="font-semibold tabular-nums text-[#00857d]">{{ pct(o.id)!.toFixed(1) }}%</dd> }
                  </dl>
                } @else {
                  <span class="text-night/80">Assessed against {{ t(o.id)?.commitments?.length ?? 0 }} agreed commitment{{ t(o.id)?.commitments?.length === 1 ? '' : 's' }}</span>
                }
              </td>
              <td class="px-3 py-3.5">
                @if (r.ratings[o.id]?.rating; as n) { <app-chip [tone]="tone[n]">{{ n }} · {{ labels[5 - n] }}</app-chip> }
              </td>
              <td class="py-3.5 pl-3 pr-5 text-night/90">{{ r.ratings[o.id]?.rationale }}</td>
            </tr>
          }
        </tbody>
      </table>
    </section>

    @if (r.overallComment) {
      <section class="rounded-md border border-slate/25 p-5">
        <h2 class="mb-2 text-[15px] font-semibold text-navy">Overall comment from the Panel</h2>
        <p class="whitespace-pre-line text-sm text-night">{{ r.overallComment }}</p>
      </section>
    }
  `,
})
export class ResultsViewComponent implements OnInit {
  @Input({ required: true }) b!: ReviewBundle;
  @Output() acked = new EventEmitter<string>();
  readonly fmtDate = fmtDate;
  readonly fv = formatValue;
  readonly tone = RATING_TONE;
  readonly labels = RATING_LABELS;
  ackAt?: string;
  busy = false;

  get r() { return this.b.review; }
  ngOnInit() { this.ackAt = this.r.acknowledgedAt; }

  t = (id: string) => this.b.assignment.targets.find((x) => x.objectiveId === id);
  p = (id: string) => this.b.progress.find((x) => x.objectiveId === id);
  // Attainment for numeric objectives; null (hidden) when there's no target or actual.
  pct = (id: string) => { const t = this.t(id)?.target, a = this.p(id)?.actual; return t && a !== undefined ? (a / t) * 100 : null; };
  weighted = () => this.b.template.objectives.reduce((s, o) => s + (o.weight * (this.r.ratings[o.id]?.rating ?? 0)) / 100, 0);

  async ack() {
    this.busy = true;
    this.ackAt = await acknowledgeResults(this.b.assignment.period);
    this.busy = false;
    this.acked.emit(this.ackAt);
  }
}

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [PageHeaderComponent, BackButtonComponent, ChipComponent, ResultsViewComponent],
  template: `
    <app-page-header title="Final Results & History"><app-back-button href="/bd/web/mbo/my" to="My MBO" /></app-page-header>

    <div class="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
      <nav aria-label="Review history" class="rounded-md border border-slate/20 bg-white">
        <h2 class="border-b border-slate/20 px-4 py-3 text-[15px] font-semibold text-navy">Review history</h2>
        <ul class="divide-y divide-slate/15">
          @if (!history) { <li class="px-4 py-3"><div class="h-10 animate-pulse rounded bg-mist"></div></li> }
          @for (h of history ?? []; track h.period) {
            <li>
              <button type="button" (click)="show(h.period)" [attr.aria-current]="h.period === shown ? 'true' : null"
                class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition" [class]="h.period === shown ? 'bg-label/60' : 'hover:bg-mist'">
                <span>
                  <span class="block text-sm font-semibold text-night">{{ h.period }} · Annual</span>
                  <span class="block text-xs text-slate">{{ sub(h) }}</span>
                </span>
                <app-chip [tone]="hl[h.status].tone">{{ hl[h.status].label }}</app-chip>
              </button>
            </li>
          }
        </ul>
      </nav>

      <div [class]="panel">
        @if (loading || !history) {
          <div class="h-64 animate-pulse rounded-md bg-mist"></div>
        } @else if (b) {
          @for (k of [shown]; track k) { <app-results-view [b]="b" (acked)="refreshHistory()" /> }
        } @else {
          <div class="rounded-md border border-dashed border-slate/40 px-5 py-14 text-center">
            <p class="text-sm font-semibold text-night">No final results for {{ shown }} yet</p>
            <p class="mx-auto mt-1 max-w-md text-sm text-slate">
              {{ entry()?.status === 'no-targets' ? "You don't have MBO targets for this period." : 'The MBO Panel / RemCo assesses the full year after it ends and releases results here. Track progress in My MBO until then.' }}
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class ResultsComponent implements OnInit {
  @Input() set period(v: string | undefined) { if (v) this.picked = v; } // ?period=

  readonly panel = PANEL;
  readonly hl = HISTORY_LABEL;
  picked = '';
  shown = '';
  history: HistoryEntry[] | null = null;
  b: ReviewBundle | null = null;
  loading = true;
  private req = 0;

  entry = () => this.history?.find((h) => h.period === this.shown);
  sub = (h: HistoryEntry) => (h.status === 'released'
    ? (h.acknowledgedAt ? `Acknowledged ${fmtDate(h.acknowledgedAt)}` : `Released ${fmtDate(h.releasedAt!)}`)
    : '1 Jan – 31 Dec');

  async ngOnInit() {
    this.history = await listMyHistory();
    // Default to the most recent released year.
    this.show(this.picked || this.history.find((h) => h.status === 'released')?.period || this.history[0]?.period || '');
  }

  async show(period: string) {
    const n = ++this.req;
    this.shown = period;
    this.loading = true;
    const b = period ? await getMyResults(period) : null;
    if (n !== this.req) return;
    this.b = b;
    this.loading = false;
  }

  async refreshHistory() { this.history = await listMyHistory(); }
}
