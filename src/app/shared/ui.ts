import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';

// Shared UI primitives for portal screens.

// Main white container that holds a page's blocks (title sits above it on the page background).
export const PANEL = 'rounded-md border border-slate/20 bg-white p-5';

export type Option<T extends string = string> = { value: T; label: string };

@Component({
  selector: 'app-select',
  standalone: true,
  host: { class: 'relative block shrink-0' },
  template: `
    <select #sel [value]="value" (change)="changed(sel)" [attr.aria-label]="label"
      [attr.aria-invalid]="invalid || null" [disabled]="disabled"
      class="h-8 w-full appearance-none truncate rounded border bg-white pr-8 pl-3 text-xs font-medium text-night outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-mist disabled:text-slate"
      [class]="invalid ? 'border-red-400' : 'border-slate/40'">
      @for (o of options; track o.value) {
        <option [value]="o.value" [selected]="o.value === value">{{ o.label }}</option>
      }
    </select>
    <svg viewBox="0 0 24 24" class="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-slate" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  `,
})
export class SelectComponent {
  @Input({ required: true }) value!: string;
  @Output() valueChange = new EventEmitter<any>();
  @Input({ required: true }) options!: Option[];
  @Input({ required: true }) label!: string;
  @Input() invalid = false;
  @Input() disabled = false;

  // Controlled: if the parent rejects the change (keeps `value`), snap the box back after change detection.
  changed(sel: HTMLSelectElement) {
    this.valueChange.emit(sel.value);
    setTimeout(() => { sel.value = this.value; });
  }
}

@Component({
  selector: 'app-segmented',
  standalone: true,
  host: { role: 'radiogroup', '[attr.aria-label]': 'label', class: 'flex shrink-0 rounded bg-mist p-0.5 text-xs font-medium' },
  template: `
    @for (o of options; track o.value) {
      <button type="button" role="radio" [attr.aria-checked]="value === o.value" (click)="valueChange.emit(o.value)"
        class="h-7 rounded-md px-3 transition"
        [class]="value === o.value ? 'bg-white text-navy shadow-sm' : 'text-slate hover:text-navy'">{{ o.label }}</button>
    }
  `,
})
export class SegmentedComponent {
  @Input({ required: true }) value!: string;
  @Output() valueChange = new EventEmitter<any>();
  @Input({ required: true }) options!: Option[];
  @Input({ required: true }) label!: string;
}

export type Column = { label: string; numeric?: boolean };
export type Cell = string | number;

