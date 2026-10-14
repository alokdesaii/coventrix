import { Component, Input, OnChanges } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getClientPaymentReport, PAYMENT_TYPES, type PaymentType } from '../../api/clients';
import { DateRangeFilterComponent, Latest, PageHeaderComponent, PANEL, TableCardComponent, TabsComponent, todayRange, type Cell, type DateRange } from '../../shared/ui';

const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const LIST = '/bd/web/cbdbddepartment/cbddepartment';

type View = { name: string; monthly: Cell[][]; byCountry: Cell[][]; byCurrency: Cell[][] };

@Component({
  selector: 'app-client-payment-reports',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, DateRangeFilterComponent, TabsComponent, TableCardComponent],
  template: `
    <app-page-header title="Client Payment Reports">
      <app-date-range-filter [value]="range" (apply)="range = $event; ngOnChanges()" />
      <a [routerLink]="list" (click)="back($event)"
        class="flex h-9 items-center gap-1.5 rounded border border-slate/40 bg-white px-3.5 text-sm font-medium text-navy transition hover:bg-mist">
        <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        Back
      </a>
    </app-page-header>

    <div [class]="panel">
      <app-tabs label="Payment type" [tabs]="types" [value]="type" (valueChange)="type = $event; ngOnChanges()" />

      <div class="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p class="text-base font-semibold text-night">{{ r.value ? r.value.name : '\u00a0' }}</p>
        <p class="text-sm tabular-nums text-slate">{{ decoded() }}</p>
      </div>

      <div class="grid gap-5 lg:grid-cols-2">
        <app-table-card title="Payment By Monthly" [rows]="r.value?.monthly ?? null"
          [columns]="[{ label: 'Report Name' }, { label: 'Payment Amount', numeric: true }]" />
        <app-table-card title="Payment By Country" [rows]="r.value?.byCountry ?? null"
          [columns]="[{ label: 'Country' }, { label: 'Report Name' }, { label: 'Payment Amount', numeric: true }]" />
        <app-table-card title="Payment By Currency" [rows]="r.value?.byCurrency ?? null"
          [columns]="[{ label: 'Currency' }, { label: 'Report Name' }, { label: 'Payment Amount', numeric: true }]" />
      </div>
    </div>
  `,
})
export class ClientPaymentReportsComponent implements OnChanges {
  @Input() account = ''; // bound from the :account route param

  readonly panel = PANEL;
  readonly list = LIST;
  readonly types = PAYMENT_TYPES;
  range: DateRange = todayRange();
  type: PaymentType = 'Incoming';
  r = new Latest<View>();

  decoded = () => decodeURIComponent(this.account);

  ngOnChanges() {
    const account = this.decoded();
    this.r.run(async () => {
      const x = await getClientPaymentReport(account, this.type, this.range);
      return {
        name: x.client?.name ?? 'Unknown client',
        monthly: x.monthly.map((m) => [m.report, money(m.amount)]),
        byCountry: x.byCountry.map((m) => [m.country, m.report, money(m.amount)]),
        byCurrency: x.byCurrency.map((m) => [m.currency, m.report, money(m.amount)]),
      };
    });
  }

  back(e: MouseEvent) {
    if (history.length > 1) {
      e.preventDefault();
      history.back();
    }
  }
}
