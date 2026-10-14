import { Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { LEAD_OUTCOMES, listLeads, STATUSES, updateLeadStatus, type Lead, type LeadKind, type LeadOutcome, type Page, type Status } from '../api/clients';
import { big, field, fmtDate, PAGE_SIZE, PagerComponent, StatusBadgeComponent } from './client-list.component';
import { PANEL, SelectComponent } from './ui';

const COLS = ['Name', 'Account Number', 'Country', 'Incorporation Date', 'Created By', 'Status', ''];

@Component({
  selector: 'app-lead-status-list',
  standalone: true,
  imports: [SelectComponent, StatusBadgeComponent, PagerComponent],
  template: `
    <h1 class="mb-5 text-xl font-semibold text-navy">{{ title }}</h1>

    <section [class]="panel">
      <div class="grid gap-4 border-b border-slate/20 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <label class="flex flex-col gap-1.5 text-xs font-medium text-slate">A/C or Name
          <input [class]="field" [value]="name" (input)="name = $any($event.target).value; filtersChanged()" placeholder="Search by a/c or name" />
        </label>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Status
          <app-select [class]="big" label="Status" [value]="status" (valueChange)="status = $event; filtersChanged()" [options]="statusOpts" />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-[13px]">
          <thead>
            <tr class="text-left text-xs text-slate">
              @for (c of cols; track $index) { <th class="whitespace-nowrap px-3 py-3 font-medium first:w-1/4 first:pl-5 last:pr-5">{{ c }}</th> }
            </tr>
          </thead>
          <tbody class="divide-y divide-slate/15 border-t border-slate/15">
            @if (!data) {
              @for (i of skeleton; track i) {
                <tr>@for (c of cols; track $index) { <td class="px-3 py-3.5 first:pl-5"><div class="h-4 w-full max-w-28 animate-pulse rounded bg-mist"></div></td> }</tr>
              }
            } @else if (data.items.length === 0) {
              <tr><td [attr.colspan]="cols.length" class="px-5 py-12 text-center text-sm text-slate">No records found</td></tr>
            } @else {
              @for (l of data.items; track l.id) {
                <tr class="text-night hover:bg-mist/60">
                  <td class="min-w-40 py-3 pl-5 pr-3 font-medium">{{ l.name }}</td>
                  <td class="whitespace-nowrap px-3 py-3 tabular-nums text-night/80">{{ l.accountNumber }}</td>
                  <td class="min-w-28 px-3 py-3">{{ l.country }}</td>
                  <td class="whitespace-nowrap px-3 py-3">{{ fmtDate(l.incorporationDate) }}</td>
                  <td class="whitespace-nowrap px-3 py-3">{{ l.createdBy }}</td>
                  <td class="px-3 py-3"><app-status-badge [status]="l.status" /></td>
                  <td class="py-3 pl-3 pr-5 text-right">
                    @if (l.status === 'Open Lead') {
                      <button type="button" (click)="edit(l)" class="h-8 whitespace-nowrap rounded-md px-3 text-xs font-semibold text-navy hover:bg-mist">Update</button>
                    } @else { <span class="sr-only">No action</span> }
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
        @if (data && data.total > pageSize) { <app-pager [page]="page" [total]="data.total" (pageChange)="page = $event; load()" /> }
      </div>
    </section>

    <dialog #dialog (close)="editing = null" (click)="$event.target === dialog ? dialog.close() : null"
      class="m-auto w-[min(28rem,calc(100%-2rem))] rounded-md bg-white p-0 backdrop:bg-night/50">
      <form class="flex flex-col gap-5 p-6" (submit)="save($event)">
        <header class="flex items-start gap-3">
          <div class="mr-auto">
            <h2 class="text-lg font-semibold text-navy">Update Status</h2>
            <p class="mt-1 text-sm text-slate">{{ editing?.name }}</p>
          </div>
          <button type="button" (click)="dialog.close()" aria-label="Close"
            class="grid size-8 place-items-center rounded-md bg-mist text-navy transition hover:bg-slate/20">
            <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Status
          <app-select [class]="big" label="Status" [value]="outcome" (valueChange)="outcome = $event" [options]="outcomeOpts" />
        </div>
        @if (error) { <p role="alert" class="text-sm text-red-600">{{ error }}</p> }
        <div class="flex justify-end gap-3">
          <button type="button" (click)="dialog.close()" class="h-10 rounded border border-slate/40 px-5 text-sm font-medium text-navy hover:bg-mist">Cancel</button>
          <button [disabled]="saving" class="h-10 rounded bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50">
            {{ saving ? 'Updating…' : 'Update Status' }}
          </button>
        </div>
      </form>
    </dialog>
  `,
})
export class LeadStatusListComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) kind!: LeadKind;
  @Input({ required: true }) title!: string;
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;

  readonly panel = PANEL.replace('p-5', '');
  readonly field = field;
  readonly big = big;
  readonly cols = COLS;
  readonly skeleton = Array.from({ length: 6 }, (_, i) => i);
  readonly statusOpts = [{ value: '', label: 'All' }, ...STATUSES.map((s) => ({ value: s, label: s }))];
  readonly outcomeOpts = LEAD_OUTCOMES.map((s) => ({ value: s, label: s }));
  readonly pageSize = PAGE_SIZE;
  readonly fmtDate = fmtDate;

  name = '';
  status: Status | '' = '';
  page = 1;
  data: Page<Lead> | null = null;
  editing: Lead | null = null;
  outcome: LeadOutcome = 'Converted';
  saving = false;
  error = '';
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
    this.timer = setTimeout(async () => {
      this.data = null;
      const d = await listLeads(this.kind, { name: this.name, status: this.status, page: this.page, pageSize: PAGE_SIZE });
      if (n === this.req) this.data = d;
    }, 250);
  }

  // Each open starts with a fresh form.
  edit(l: Lead) {
    this.editing = l;
    this.outcome = 'Converted';
    this.error = '';
    this.dialog.nativeElement.showModal();
  }

  async save(e: Event) {
    e.preventDefault();
    if (!this.editing) return;
    this.saving = true;
    try {
      await updateLeadStatus(this.kind, this.editing.id, this.outcome);
      this.dialog.nativeElement.close();
      this.load();
    } catch {
      this.error = 'Could not update the status. Please try again.';
    } finally {
      this.saving = false;
    }
  }
}
