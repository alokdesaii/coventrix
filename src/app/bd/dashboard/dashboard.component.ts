import { Component, Input, OnChanges } from '@angular/core';
import { getWidget, type BankRow, type Granularity, type Period, type WidgetId } from '../../api/dashboard';
import { Latest, PANEL, SegmentedComponent, SelectComponent, TableCardComponent, type Cell, type Option } from '../../shared/ui';

type Control = 'period' | 'granularity' | 'period+granularity';
type WidgetDef = { id: WidgetId; title: string; column: string; control: Control };

const WIDGETS: WidgetDef[] = [
  { id: 'outgoing-payments', title: 'Top correspondent banks by no. of outgoing payments', column: 'No. of Payments', control: 'period' },
  { id: 'payments-volume', title: 'Top banks by payments volume', column: 'Volume', control: 'period' },
  { id: 'cost', title: 'Top correspondent banks by cost', column: 'Cost of Bank', control: 'period' },
  { id: 'payments-count', title: 'Top banks by no. of payments', column: 'No. of Payments', control: 'period' },
  { id: 'total-payments', title: 'Total no. of payments', column: 'No. of Payments', control: 'granularity' },
  { id: 'bank-cost', title: 'Bank Cost', column: 'Cost', control: 'period+granularity' },
];

const PERIODS: Option<Period>[] = [
  { value: '30d', label: 'Last 30 days' },
  { value: '60d', label: 'Last 60 days' },
  { value: '90d', label: 'Last 90 days' },
];

const GRANULARITY: Option<Granularity>[] = [
  { value: 'month', label: 'Month' },
  { value: 'day', label: 'Day' },
];

@Component({
  selector: 'app-dashboard-widget',
  standalone: true,
  imports: [TableCardComponent, SegmentedComponent, SelectComponent],
  template: `
    <app-table-card [title]="w.title" [columns]="[{ label: 'Bank Name' }, { label: w.column, numeric: true }]" [rows]="rows.value">
      @if (hasGran) {
        <app-segmented label="Granularity" [value]="granularity" (valueChange)="granularity = $event; load()" [options]="granularities" />
      }
      @if (hasPeriod) {
        <app-select label="Period" [value]="period" (valueChange)="period = $event; load()" [options]="periods" />
      }
    </app-table-card>
  `,
})
export class DashboardWidgetComponent implements OnChanges {
  @Input({ required: true }) w!: WidgetDef;
  readonly periods = PERIODS;
  readonly granularities = GRANULARITY;
  period: Period = '30d';
  granularity: Granularity = 'month';
  rows = new Latest<Cell[][]>();

  get hasPeriod() { return this.w.control !== 'granularity'; }
  get hasGran() { return this.w.control !== 'period'; }

  ngOnChanges() { this.load(); }

  load() {
    this.rows.run(async () => {
      const rows: BankRow[] = await getWidget(this.w.id, {
        period: this.hasPeriod ? this.period : undefined,
        granularity: this.hasGran ? this.granularity : undefined,
      });
      return rows.map((r) => [r.bank, r.value]);
    });
  }
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DashboardWidgetComponent],
  template: `
    <h1 class="mb-5 text-xl font-semibold text-navy">Dashboard</h1>
    <div [class]="panel + ' grid gap-5 lg:grid-cols-2'">
      @for (w of widgets; track w.id) { <app-dashboard-widget [w]="w" /> }
    </div>
  `,
})
export class DashboardComponent {
  readonly widgets = WIDGETS;
  readonly panel = PANEL;
}
