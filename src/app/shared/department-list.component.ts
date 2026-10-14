import { Component, Input, OnChanges, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { listDepartmentClients, type Department, type DepartmentClient } from '../api/clients';
import { StatusBadgeComponent } from './client-list.component';
import { downloadCsv, ExportButtonComponent, Latest, PageHeaderComponent, PANEL } from './ui';

const COLS = ['Client Name', 'Status', 'Account Type', 'Account Number'];

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, ExportButtonComponent, StatusBadgeComponent],
  template: `
    <app-page-header [title]="title"><app-export-button [onExport]="exportCsv" /></app-page-header>

    <section [class]="panel">
      <header class="flex min-h-14 items-center border-b border-slate/20 px-5 py-3">
        <h2 class="mr-auto text-[15px] font-semibold text-navy">Shipment List</h2>
        @if (rows.value) { <span class="text-xs text-slate">{{ rows.value.length }} clients</span> }
      </header>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr class="text-left text-xs text-slate">
              @for (c of cols; track c) { <th class="px-3 py-3 font-medium first:pl-5 last:pr-5">{{ c }}</th> }
              <th class="w-12 pr-5"><span class="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate/15 border-t border-slate/15">
            @if (rows.value === null) {
              @for (i of skeleton; track i) {
                <tr>@for (c of skeletonCols; track $index) { <td class="px-3 py-3.5 first:pl-5"><div class="h-4 w-full max-w-32 animate-pulse rounded bg-mist"></div></td> }</tr>
              }
            } @else if (rows.value.length === 0) {
              <tr><td [attr.colspan]="cols.length + 1" class="px-5 py-12 text-center text-sm text-slate">No records found</td></tr>
            } @else {
              @for (c of rows.value; track c.accountNumber) {
                <!-- Whole row opens the client's payment reports; the chevron link keeps it keyboard-accessible. -->
                <tr (click)="router.navigateByUrl(href(c.accountNumber))" class="cursor-pointer text-night hover:bg-mist/60">
                  <td class="py-3 pl-5 pr-3 font-medium">{{ c.name }}</td>
                  <td class="px-3 py-3"><app-status-badge [status]="c.status" /></td>
                  <td class="px-3 py-3">{{ c.accountType }}</td>
                  <td class="whitespace-nowrap px-3 py-3 tabular-nums text-night/80">{{ c.accountNumber }}</td>
                  <td class="py-3 pr-5 text-right">
                    <a [routerLink]="href(c.accountNumber)" (click)="$event.stopPropagation()" [attr.aria-label]="'Open payment reports for ' + c.name"
                      class="inline-grid size-8 place-items-center rounded text-slate hover:bg-mist hover:text-navy">
                      <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                    </a>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class DepartmentListComponent implements OnChanges {
  @Input({ required: true }) dept!: Department;
  @Input({ required: true }) title!: string;

  readonly router = inject(Router);
  readonly panel = PANEL.replace('p-5', '');
  readonly cols = COLS;
  readonly skeleton = Array.from({ length: 8 }, (_, i) => i);
  readonly skeletonCols = [...COLS, ''];
  rows = new Latest<DepartmentClient[]>();

  href = (account: string) => `/bd/web/cbdbddepartment/viewclientpaymentreports/${account}`;

  ngOnChanges() { this.rows.run(() => listDepartmentClients(this.dept)); }

  exportCsv = async () => downloadCsv(`${this.dept}-department.csv`, COLS,
    (await listDepartmentClients(this.dept)).map((c) => [c.name, c.status, c.accountType, c.accountNumber]));
}
