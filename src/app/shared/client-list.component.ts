import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  exportClients, listClients, STATUSES, WAY_SIDES, WAY_TYPES,
  type Client, type ClientKind, type Page, type Status, type WaySide, type WayType,
} from '../api/clients';
import { downloadCsv, ExportButtonComponent, PageHeaderComponent, PANEL, SelectComponent } from './ui';

export const PAGE_SIZE = 50;

export const STATUS_TONE: Partial<Record<Status, string>> = {
  'Activated': 'bg-teal/10 text-[#00857d]',
  'Converted': 'bg-teal/10 text-[#00857d]',
  'Activation Required': 'bg-amber-100 text-amber-800',
  'In Progress': 'bg-sky-100 text-sky-800',
  'Open Lead': 'bg-sky-100 text-sky-800',
  'Rejected': 'bg-red-100 text-red-700',
  'Suspended': 'bg-red-100 text-red-700',
  'Stop': 'bg-red-100 text-red-700',
};

const opts = (xs: readonly string[]) => [{ value: '', label: 'All' }, ...xs.map((x) => ({ value: x, label: x }))];

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium" [class]="tone()">{{ status }}</span>`,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: Status;
  tone = () => STATUS_TONE[this.status] ?? 'bg-mist text-slate';
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

const pagerBtn = 'grid h-8 min-w-8 place-items-center rounded-md px-2 text-xs font-medium transition disabled:pointer-events-none disabled:opacity-40';

@Component({
  selector: 'app-pager',
  standalone: true,
  host: { class: 'contents' },
  template: `
    <nav aria-label="Pagination" class="flex items-center gap-1">
      @for (a of [arrows[0], arrows[1]]; track a.label) {
        <button type="button" [class]="btn + ' text-slate hover:bg-mist hover:text-navy'" [disabled]="off(a.to())" (click)="pageChange.emit(a.to())" [attr.aria-label]="a.label">
          <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path [attr.d]="a.d" /></svg>
        </button>
      }
      @for (p of pageNumbers(); track p) {
        <button type="button" (click)="pageChange.emit(p)" [attr.aria-current]="p === page ? 'page' : null"
          [class]="btn + ' ' + (p === page ? 'bg-navy text-white' : 'text-night hover:bg-mist')">{{ p }}</button>
      }
      @for (a of [arrows[2], arrows[3]]; track a.label) {
        <button type="button" [class]="btn + ' text-slate hover:bg-mist hover:text-navy'" [disabled]="off(a.to())" (click)="pageChange.emit(a.to())" [attr.aria-label]="a.label">
          <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path [attr.d]="a.d" /></svg>
        </button>
      }
    </nav>
  `,
})
export class PagerComponent {
  @Input({ required: true }) page!: number;
  @Input({ required: true }) total!: number;
  @Output() pageChange = new EventEmitter<number>();
  readonly btn = pagerBtn;
  pages = () => Math.max(1, Math.ceil(this.total / PAGE_SIZE));
  pageNumbers = () => Array.from({ length: this.pages() }, (_, i) => i + 1);
  off = (p: number) => p < 1 || p > this.pages() || p === this.page;
  readonly arrows = [
    { d: 'm11 17-5-5 5-5M18 17l-5-5 5-5', label: 'First page', to: () => 1 },
    { d: 'm15 18-6-6 6-6', label: 'Previous page', to: () => this.page - 1 },
    { d: 'm9 18 6-6-6-6', label: 'Next page', to: () => this.page + 1 },
    { d: 'm13 17 5-5-5-5M6 17l5-5-5-5', label: 'Last page', to: () => this.pages() },
  ];
}

