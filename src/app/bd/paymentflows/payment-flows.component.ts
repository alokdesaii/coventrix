import { Component, OnInit } from '@angular/core';
import { getPaymentCountByCountry, getPaymentsHkToFranceAndUs, type CountryCount, type FlowCurrency, type FlowParty } from '../../api/payment-flows';
import { big } from '../../shared/client-list.component';
import { PaymentMapComponent } from '../../shared/payment-map.component';
import { DateRangeFilterComponent, Latest, PageHeaderComponent, PANEL, SelectComponent, TableCardComponent, todayRange, type Cell, type DateRange } from '../../shared/ui';

@Component({
  selector: 'app-payment-flows',
  standalone: true,
  imports: [PageHeaderComponent, DateRangeFilterComponent, SelectComponent, TableCardComponent, PaymentMapComponent],
  template: `
    <app-page-header title="Payment Flows"><app-date-range-filter [value]="range" (apply)="range = $event; load()" /></app-page-header>

    <div [class]="panel + ' flex flex-col gap-5'">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Currency
          <app-select [class]="big" label="Currency" [value]="currency" (valueChange)="currency = $event; load()" [options]="currencies" />
        </div>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Client
          <app-select [class]="big" label="Client" [value]="party" (valueChange)="party = $event; load()" [options]="parties" />
        </div>
      </div>

      <section class="rounded-md border border-slate/25">
        <header class="flex min-h-14 items-center border-b border-slate/20 px-5 py-3">
          <h2 class="text-[15px] font-semibold text-navy">Payments on Map</h2>
        </header>
        <div class="p-5">
          @if (byCountry.value) { <app-payment-map [data]="byCountry.value" /> } @else { <div class="aspect-[96/47] w-full animate-pulse rounded bg-mist"></div> }
        </div>
      </section>

      <div class="grid gap-5 lg:grid-cols-2">
        <app-table-card title="Payments From Hong Kong to France and US" [rows]="hkFrUs.value"
          [columns]="[{ label: 'Region Code' }, { label: 'Region Name' }, { label: 'Country' }, { label: 'Count', numeric: true }]" />
        <app-table-card title="Payments Count By Region Country" [scroll]="true" [rows]="byCountryRows()"
          [columns]="[{ label: 'Region Name' }, { label: 'Country Name' }, { label: 'Count', numeric: true }]" />
      </div>
    </div>
  `,
})
export class PaymentFlowsComponent implements OnInit {
  readonly panel = PANEL;
  readonly big = big;
  readonly currencies = [{ value: '', label: 'All currencies' }, { value: 'USD', label: 'USD' }, { value: 'HKD', label: 'HKD' }];
  readonly parties = [{ value: '', label: 'All' }, ...['Client', 'Beneficiary', 'Correspondent Bank'].map((v) => ({ value: v, label: v }))];

  range: DateRange = todayRange();
  currency: FlowCurrency = '';
  party: FlowParty = '';
  byCountry = new Latest<CountryCount[]>();
  hkFrUs = new Latest<Cell[][]>();

  byCountryRows = (): Cell[][] | null => this.byCountry.value?.map((r) => [r.region, r.country, r.count]) ?? null;

  ngOnInit() { this.load(); }

  load() {
    const q = { range: this.range, currency: this.currency, party: this.party };
    this.byCountry.run(() => getPaymentCountByCountry(q));
    this.hkFrUs.run(async () => (await getPaymentsHkToFranceAndUs(q)).map((r) => [r.regionCode, r.region, r.country, r.count]));
  }
}
