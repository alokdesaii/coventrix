import { Component, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { listEscalations, PERIODS, ROLE_TEMPLATES, type Escalation } from '../../api/mbo';
import { CATEGORY_LABEL, variancePct } from '../../lib/mbo-sla';
import { big } from '../../shared/client-list.component';
import { ChipComponent, ESC_STATUS, escalationSla } from '../../shared/mbo';
import { BackButtonComponent, ModalComponent, PageHeaderComponent, PANEL, SelectComponent } from '../../shared/ui';

const fmtDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
// ponytail: objective titles come from the Sales Rep template until the API returns the employee's role with each escalation
const objectiveTitle = (id?: string) => ROLE_TEMPLATES['sales-rep'].objectives.find((o) => o.id === id)?.title ?? 'Not linked';

/** Label/value rows for the escalation popup. */
function detailRows(e: Escalation): [string, string][] {
  const pct = e.comparison && variancePct(e.comparison.expected, e.comparison.actual);
  const rows: [string, string][] = [
    ['Category', CATEGORY_LABEL[e.category]],
    ['Linked objective', objectiveTitle(e.objectiveId)],
    ['Discovered', `${fmtDate(e.discovered)}${e.discoveredTime ? ` · ${e.discoveredTime}` : ''}`],
  ];
  if (e.comparison) {
    rows.push(['Variance', `${pct! > 0 ? '+' : ''}${pct!.toFixed(1)}% · expected HKD ${e.comparison.expected.toLocaleString('en-US')}, actual HKD ${e.comparison.actual.toLocaleString('en-US')} (${fmtDate(e.comparison.from)} – ${fmtDate(e.comparison.to)})`]);
  }
  rows.push(
    ['Impact', e.impact],
    ['Root cause', e.rootCause],
    ['Recovery actions', e.recovery],
    ['Follow-up', [e.owner, e.followUp && `by ${fmtDate(e.followUp)}`].filter(Boolean).join(' ')],
    ['Sent to', `${e.recipients.join(', ')}${e.submittedAt ? ` · ${fmtDate(e.submittedAt)}` : ' (not sent yet)'}`],
  );
  if (e.l4) rows.push(['Level', 'L4 — bank-relationship issue']);
  rows.push(['Evidence', [...e.attachments.map((a) => a.name), e.reference].filter(Boolean).join('\n')]);
  return rows;
}

@Component({
  selector: 'app-escalations',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, BackButtonComponent, SelectComponent, ChipComponent, ModalComponent],
  template: `
    <app-page-header title="My Escalations">
      <a routerLink="/bd/web/mbo/escalations/new" [queryParams]="{ period: periodId }" class="flex h-9 items-center rounded bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/90">+ Raise escalation</a>
      <app-back-button href="/bd/web/mbo/my" to="My MBO" />
    </app-page-header>

    <section [class]="panel">
      <div class="flex flex-wrap items-end gap-4 border-b border-slate/20 p-5">
        <div class="flex w-64 flex-col gap-1.5 text-xs font-medium text-slate">Review period
          <app-select [class]="big" label="Review period" [value]="periodId" (valueChange)="periodId = $event; load()" [options]="periods" />
        </div>
        <p class="ml-auto max-w-md text-xs text-slate">≥10% variances and capacity issues: in writing within 3 business days. Bank-relationship or query risk: the same day.</p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-[13px]">
          <thead class="text-left text-xs text-slate">
            <tr>
              <th class="py-3 pl-5 pr-3 font-medium">Issue</th>
              <th class="px-3 py-3 font-medium">Category</th>
              <th class="px-3 py-3 font-medium">Discovered</th>
              <th class="px-3 py-3 font-medium">SLA</th>
              <th class="px-3 py-3 font-medium">Status</th>
              <th class="py-3 pl-3 pr-5"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate/15 border-t border-slate/15">
            @if (rows === null) {
              @for (i of [0, 1, 2]; track i) {
                <tr>@for (j of [0, 1, 2, 3, 4, 5]; track j) { <td class="px-3 py-3.5 first:pl-5"><div class="h-4 w-24 animate-pulse rounded bg-mist"></div></td> }</tr>
              }
            } @else if (rows.length === 0) {
              <tr><td colspan="6" class="px-5 py-12 text-center text-sm text-slate">No escalations for {{ periodId }}.</td></tr>
            } @else {
              @for (e of rows; track e.id) {
                <tr class="text-night hover:bg-mist/60">
                  <td class="py-3 pl-5 pr-3">
                    <p class="font-semibold">{{ e.title }}</p>
                    <p class="mt-0.5 text-xs text-slate">{{ objectiveTitle(e.objectiveId) }}</p>
                  </td>
                  <td class="px-3 py-3">{{ cat[e.category] }}</td>
                  <td class="whitespace-nowrap px-3 py-3">{{ fmtDate(e.discovered) }}</td>
                  <td class="px-3 py-3"><app-chip [tone]="sla(e).tone">{{ sla(e).label }}</app-chip></td>
                  <td class="px-3 py-3"><app-chip [tone]="esc[e.status].tone">{{ esc[e.status].label }}</app-chip></td>
                  <td class="whitespace-nowrap py-3 pl-3 pr-5 text-right">
                    @if (e.status === 'draft') {
                      <a routerLink="/bd/web/mbo/escalations/new" [queryParams]="{ draft: e.id, period: periodId }" class="inline-flex h-8 items-center rounded px-3 text-xs font-semibold text-navy hover:bg-mist">Continue draft</a>
                    } @else {
                      <button type="button" (click)="open = e" class="h-8 rounded px-3 text-xs font-semibold text-navy hover:bg-mist">View</button>
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
      <div class="border-t border-slate/20 px-5 py-3 text-xs text-slate">{{ footer() }}</div>
    </section>

    <app-modal [open]="!!open" [title]="open?.title ?? ''" width="40rem" (closed)="open = null">
      @if (open) {
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap items-center gap-2">
            <app-chip [tone]="esc[open.status].tone">{{ esc[open.status].label }}</app-chip>
            <app-chip [tone]="sla(open).tone">{{ sla(open).label }}</app-chip>
          </div>
          <dl class="divide-y divide-slate/15 overflow-hidden rounded border border-slate/25">
            @for (r of detailRows(open); track r[0]) {
              <div class="grid grid-cols-[10rem_1fr] text-sm">
                <dt class="border-r border-slate/20 bg-label px-3 py-2 font-semibold text-night">{{ r[0] }}</dt>
                <dd class="whitespace-pre-line px-3 py-2 text-night">{{ r[1] || '—' }}</dd>
              </div>
            }
          </dl>
        </div>
      }
    </app-modal>
  `,
})
export class EscalationsComponent implements OnInit {
  @Input() set period(v: string | undefined) { if (v) this.periodId = v; } // ?period=

  readonly panel = PANEL.replace('p-5', '');
  readonly big = big;
  readonly periods = PERIODS;
  readonly cat = CATEGORY_LABEL;
  readonly esc = ESC_STATUS;
  readonly sla = escalationSla;
  readonly fmtDate = fmtDate;
  readonly objectiveTitle = objectiveTitle;
  readonly detailRows = detailRows;

  periodId = '2026';
  rows: Escalation[] | null = null;
  open: Escalation | null = null;
  private req = 0;

  footer = () => {
    if (!this.rows) return 'Loading…';
    const drafts = this.rows.filter((e) => e.status === 'draft').length, n = this.rows.length;
    return `${n} escalation${n === 1 ? '' : 's'}${drafts ? ` · ${drafts} draft${drafts > 1 ? 's' : ''} not yet sent — a draft is not a written escalation` : ''}`;
  };

  ngOnInit() { this.load(); }

  async load() {
    const n = ++this.req;
    this.rows = null;
    const rows = await listEscalations(this.periodId);
    if (n === this.req) this.rows = rows;
  }
}
