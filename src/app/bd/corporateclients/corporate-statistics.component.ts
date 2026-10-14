import { Component, OnInit } from '@angular/core';
import * as api from '../../api/corporate-statistics';
import { DateRangeFilterComponent, Latest, PageHeaderComponent, PANEL, TableCardComponent, todayRange, type Cell, type DateRange } from '../../shared/ui';

@Component({
  selector: 'app-corporate-statistics',
  standalone: true,
  imports: [PageHeaderComponent, DateRangeFilterComponent, TableCardComponent],
  template: `
    <app-page-header title="Corporate Statistics"><app-date-range-filter [value]="range" (apply)="range = $event; load()" /></app-page-header>
    <div [class]="panel + ' grid gap-5 lg:grid-cols-2'">
      <app-table-card title="Top Clients By Total Profit" [rows]="profit.value"
        [columns]="[{ label: 'Client Name' }, { label: 'Balance', numeric: true }]" />
      <app-table-card title="Top Clients By Commercial Payments" [rows]="payments.value"
        [columns]="[{ label: 'Client Name' }, { label: 'No. of Payments', numeric: true }]" />
      <app-table-card title="Top Clients By Queries" [rows]="queries.value"
        [columns]="[{ label: 'Client Name' }, { label: 'No. of Queries', numeric: true }]" />
      <app-table-card title="Active / Inactive Clients" [rows]="active.value"
        [columns]="[{ label: 'Active Clients' }, { label: 'Inactive Clients' }]" />
      <app-table-card title="Clients Per Industry" [rows]="industry.value" [scroll]="true"
        [columns]="[{ label: 'Industry' }, { label: 'Count', numeric: true }]" />
      <app-table-card title="Clients Per Country" [rows]="country.value" [scroll]="true"
        [columns]="[{ label: 'Country' }, { label: 'Count', numeric: true }]" />
    </div>
  `,
})
export class CorporateStatisticsComponent implements OnInit {
  readonly panel = PANEL;
  range: DateRange = todayRange();
  profit = new Latest<Cell[][]>();
  payments = new Latest<Cell[][]>();
  queries = new Latest<Cell[][]>();
  active = new Latest<Cell[][]>();
  industry = new Latest<Cell[][]>();
  country = new Latest<Cell[][]>();

  ngOnInit() { this.load(); }

  load() {
    const r = this.range;
    this.profit.run(async () => (await api.getTopClientsByProfit(r)).map((x) => [x.client, x.balance]));
    this.payments.run(async () => (await api.getTopClientsByPayments(r)).map((x) => [x.client, x.payments]));
    this.queries.run(async () => (await api.getTopClientsByQueries(r)).map((x) => [x.client, x.queries]));
    this.active.run(async () => { const x = await api.getActiveInactive(r); return [[x.active, x.inactive]]; });
    this.industry.run(async () => (await api.getClientsPerIndustry(r)).map((x) => [x.industry, x.count]));
    this.country.run(async () => (await api.getClientsPerCountry(r)).map((x) => [x.country || 'Not specified', x.count]));
  }
}
