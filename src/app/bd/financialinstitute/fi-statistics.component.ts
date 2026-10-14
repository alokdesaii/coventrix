import { Component, Input, OnChanges, OnInit } from '@angular/core';
import * as api from '../../api/fi-statistics';
import type { Currency, DateRange, Granularity } from '../../api/fi-statistics';
import {
  DateRangeFilterComponent, Latest, PageHeaderComponent, PANEL, SegmentedComponent, SelectComponent,
  TableCardComponent, todayRange, type Cell, type Column, type Option,
} from '../../shared/ui';

const CURRENCIES: Option<Currency>[] = [
  { value: 'USD', label: 'USD' },
  { value: 'HKD', label: 'HKD' },
];
const GRANULARITY: Option<Granularity>[] = [
  { value: 'month', label: 'Month' },
  { value: 'day', label: 'Day' },
];

@Component({
  selector: 'app-currency-card',
  standalone: true,
  imports: [TableCardComponent, SelectComponent],
  template: `
    <app-table-card [title]="title" [columns]="columns" [rows]="rows.value">
      <app-select label="Currency" [value]="currency" (valueChange)="currency = $event; ngOnChanges()" [options]="currencies" />
    </app-table-card>
  `,
})
export class CurrencyCardComponent implements OnChanges {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) columns!: Column[];
  @Input({ required: true }) range!: DateRange;
  @Input({ required: true }) load!: (r: DateRange, c: Currency) => Promise<Cell[][]>;
  @Input() currencies = CURRENCIES;
  currency: Currency = 'USD';
  rows = new Latest<Cell[][]>();
  ngOnChanges() { this.rows.run(() => this.load(this.range, this.currency)); }
}

@Component({
  selector: 'app-total-payments-card',
  standalone: true,
  imports: [TableCardComponent, SegmentedComponent],
  template: `
    <app-table-card title="Total no. of payments" [rows]="rows.value"
      [columns]="[{ label: g === 'month' ? 'Month' : 'Day' }, { label: 'Payments', numeric: true }]">
      <app-segmented label="Granularity" [value]="g" (valueChange)="g = $event; ngOnChanges()" [options]="granularity" />
    </app-table-card>
  `,
})
export class TotalPaymentsCardComponent implements OnChanges {
  @Input({ required: true }) range!: DateRange;
  readonly granularity = GRANULARITY;
  g: Granularity = 'month';
  rows = new Latest<Cell[][]>();
  ngOnChanges() {
    this.rows.run(async () => (await api.getPaymentsByDate(this.range, this.g)).map((r) => [r.period, r.payments]));
  }
}

@Component({
  selector: 'app-bank-cost-card',
  standalone: true,
  imports: [TableCardComponent, SegmentedComponent, SelectComponent],
  template: `
    <app-table-card title="Bank Cost" [rows]="rows.value" [empty]="bank ? 'No data found' : 'Select a bank to view costs'"
      [columns]="[{ label: g === 'month' ? 'Month' : 'Day' }, { label: 'Amount', numeric: true }]">
      <app-select class="w-44" label="Bank" [value]="bank" (valueChange)="bank = $event; ngOnChanges()" [options]="banks" />
      <app-segmented label="Granularity" [value]="g" (valueChange)="g = $event; ngOnChanges()" [options]="granularity" />
    </app-table-card>
  `,
})
export class BankCostCardComponent implements OnInit, OnChanges {
  @Input({ required: true }) range!: DateRange;
  readonly granularity = GRANULARITY;
  g: Granularity = 'month';
  bank = '';
  banks: Option[] = [{ value: '', label: 'Select bank' }];
  rows = new Latest<Cell[][]>();
  async ngOnInit() {
    const b = await api.getBankList();
    this.banks = [{ value: '', label: 'Select bank' }, ...b.map((x) => ({ value: x.id, label: x.name }))];
  }
  ngOnChanges() {
    this.rows.run(async () => (await api.getBankCosts(this.range, this.g, this.bank)).map((r) => [r.period, r.amount]));
  }
}

@Component({
  selector: 'app-fi-statistics',
  standalone: true,
  imports: [PageHeaderComponent, DateRangeFilterComponent, CurrencyCardComponent, TotalPaymentsCardComponent, BankCostCardComponent],
  template: `
    <app-page-header title="FI Statistics"><app-date-range-filter [value]="range" (apply)="range = $event" /></app-page-header>

    <div [class]="panel + ' grid gap-5 lg:grid-cols-2'">
      <app-currency-card title="Top correspondent banks by no. of outgoing payments" [range]="range"
        [columns]="[{ label: 'Bank Name' }, { label: 'No. of Payments', numeric: true }]" [load]="byCount" />
      <app-currency-card title="Top banks by payments volume" [range]="range"
        [columns]="[{ label: 'Bank Name' }, { label: 'Volume', numeric: true }, { label: 'No. of Payments', numeric: true }]" [load]="byVolume" />
      <app-currency-card title="Top correspondent banks by cost" [range]="range"
        [columns]="[{ label: 'Bank Name' }, { label: 'Cost of Bank', numeric: true }, { label: 'Volume', numeric: true }]" [load]="byCost" />
      <app-currency-card title="Bank Queries" [range]="range" [currencies]="usdOnly"
        [columns]="[{ label: 'Bank Name' }, { label: 'No. of Payments', numeric: true }]" [load]="queries" />
      <app-total-payments-card [range]="range" />
      <app-bank-cost-card [range]="range" />
    </div>
  `,
})
export class FiStatisticsComponent {
  readonly panel = PANEL;
  readonly usdOnly = CURRENCIES.slice(0, 1);
  range: DateRange = todayRange();

  byCount = async (r: DateRange, c: Currency): Promise<Cell[][]> => (await api.getTopBanksByPaymentCount(r, c)).map((x) => [x.bank, x.payments]);
  byVolume = async (r: DateRange, c: Currency): Promise<Cell[][]> => (await api.getTopBanksByVolume(r, c)).map((x) => [x.bank, x.volume, x.payments]);
  byCost = async (r: DateRange, c: Currency): Promise<Cell[][]> => (await api.getTopBanksByCost(r, c)).map((x) => [x.bank, x.cost, x.volume]);
  queries = async (r: DateRange, c: Currency): Promise<Cell[][]> => (await api.getBankQueries(r, c)).map((x) => [x.bank, x.payments]);
}