// Card with a title, header controls (projected) and a simple table. rows=null shows a loading skeleton.
@Component({
  selector: 'app-table-card',
  standalone: true,
  host: { class: 'flex flex-col rounded-md border border-slate/25 bg-white' },
  template: `
    <header class="flex min-h-16 flex-wrap items-center gap-3 border-b border-slate/20 px-5 py-3">
      <h2 class="min-w-40 flex-1 text-[15px] font-semibold text-navy">{{ title }}</h2>
      <ng-content />
    </header>
    <div [class]="scroll ? 'max-h-[26rem] overflow-y-auto' : ''">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-white">
          <tr class="text-xs text-slate">
            @for (c of columns; track c.label) {
              <th class="px-5 py-2.5 font-medium" [class]="c.numeric ? 'text-right' : 'text-left'">{{ c.label }}</th>
            }
          </tr>
        </thead>
        <tbody class="divide-y divide-slate/15 border-t border-slate/15">
          @if (rows === null) {
            @for (i of [0, 1, 2]; track i) {
              <tr>
                @for (c of columns; track c.label) {
                  <td class="px-5 py-3"><div class="h-4 animate-pulse rounded bg-mist" [class]="c.numeric ? 'ml-auto w-10' : 'w-20'"></div></td>
                }
              </tr>
            }
          } @else if (rows.length === 0) {
            <tr><td [attr.colspan]="columns.length" class="px-5 py-8 text-center text-xs text-slate">{{ empty }}</td></tr>
          } @else {
            @for (r of rows; track $index) {
              <tr class="hover:bg-mist/60">
                @for (v of r; track j; let j = $index) {
                  <td class="px-5 py-3 text-night"
                    [class]="(columns[j].numeric ? 'text-right tabular-nums' : 'text-left') + (j === 0 && !columns[j].numeric ? ' font-medium' : '')">
                    {{ fmt(v) }}
                  </td>
                }
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
})
export class TableCardComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) columns!: Column[];
  @Input() rows: Cell[][] | null = null;
  @Input() empty = 'No data found';
  /** Cap the body height and scroll it under a sticky header (long lists). */
  @Input() scroll = false;
  fmt = (v: Cell) => (typeof v === 'number' ? v.toLocaleString() : v);
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  host: { class: 'mb-5 flex flex-wrap items-center gap-3' },
  template: `<h1 class="mr-auto text-xl font-semibold text-navy">{{ title }}</h1><ng-content />`,
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
}

export type { DateRange } from '../api/types';
import type { DateRange } from '../api/types';
export const todayRange = (): DateRange => {
  const d = new Date().toISOString().slice(0, 10);
  return { from: d, to: d };
};

/** Runs `load` and keeps only the latest result: older, slower responses are dropped. null while loading. */
export class Latest<T> {
  value: T | null = null;
  private n = 0;
  async run(load: () => Promise<T>) {
    const n = ++this.n;
    this.value = null;
    const v = await load();
    if (n === this.n) this.value = v;
  }
}

const dateInput = 'h-9 rounded border border-slate/40 bg-white px-3 text-sm text-night outline-none focus:border-teal focus:ring-2 focus:ring-teal/20';

// "Sort by" from/to picker; only applies on the search button.
@Component({
  selector: 'app-date-range-filter',
  standalone: true,
  template: `
    <form class="flex flex-wrap items-center gap-2" (submit)="$event.preventDefault(); invalid || apply.emit({ from, to })">
      <span class="text-sm font-medium text-slate">Sort by</span>
      <input type="date" aria-label="From date" [class]="dateInput" [value]="from" [max]="to" (input)="from = $any($event.target).value" />
      <span class="text-sm text-slate">to</span>
      <input type="date" aria-label="To date" [class]="dateInput" [value]="to" [min]="from" (input)="to = $any($event.target).value" />
      <button [disabled]="invalid" aria-label="Apply date range"
        class="grid size-9 place-items-center rounded bg-navy text-white transition hover:bg-navy/90 disabled:opacity-40">
        <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  `,
})
export class DateRangeFilterComponent {
  @Input({ required: true }) set value(r: DateRange) { this.from = r.from; this.to = r.to; }
  @Output() apply = new EventEmitter<DateRange>();
  readonly dateInput = dateInput;
  from = '';
  to = '';
  get invalid() { return this.from > this.to; }
}

export function downloadCsv(filename: string, head: string[], rows: Cell[][]) {
  const esc = (v: Cell) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

@Component({
  selector: 'app-export-button',
  standalone: true,
  template: `
    <button type="button" [disabled]="busy" (click)="run()"
      class="flex h-9 items-center gap-2 rounded bg-teal px-3.5 text-sm font-semibold text-ink transition hover:brightness-105 disabled:opacity-50">
      <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" /></svg>
      {{ busy ? 'Exporting…' : 'Export' }}
    </button>
  `,
})
export class ExportButtonComponent {
  @Input({ required: true }) onExport!: () => Promise<void>;
  busy = false;
  async run() {
    this.busy = true;
    try { await this.onExport(); } finally { this.busy = false; }
  }
}

/** Underlined tab bar; sits flush at the top of a PANEL (negative margins cancel its padding). */
@Component({
  selector: 'app-tabs',
  standalone: true,
  host: { role: 'tablist', '[attr.aria-label]': 'label', class: '-mx-5 -mt-5 mb-6 flex gap-1 overflow-x-auto border-b border-slate/20 px-5' },
  template: `
    @for (t of tabs; track t) {
      <button type="button" role="tab" [attr.aria-selected]="value === t" (click)="valueChange.emit(t)"
        class="-mb-px whitespace-nowrap border-b-2 px-3 py-3.5 text-sm font-medium transition"
        [class]="value === t ? 'border-teal text-navy' : 'border-transparent text-slate hover:text-navy'">{{ t }}</button>
    }
  `,
})
export class TabsComponent {
  @Input({ required: true }) tabs!: readonly string[];
  @Input({ required: true }) value!: string;
  @Output() valueChange = new EventEmitter<any>();
  @Input({ required: true }) label!: string;
}

/** "Back" button for the far right of a PageHeader. `to` names the destination for screen readers / tooltip. */
@Component({
  selector: 'app-back-button',
  standalone: true,
  template: `
    <!-- navigateByUrl so hrefs may carry a query string (routerLink would encode the "?") -->
    <a [href]="href" (click)="$event.preventDefault(); router.navigateByUrl(href)" [title]="'Back to ' + to" [attr.aria-label]="'Back to ' + to"
      class="flex h-9 items-center gap-1.5 rounded border border-slate/40 bg-white px-3.5 text-sm font-medium text-navy transition hover:bg-mist">
      <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      Back
    </a>
  `,
})
export class BackButtonComponent {
  readonly router = inject(Router);
  @Input({ required: true }) href!: string;
  @Input({ required: true }) to!: string;
}

/** Form field wrapper: label (+ required star), projected control, then error or hint. */
@Component({
  selector: 'app-label',
  standalone: true,
  template: `
    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium text-night/70">{{ text }}@if (required) {<span class="text-red-600"> *</span>}</span>
      <ng-content />
      @if (error) { <span class="text-xs text-red-600">{{ error }}</span> } @else if (hint) { <span class="text-xs text-slate">{{ hint }}</span> }
    </label>
  `,
})
export class LabelComponent {
  @Input({ required: true }) text!: string;
  @Input() required = false;
  @Input() error?: string;
  @Input() hint?: string;
}

/** Modal dialog: opens while `open` is true; closes on ✕, Esc or backdrop click. */
@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    <!-- only report user-initiated closes (✕, Esc, backdrop); closing because open went false must not re-close the next dialog -->
    <dialog #dlg (close)="open ? closed.emit() : null" (click)="$event.target === dlg ? dlg.close() : null" [style.width]="'min(' + width + ', calc(100% - 2rem))'"
      class="m-auto rounded-md bg-white p-0 backdrop:bg-night/50">
      <header class="sticky top-0 z-10 flex items-center gap-3 border-b border-slate/20 bg-white px-5 py-4">
        <h2 class="mr-auto text-lg font-semibold text-navy">{{ title }}</h2>
        <button type="button" (click)="dlg.close()" aria-label="Close" class="grid size-8 place-items-center rounded bg-mist text-navy transition hover:bg-slate/20">
          <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </header>
      <div class="p-5">@if (open) { <ng-content /> }</div>
    </dialog>
  `,
})
export class ModalComponent implements OnChanges {
  @Input() open = false;
  @Input() title = '';
  @Input() width = '32rem';
  @Output() closed = new EventEmitter<void>();
  @ViewChild('dlg', { static: true }) dlg!: ElementRef<HTMLDialogElement>;
  ngOnChanges() {
    const d = this.dlg.nativeElement;
    if (this.open && !d.open) d.showModal();
    if (!this.open && d.open) d.close();
  }
}
