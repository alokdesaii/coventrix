import { NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { getMonthlyReport, saveMonthlyEntries, type EntryRow, type MonthlyEntries, type MonthlyReport, type Side } from '../../api/monthly';
import { PageHeaderComponent, PANEL, SelectComponent, TableCardComponent, TabsComponent, type Cell } from '../../shared/ui';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TABS = ['General Information', 'Clients & Banks', 'Products', 'Other Information'] as const;
type Tab = (typeof TABS)[number];
const SIDES: { key: Side; label: string }[] = [{ key: 'corporate', label: 'Corporate' }, { key: 'msb', label: 'MSB' }];

const num = (n: number, dp = 2) => n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const monthName = (m: number) => MONTHS[m - 1]?.slice(0, 3) ?? String(m);
const input = 'h-9 w-full rounded border border-slate/40 bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20';
const heading = 'mb-3 block text-[15px] font-semibold text-navy';

/** Label/value table with the shaded label column (same style as the client profile). */
@Component({
  selector: 'app-kv',
  standalone: true,
  host: { class: 'block h-full' },
  template: `
    <!-- Gradient keeps the label column shaded to the bottom when a neighbouring card stretches this one. -->
    <dl class="h-full divide-y divide-slate/15 overflow-hidden rounded-md border border-slate/25 bg-[linear-gradient(to_right,#e6eef6_50%,white_50%)]">
      @for (r of rows; track r[0]) {
        <div class="grid grid-cols-2 bg-white text-sm">
          <dt class="border-r border-slate/20 bg-label px-4 py-2.5 font-semibold text-night">{{ r[0] }}</dt>
          <dd class="px-4 py-2.5 tabular-nums text-night">{{ r[1] === '' || r[1] === undefined ? '—' : r[1] }}</dd>
        </div>
      }
    </dl>
  `,
})
export class KvComponent {
  @Input({ required: true }) rows!: [string, string | number][];
}

/** List of manually entered two-field rows with an add row underneath. */
@Component({
  selector: 'app-entry-list',
  standalone: true,
  host: { class: 'block' },
  template: `
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-xs text-slate">
          <th class="w-1/2 py-2.5 pl-4 pr-2 font-medium">{{ fields[0] }}</th>
          <th class="border-l border-slate/15 py-2.5 pl-3 pr-2 font-medium">{{ fields[1] }}</th>
          <th class="w-14 pr-4"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate/15 border-t border-slate/20">
        @for (r of rows; track i; let i = $index) {
          <tr class="text-night">
            <td class="py-2.5 pl-4 pr-2">{{ r[0] || '—' }}</td>
            <td class="border-l border-slate/15 py-2.5 pl-3 pr-2">{{ r[1] || '—' }}</td>
            <td class="py-1 pr-4 text-right">
              <button type="button" [attr.aria-label]="'Remove ' + r[0]" (click)="rowsChange.emit(without(i))"
                class="grid size-8 place-items-center rounded-md text-slate hover:bg-red-50 hover:text-red-600">
                <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </td>
          </tr>
        }
        <tr>
          <td class="py-2.5 pl-4 pr-2"><input [class]="input" [placeholder]="fields[0]" [attr.aria-label]="fields[0]" [value]="draft[0]"
            (input)="draft[0] = $any($event.target).value" (keydown.enter)="$event.preventDefault(); add()" /></td>
          <td class="border-l border-slate/15 py-2.5 pl-3 pr-2"><input [class]="input" [placeholder]="fields[1]" [attr.aria-label]="fields[1]" [value]="draft[1]"
            (input)="draft[1] = $any($event.target).value" (keydown.enter)="$event.preventDefault(); add()" /></td>
          <td class="py-2.5 pr-4 text-right">
            <button type="button" (click)="add()" aria-label="Add row" class="grid size-9 place-items-center rounded bg-navy text-white transition hover:bg-navy/90">
              <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  `,
})
export class EntryListComponent {
  @Input({ required: true }) fields!: [string, string];
  @Input({ required: true }) rows!: EntryRow[];
  @Output() rowsChange = new EventEmitter<EntryRow[]>();
  readonly input = input;
  draft: EntryRow = ['', ''];
  without = (i: number) => this.rows.filter((_, j) => j !== i);
  add() {
    if (!this.draft[0].trim() && !this.draft[1].trim()) return;
    this.rowsChange.emit([...this.rows, [this.draft[0].trim(), this.draft[1].trim()]]);
    this.draft = ['', ''];
  }
}

@Component({
  selector: 'app-box',
  standalone: true,
  host: { class: 'block overflow-hidden rounded-md border border-slate/25' },
  template: `
    <h3 class="border-b border-slate/20 bg-label px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-navy">{{ title }}</h3>
    <ng-content />
  `,
})
export class BoxComponent {
  @Input({ required: true }) title!: string;
}

type CountedKey = 'newClients' | 'accountsClosed' | 'rejected';
const COUNTED: { key: CountedKey; title: string; totalLabel: string; fields: [string, string] }[] = [
  { key: 'newClients', title: 'New Clients On-Boarded', totalLabel: 'New clients on-boarded', fields: ['Client Name', 'Account Number'] },
  { key: 'accountsClosed', title: 'Accounts Closed', totalLabel: 'Accounts closed', fields: ['Client Name', 'Account Number'] },
  { key: 'rejected', title: 'Potential New Clients Rejected', totalLabel: 'Potential new clients rejected', fields: ['Client Name', 'Reason of Rejection'] },
];

const NOTES: [keyof MonthlyEntries['notes'], string][] = [
  ['marketNews', 'Relevant Market News'], ['correspondentBanks', 'Correspondent Banks'],
  ['compliance', 'Compliance'], ['it', 'IT'], ['otherTopics', 'Other Topics'],
];

@Component({
  selector: 'app-monthly-management',
  standalone: true,
  imports: [NgTemplateOutlet, PageHeaderComponent, SelectComponent, TableCardComponent, TabsComponent, KvComponent, EntryListComponent, BoxComponent],
  template: `
    <app-page-header title="Monthly Management Report">
      <span class="text-sm font-medium text-slate">Month</span>
      <app-select class="w-40 [&_select]:h-9 [&_select]:text-sm" label="Month" [value]="month" (valueChange)="pickMonth($event)" [options]="monthOpts" />
    </app-page-header>

    <div [class]="panel">
      <app-tabs label="Report sections" [tabs]="tabs" [value]="tab" (valueChange)="tab = $event" />

      @if (!report || !entries) {
        <div class="grid gap-5 lg:grid-cols-2">
          @for (i of [0, 1, 2, 3]; track i) { <div class="h-40 animate-pulse rounded-md bg-mist"></div> }
        </div>
      } @else {
        @switch (tab) {
          @case ('General Information') {
            <div class="flex flex-col gap-6">
              <section>
                <h2 [class]="heading">MBO</h2>
                <div class="lg:w-1/2">
                  <app-kv [rows]="[['MBO Target Revenue', report.mbo.targetRevenue], ['MBO Target Net Profit', report.mbo.targetNetProfit], ['MBO Target Cost-Income Ratio', report.mbo.targetCostIncomeRatio]]" />
                </div>
              </section>
              <section class="grid gap-5 lg:grid-cols-2">
                <div>
                  <h2 [class]="heading">YTD</h2>
                  <app-kv [rows]="[['YTD Revenue', num(report.ytd.revenue)], ['YTD Expenses', num(report.ytd.expenses)], ['YTD Net Profit', num(report.ytd.netProfit)], ['YTD Cost-Income Ratio', num(report.ytd.costIncomeRatio) + '%']]" />
                </div>
                <div>
                  <h2 [class]="heading">Last Month</h2>
                  <app-kv [rows]="[['Revenue', num(report.lastMonth.revenue)], ['Expenses', num(report.lastMonth.expenses)], ['Net Profit', num(report.lastMonth.netProfit)]]" />
                </div>
              </section>
              <section class="grid gap-5 lg:grid-cols-2">
                <app-table-card title="Top 5 Currencies" [columns]="[{ label: 'Currency' }, { label: 'Count', numeric: true }]" [rows]="general.currencies" />
                <app-table-card title="Number of Transactions" [columns]="[{ label: 'Type' }, { label: 'Count', numeric: true }]" [rows]="general.byType" />
                <app-table-card title="Year Wise Transactions" [scroll]="true" [columns]="[{ label: 'Month' }, { label: 'Year' }, { label: 'Count', numeric: true }]" [rows]="general.yearTx" />
                <app-table-card title="Year Wise Gross Profit" [scroll]="true" [columns]="[{ label: 'Month' }, { label: 'Year' }, { label: 'Amount', numeric: true }]" [rows]="general.yearGp" />
              </section>
            </div>
          }
          @case ('Clients & Banks') {
            <div class="flex flex-col gap-8">
              @for (c of counted; track c.key) {
                <section>
                  <h2 [class]="heading">{{ c.title }}</h2>
                  <div class="grid gap-5 lg:grid-cols-2">
                    @for (s of sides; track s.key) {
                      <app-box [title]="s.label">
                        <label class="flex items-center gap-3 border-b border-slate/20 px-4 py-2.5 text-sm text-night">
                          <span class="flex-1">{{ c.totalLabel }}: <span class="text-slate">total no.</span></span>
                          <input [class]="totalInput" inputmode="numeric" [value]="entries[c.key][s.key].total"
                            (input)="setTotal(c.key, s.key, $any($event.target))" />
                        </label>
                        <app-entry-list [fields]="c.fields" [rows]="entries[c.key][s.key].rows" (rowsChange)="entries[c.key][s.key].rows = $event; touch()" />
                      </app-box>
                    }
                  </div>
                </section>
              }

              <section>
                <h2 [class]="heading">Meetings</h2>
                <div class="grid gap-5 lg:grid-cols-2">
                  @for (s of sides; track s.key) {
                    <app-box [title]="s.label + ' meetings'">
                      <app-entry-list [fields]="['Client Name', 'Account Number']" [rows]="entries.meetings[s.key].rows" (rowsChange)="entries.meetings[s.key].rows = $event; touch()" />
                    </app-box>
                  }
                </div>
              </section>

              <section>
                <h2 [class]="heading">Top 10 Clients By Gross Profit</h2>
                <div class="grid gap-5 lg:grid-cols-2">
                  @for (s of sides; track s.key) {
                    <app-table-card [title]="s.label" [columns]="[{ label: 'Client Name' }, { label: 'Account Number' }, { label: 'Profit (HKD)', numeric: true }]"
                      [rows]="topClients[s.key]" />
                  }
                </div>
              </section>

              <section class="grid gap-5 lg:grid-cols-2">
                <div>
                  <h2 [class]="heading">Banks (Accounts Opened)</h2>
                  <app-box title="Banks">
                    <app-entry-list [fields]="['Accounts Opened', 'Currency']" [rows]="entries.banksOpened" (rowsChange)="entries.banksOpened = $event; touch()" />
                  </app-box>
                </div>
                <div>
                  <h2 [class]="heading">Bank Tracer</h2>
                  <app-box title="Bank tracer">
                    <app-entry-list [fields]="['Bank Tracer', 'Status']" [rows]="entries.bankTracer" (rowsChange)="entries.bankTracer = $event; touch()" />
                  </app-box>
                </div>
              </section>

              <section>
                <h2 [class]="heading">Bank Rank by Cost and No. of Payments</h2>
                <div class="grid gap-5 lg:grid-cols-2">
                  <app-table-card title="By Cost" [columns]="[{ label: 'Bank' }, { label: 'Cost', numeric: true }]" [rows]="bankRank.cost" />
                  <app-table-card title="By Number of Payments" [columns]="[{ label: 'Bank' }, { label: 'Number of Payments', numeric: true }]" [rows]="bankRank.payments" />
                </div>
              </section>
            </div>
          }
          @case ('Products') {
            <div class="flex flex-col gap-6">
              <section class="grid gap-5 lg:grid-cols-2">
                <div>
                  <h2 [class]="heading">Bank Notes</h2>
                  <app-table-card title="Total Number of Transactions" [scroll]="true" [columns]="[{ label: 'Year' }, { label: 'Month' }, { label: 'Count', numeric: true }]" [rows]="products.notes" />
                </div>
                <div>
                  <h2 [class]="heading">Currencies</h2>
                  <app-table-card title="Top 10 Currencies (No. of Transactions)" [scroll]="true"
                    [columns]="[{ label: 'Currency' }, { label: 'Count', numeric: true }, { label: 'Last Month Count', numeric: true }]" [rows]="products.currencies" />
                </div>
              </section>
              <section class="grid gap-5 lg:grid-cols-2">
                <app-kv [rows]="[['Bank Notes Sold to Bank', report.bankNotesSoldToBank.amount], ['Total Deals', report.bankNotesSoldToBank.totalDeals]]" />
                <app-kv [rows]="[['Bank Notes Sold to Corporate and MSB Clients', report.bankNotesSoldToClients.amount], ['Total Deals', report.bankNotesSoldToClients.totalDeals]]" />
              </section>
            </div>
          }
          @case ('Other Information') {
            <div class="grid gap-5 lg:grid-cols-2">
              @for (n of notes; track n[0]) {
                <label class="flex flex-col gap-1.5">
                  <span class="text-xs font-medium text-night/70">{{ n[1] }}</span>
                  <textarea rows="4" [value]="entries.notes[n[0]]" (input)="entries.notes[n[0]] = $any($event.target).value; touch()"
                    class="w-full resize-y rounded border border-slate/40 bg-white px-3 py-2 text-sm text-night outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"></textarea>
                </label>
              }
            </div>
          }
        }

        @if (tab === 'Clients & Banks' || tab === 'Other Information') {
          <div class="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
            @if (notice) {
              <p role="status" class="mr-auto text-sm text-[#00857d]">{{ notice }}</p>
            } @else if (dirty) {
              <p class="mr-auto text-sm text-slate">You have unsaved changes for {{ months[+month - 1] }}.</p>
            }
            <button type="button" [disabled]="!dirty || saving" (click)="save()"
              class="h-10 rounded bg-navy px-6 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40">
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        }
      }
    </div>
  `,
})
export class MonthlyManagementComponent implements OnInit {
  readonly panel = PANEL;
  readonly heading = heading;
  readonly tabs = TABS;
  readonly months = MONTHS;
  readonly monthOpts = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));
  readonly sides = SIDES;
  readonly counted = COUNTED;
  readonly notes = NOTES;
  readonly num = num;
  readonly totalInput = input.replace('w-full', 'w-28 shrink-0');

  month = String(new Date().getMonth() + 1);
  tab: Tab = 'General Information';
  report: MonthlyReport | null = null;
  entries: MonthlyEntries | null = null;
  dirty = false;
  saving = false;
  notice = '';
  private req = 0;

  // Table rows derived once per load.
  general = { currencies: [] as Cell[][], byType: [] as Cell[][], yearTx: [] as Cell[][], yearGp: [] as Cell[][] };
  topClients: Record<Side, Cell[][]> = { corporate: [], msb: [] };
  bankRank = { cost: [] as Cell[][], payments: [] as Cell[][] };
  products = { notes: [] as Cell[][], currencies: [] as Cell[][] };

  ngOnInit() { this.load(); }

  pickMonth(v: string) {
    if (this.dirty && !confirm('Discard unsaved changes for this month?')) return;
    this.month = v;
    this.load();
  }

  async load() {
    const n = ++this.req;
    this.report = null;
    const r = await getMonthlyReport(Number(this.month));
    if (n !== this.req) return;
    this.general = {
      currencies: r.topCurrencies.map((x) => [x.currency, x.count]),
      byType: r.transactionsByType.map((x) => [x.type, x.count]),
      yearTx: r.yearWiseTransactions.map((x) => [monthName(x.month), String(x.year), x.count]),
      yearGp: r.yearWiseGrossProfit.map((x) => [monthName(x.month), String(x.year), num(x.amount)]),
    };
    this.topClients = {
      corporate: r.topClientsByProfit.corporate.map((x) => [x.client, x.account, num(x.profit)]),
      msb: r.topClientsByProfit.msb.map((x) => [x.client, x.account, num(x.profit)]),
    };
    this.bankRank = { cost: r.bankRankByCost.map((x) => [x.bank, num(x.cost)]), payments: r.bankRankByPayments.map((x) => [x.bank, x.payments]) };
    this.products = {
      notes: r.bankNoteTransactions.map((x) => [String(x.year), monthName(x.month), x.count]),
      currencies: r.topCurrenciesProducts.map((x) => [x.currency, x.count, x.lastMonthCount]),
    };
    this.report = r;
    this.entries = r.entries;
    this.dirty = false;
    this.notice = '';
  }

  touch() {
    this.dirty = true;
    this.notice = '';
  }

  setTotal(key: CountedKey, side: Side, el: HTMLInputElement) {
    el.value = el.value.replace(/\D/g, '');
    this.entries![key][side].total = el.value;
    this.touch();
  }

  async save() {
    this.saving = true;
    try {
      await saveMonthlyEntries(Number(this.month), this.entries!);
      this.dirty = false;
      this.notice = 'Saved.';
    } catch {
      this.notice = 'Could not save. Please try again.';
    } finally {
      this.saving = false;
    }
  }
}