export const field = 'h-9 w-full rounded border border-slate/40 bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20';
export const big = '[&_select]:h-9 [&_select]:text-sm';
const COLS = ['Name', 'Account Number', 'Country', 'Incorporation Date', 'Way Type', 'Way Side', 'Status', ''];

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, ExportButtonComponent, SelectComponent, StatusBadgeComponent, PagerComponent],
  template: `
    <app-page-header [title]="title"><app-export-button [onExport]="exportCsv" /></app-page-header>

    <section [class]="panel">
      <div class="grid gap-4 border-b border-slate/20 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-slate">{{ searchLabel }}
          <input [class]="field" [value]="name" (input)="name = $any($event.target).value; filtersChanged()" [placeholder]="'Search by ' + searchLabel.toLowerCase()" />
        </label>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Status
          <app-select [class]="big" label="Status" [value]="status" (valueChange)="status = $event; filtersChanged()" [options]="statusOpts" />
        </div>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Way Type
          <app-select [class]="big" label="Way Type" [value]="wayType" (valueChange)="wayType = $event; filtersChanged()" [options]="wayTypeOpts" />
        </div>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Way Side
          <app-select [class]="big" label="Way Side" [value]="waySide" (valueChange)="waySide = $event; filtersChanged()" [options]="waySideOpts" />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[960px] text-[13px]">
          <thead>
            <tr class="text-left text-xs text-slate">
              @for (c of cols; track $index) {
                <th class="whitespace-nowrap px-3 py-3 font-medium first:w-1/4 first:pl-5 last:pr-5">{{ c }}</th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-slate/15 border-t border-slate/15">
            @if (!data) {
              @for (i of skeleton; track i) {
                <tr>@for (c of cols; track $index) { <td class="px-3 py-3.5"><div class="h-4 w-full max-w-28 animate-pulse rounded bg-mist"></div></td> }</tr>
              }
            } @else if (data.items.length === 0) {
              <tr><td [attr.colspan]="cols.length" class="px-5 py-12 text-center text-sm text-slate">No records found</td></tr>
            } @else {
              @for (c of data.items; track c.id) {
                <tr class="text-night hover:bg-mist/60">
                  <td class="min-w-40 py-3 pl-5 pr-3 font-medium">{{ c.name }}</td>
                  <td class="whitespace-nowrap px-3 py-3 tabular-nums text-night/80">{{ c.accountNumber }}</td>
                  <td class="min-w-28 px-3 py-3">{{ c.country }}</td>
                  <td class="whitespace-nowrap px-3 py-3">{{ fmtDate(c.incorporationDate) }}</td>
                  <td class="whitespace-nowrap px-3 py-3">{{ c.wayType }}</td>
                  <td class="whitespace-nowrap px-3 py-3">{{ c.waySide }}</td>
                  <td class="px-5 py-3"><app-status-badge [status]="c.status" /></td>
                  <td class="px-3 py-3 pr-5 text-right">
                    <a [routerLink]="'/bd/web/financialinstitute/viewclientprofile/' + c.id" [attr.aria-label]="'View ' + c.name" title="View" class="inline-grid size-8 place-items-center rounded-md text-navy hover:bg-mist">
                      <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                    </a>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate/20 px-5 py-3">
        <p class="text-xs text-slate">
          @if (data) {
            Showing <span class="font-medium text-night">{{ from() }}–{{ to() }}</span> of <span class="font-medium text-night">{{ data.total }}</span> records
          } @else { Loading… }
        </p>
        @if (data && data.total > pageSize) {
          <app-pager [page]="page" [total]="data.total" (pageChange)="page = $event; load()" />
        }
      </div>
    </section>
  `,
})
export class ClientListComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) kind!: ClientKind;
  @Input({ required: true }) title!: string;
  @Input() searchLabel = 'Name';

  readonly panel = PANEL.replace('p-5', '');
  readonly field = field;
  readonly big = big;
  readonly cols = COLS;
  readonly skeleton = Array.from({ length: 8 }, (_, i) => i);
  readonly statusOpts = opts(STATUSES);
  readonly wayTypeOpts = opts(WAY_TYPES);
  readonly waySideOpts = opts(WAY_SIDES);
  readonly pageSize = PAGE_SIZE;
  readonly fmtDate = fmtDate;

  name = '';
  status: Status | '' = '';
  wayType: WayType | '' = '';
  waySide: WaySide | '' = '';
  page = 1;
  data: Page<Client> | null = null;
  private timer?: ReturnType<typeof setTimeout>;
  private req = 0;

  from = () => (this.data && this.data.total ? (this.page - 1) * PAGE_SIZE + 1 : 0);
  to = () => (this.data ? Math.min(this.page * PAGE_SIZE, this.data.total) : 0);

  ngOnChanges() { this.load(); }
  ngOnDestroy() { clearTimeout(this.timer); }

  // Any filter change goes back to page 1.
  filtersChanged() {
    this.page = 1;
    this.load();
  }

  load() {
    clearTimeout(this.timer);
    const n = ++this.req;
    this.timer = setTimeout(async () => { // debounce name typing
      this.data = null;
      const d = await listClients(this.kind, { name: this.name, status: this.status, wayType: this.wayType, waySide: this.waySide, page: this.page, pageSize: PAGE_SIZE });
      if (n === this.req) this.data = d;
    }, 250);
  }

  exportCsv = async () => downloadCsv(`${this.kind}-clients.csv`,
    ['Name', 'Account Number', 'Country', 'Incorporation Date', 'Way Type', 'Way Side', 'Status'],
    (await exportClients(this.kind, { name: this.name, status: this.status, wayType: this.wayType, waySide: this.waySide }))
      .map((c) => [c.name, c.accountNumber, c.country, c.incorporationDate, c.wayType, c.waySide, c.status]));
}
