import { Component, OnInit } from '@angular/core';
import { exportTransactionReport, getTransactionReport, type TransactionRow } from '../../api/reports';
import { fmtDate, PAGE_SIZE, PagerComponent } from '../../shared/client-list.component';
import { DateRangeFilterComponent, downloadCsv, ExportButtonComponent, PageHeaderComponent, PANEL, todayRange, type DateRange } from '../../shared/ui';

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Col = { label: string; csv: string; cell: (r: TransactionRow) => string; raw: (r: TransactionRow) => string | number; numeric?: boolean; pl?: boolean };

// Order and CSV headers match the live report.
const COLS: Col[] = [
  { label: 'Client Name', csv: 'Client Name', cell: (r) => r.clientName, raw: (r) => r.clientName },
  { label: 'Remitter Country', csv: 'Remitter Country', cell: (r) => r.remitterCountry, raw: (r) => r.remitterCountry },
  { label: 'Bank Country', csv: 'Bank Country', cell: (r) => r.bankCountry, raw: (r) => r.bankCountry },
  { label: 'Type', csv: 'Type', cell: (r) => r.type, raw: (r) => r.type },
  { label: 'Bank Assigned', csv: 'Bank Assigned', cell: (r) => r.bankAssigned, raw: (r) => r.bankAssigned },
  { label: 'Ref No', csv: 'Ref No', cell: (r) => r.refNo, raw: (r) => r.refNo },
  { label: 'Approver Date', csv: 'Approver Date', cell: (r) => fmtDate(r.approverDate), raw: (r) => r.approverDate },
  { label: 'Pay In Amount', csv: 'Pay In Amount', cell: (r) => money(r.payInAmount), raw: (r) => r.payInAmount, numeric: true },
  { label: 'Currency', csv: 'Pay In Currency', cell: (r) => r.payInCurrency, raw: (r) => r.payInCurrency },
  { label: 'P/L', csv: 'PL', numeric: true, pl: true, raw: (r) => r.pl, cell: (r) => `${r.pl < 0 ? '−' : '+'}${money(Math.abs(r.pl))}` },
  { label: 'Main Client Name', csv: 'Main Client Name', cell: (r) => r.mainClientName, raw: (r) => r.mainClientName },
  { label: 'Beneficiary Name', csv: 'Beneficiary Name', cell: (r) => r.beneficiaryName, raw: (r) => r.beneficiaryName },
  { label: 'Beneficiary Country', csv: 'Beneficiary Country', cell: (r) => r.beneficiaryCountry, raw: (r) => r.beneficiaryCountry },
  { label: 'Payment Created', csv: 'Payment Created Date', cell: (r) => fmtDate(r.paymentCreatedDate), raw: (r) => r.paymentCreatedDate },
  { label: 'Bank Assigned At', csv: 'BankAssign DateTime', cell: (r) => fmtDateTime(r.bankAssignedAt), raw: (r) => r.bankAssignedAt },
  { label: 'Client Onboarded', csv: 'ClientOnBoardingDate', cell: (r) => fmtDate(r.clientOnboardingDate), raw: (r) => r.clientOnboardingDate },
];

const cellCls = 'whitespace-nowrap px-3 py-3';
const firstTh = ' sticky left-0 z-10 border-r border-slate/15 bg-white pl-5';
const firstTd = ' sticky left-0 border-r border-slate/15 bg-white pl-5 font-medium group-hover:bg-mist';

@Component({
  selector: 'app-transactionwise-report',
  standalone: true,
  imports: [PageHeaderComponent, DateRangeFilterComponent, ExportButtonComponent, PagerComponent],
  template: `
    <app-page-header title="Transactionwise Report">
      <app-date-range-filter [value]="range" (apply)="range = $event; page = 1; load()" />
      <app-export-button [onExport]="exportCsv" />
    </app-page-header>

    <section [class]="panel">
      <div class="overflow-x-auto">
        <table class="w-full text-[13px]">
          <thead>
            <tr class="text-left text-xs text-slate">
              @for (c of cols; track c.label; let i = $index) {
                <th [class]="cellCls + ' py-3 font-medium last:pr-5' + (c.numeric ? ' text-right' : '') + (i === 0 ? firstTh : '')">{{ c.label }}</th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-slate/15 border-t border-slate/15">
            @if (rows === null) {
              @for (i of skeleton; track i) {
                <tr>@for (c of cols; track c.label) { <td [class]="cellCls + ' first:pl-5'"><div class="h-4 w-20 animate-pulse rounded bg-mist"></div></td> }</tr>
              }
            } @else if (rows.length === 0) {
              <tr><td [attr.colspan]="cols.length" class="px-5 py-12 text-center text-sm text-slate">No records found</td></tr>
            } @else {
              @for (r of rows; track r.refNo) {
                <tr class="group text-night hover:bg-mist/60">
                  @for (c of cols; track c.label; let i = $index) {
                    <td [class]="cellCls + ' last:pr-5' + (c.numeric ? ' text-right tabular-nums' : '') + (i === 0 ? firstTd : '')">
                      @if (c.pl) {
                        <span [class]="r.pl < 0 ? 'text-red-600' : 'text-[#00857d]'">{{ c.cell(r) }}</span>
                      } @else { {{ c.cell(r) }} }
                    </td>
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
export class TransactionwiseReportComponent implements OnInit {
  readonly panel = PANEL.replace('p-5', '');
  readonly cols = COLS;
  readonly cellCls = cellCls;
  readonly firstTh = firstTh;
  readonly firstTd = firstTd;
  readonly pageSize = PAGE_SIZE;
  readonly skeleton = Array.from({ length: 8 }, (_, i) => i);

  range: DateRange = todayRange();
  page = 1;
  total = 0;
  rows: TransactionRow[] | null = null;
  private req = 0;

  from = () => (this.total ? (this.page - 1) * PAGE_SIZE + 1 : 0);
  to = () => Math.min(this.page * PAGE_SIZE, this.total);

  ngOnInit() { this.load(); }

  async load() {
    const n = ++this.req;
    this.rows = null;
    const res = await getTransactionReport(this.range, this.page, PAGE_SIZE);
    if (n !== this.req) return;
    this.total = res.total;
    this.rows = res.items;
  }

  exportCsv = async () => downloadCsv('transactionwise-report.csv', COLS.map((c) => c.csv),
    (await exportTransactionReport(this.range)).map((r) => COLS.map((c) => c.raw(r))));
}
