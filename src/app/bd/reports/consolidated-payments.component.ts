import { Component, OnInit } from '@angular/core';
import { exportConsolidatedPayments, getConsolidatedPayments, type ConsolidatedPaymentRow } from '../../api/reports';
import { fmtDate, PAGE_SIZE, PagerComponent } from '../../shared/client-list.component';
import { DateRangeFilterComponent, downloadCsv, ExportButtonComponent, PageHeaderComponent, PANEL, todayRange, type DateRange } from '../../shared/ui';

const GROUPS = ['Outward Payments', 'Inward Payments', 'Book Transfers'];
const CSV_HEAD = ['Client Name', 'Client Type', 'Client ID', 'Date Boarded', 'Total No. of Outward Payment', 'Total Volume Of OP',
  'Total No Of Inward Payment', 'Total Volume Of IP', 'Total Number Of Book Transfer', 'Total Volume Of BT'];

const nums = (r: ConsolidatedPaymentRow) =>
  [r.outwardCount, r.outwardVolume, r.inwardCount, r.inwardVolume, r.bookTransferCount, r.bookTransferVolume];

const th = 'whitespace-nowrap px-3 py-2.5 font-medium';
const td = 'whitespace-nowrap px-3 py-3';

@Component({
  selector: 'app-consolidated-payments',
  standalone: true,
  imports: [PageHeaderComponent, DateRangeFilterComponent, ExportButtonComponent, PagerComponent],
  template: `
    <app-page-header title="Consolidated Payments">
      <app-date-range-filter [value]="range" (apply)="range = $event; page = 1; load()" />
      <app-export-button [onExport]="exportCsv" />
    </app-page-header>

    <section [class]="panel">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1100px] text-[13px]">
          <thead class="text-xs text-slate">
            <tr class="text-left">
              <th rowspan="2" [class]="th + ' sticky left-0 z-10 bg-white pl-5'">Client Name</th>
              <th rowspan="2" [class]="th">Client Type</th>
              <th rowspan="2" [class]="th">Client ID</th>
              <th rowspan="2" [class]="th">Date Boarded</th>
              @for (g of groups; track g) {
                <th colspan="2" [class]="th + ' border-b border-l border-slate/15 text-center text-navy'">{{ g }}</th>
              }
            </tr>
            <tr class="text-right">
              @for (g of groups; track g) {
                <th [class]="th + ' border-l border-slate/15'">No.</th>
                <th [class]="th + ' last:pr-5'">Volume</th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-slate/15 border-t border-slate/15">
            @if (rows === null) {
              @for (i of skeleton; track i) {
                <tr>@for (j of cols; track j) { <td [class]="td + ' first:pl-5'"><div class="h-4 w-16 animate-pulse rounded bg-mist"></div></td> }</tr>
              }
            } @else if (rows.length === 0) {
              <tr><td colspan="10" class="px-5 py-12 text-center text-sm text-slate">No records found</td></tr>
            } @else {
              @for (r of rows; track r.clientId) {
                <tr class="group text-night hover:bg-mist/60">
                  <td [class]="td + ' sticky left-0 bg-white pl-5 font-medium group-hover:bg-mist'">{{ r.clientName }}</td>
                  <td [class]="td">{{ r.clientType }}</td>
                  <td [class]="td + ' tabular-nums'">{{ r.clientId }}</td>
                  <td [class]="td">{{ fmtDate(r.dateBoarded) }}</td>
                  @for (n of nums(r); track i; let i = $index) {
                    <td [class]="td + ' text-right tabular-nums last:pr-5' + (i % 2 === 0 ? ' border-l border-slate/15' : '')">{{ n.toLocaleString() }}</td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate/20 px-5 py-3">
        <p class="text-xs text-slate">
          @if (rows) {
            Showing <span class="font-medium text-night">{{ from() }}–{{ to() }}</span> of <span class="font-medium text-night">{{ total }}</span> records
          } @else { Loading… }
        </p>
        @if (total > pageSize) { <app-pager [page]="page" [total]="total" (pageChange)="page = $event; load()" /> }
      </div>
    </section>
  `,
})
export class ConsolidatedPaymentsComponent implements OnInit {
  readonly panel = PANEL.replace('p-5', '');
  readonly groups = GROUPS;
  readonly th = th;
  readonly td = td;
  readonly nums = nums;
  readonly fmtDate = fmtDate;
  readonly pageSize = PAGE_SIZE;
  readonly skeleton = Array.from({ length: 8 }, (_, i) => i);
  readonly cols = Array.from({ length: 10 }, (_, i) => i);

  range: DateRange = todayRange();
  page = 1;
  total = 0;
  rows: ConsolidatedPaymentRow[] | null = null;
  private req = 0;

  from = () => (this.total ? (this.page - 1) * PAGE_SIZE + 1 : 0);
  to = () => Math.min(this.page * PAGE_SIZE, this.total);

  ngOnInit() { this.load(); }

  async load() {
    const n = ++this.req;
    this.rows = null;
    const res = await getConsolidatedPayments(this.range, this.page, PAGE_SIZE);
    if (n !== this.req) return;
    this.total = res.total;
    this.rows = res.items;
  }

  exportCsv = async () => downloadCsv('consolidated-payments.csv', CSV_HEAD,
    (await exportConsolidatedPayments(this.range)).map((r) => [r.clientName, r.clientType, r.clientId, r.dateBoarded, ...nums(r)]));
}
