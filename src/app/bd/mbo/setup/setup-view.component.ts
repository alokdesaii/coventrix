import { Component, EventEmitter, Input, Output } from '@angular/core';
import { type RoleId, type TaskRow } from '../../../api/mbo';
import { FRAMEWORK_EXAMPLES } from '../../../lib/mbo-examples';
import { BandGuideComponent, ChipComponent } from '../../../shared/mbo';
import { guideSummary, TYPE_LABEL } from './setup-shared';

type Section = 'task' | 'guide' | 'example';

/** Read-only view of one MBO task with its rating guide and framework example (they're 1:1). `focus` puts that section first. */
@Component({
  selector: 'app-setup-view',
  standalone: true,
  imports: [BandGuideComponent, ChipComponent],
  host: { class: 'flex flex-col gap-5' },
  template: `
    @for (s of order(); track s) {
      @switch (s) {
        @case ('task') {
          <section>
            <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate">MBO task</h3>
            <dl class="divide-y divide-slate/15 overflow-hidden rounded border border-slate/25 text-sm">
              @for (r of taskRows(); track r[0]) {
                <div class="grid grid-cols-[9rem_1fr]">
                  <dt class="border-r border-slate/20 bg-label px-3 py-2 font-semibold text-night">{{ r[0] }}</dt>
                  <dd class="whitespace-pre-line break-words px-3 py-2 text-night">{{ r[1] || '—' }}</dd>
                </div>
              }
            </dl>
          </section>
        }
        @case ('guide') {
          <section>
            <div class="mb-2 flex items-center justify-between gap-3">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-slate">Rating guide</h3>
              <app-chip [tone]="guideTone()">{{ guideLabel() }}</app-chip>
            </div>
            <div class="rounded border border-slate/25 px-4 py-3">
              <p class="mb-1 text-xs text-slate">{{ summary(row) }}{{ numeric() ? ' · shown at a sample target of ' + sample().toLocaleString('en-US') : '' }}</p>
              <app-band-guide [o]="row.objective" [target]="sample()" />
            </div>
          </section>
        }
        @case ('example') {
          <section>
            <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate">Framework example</h3>
            @if (example(); as x) {
              <div class="flex flex-col gap-1.5 rounded border border-slate/25 px-4 py-3 text-sm leading-relaxed">
                <p class="whitespace-pre-line text-night/90">{{ x.example }}</p>
                @if (x.useCase) { <p class="text-night/80"><span class="font-semibold">Use case:</span> {{ x.useCase }}</p> }
                @if (x.note) { <p class="text-slate"><span class="font-semibold">Note:</span> {{ x.note }}</p> }
              </div>
            } @else {
              <p class="rounded border border-dashed border-slate/40 px-4 py-3 text-sm text-slate">No framework example yet.</p>
            }
          </section>
        }
      }
    }
    <div class="flex justify-end gap-3 border-t border-slate/20 pt-4">
      <button type="button" class="h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist" (click)="closed.emit()">Close</button>
      <button type="button" class="h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90" (click)="edit.emit()">{{ editLabel }}</button>
    </div>
  `,
})
export class SetupViewComponent {
  @Input({ required: true }) role!: RoleId;
  @Input({ required: true }) row!: TaskRow;
  @Input() focus: Section = 'task';
  @Input() editLabel = 'Edit';
  @Output() edit = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  readonly summary = guideSummary;

  order = (): Section[] => [this.focus, ...(['task', 'guide', 'example'] as Section[]).filter((s) => s !== this.focus)];
  numeric = () => this.row.objective.kind === 'revenue' || this.row.objective.kind === 'count';
  sample = () => (this.row.objective.kind === 'revenue' ? 1_000_000 : 10);
  example = () => FRAMEWORK_EXAMPLES[this.role][this.row.objective.id];
  guideLabel = () => ({ custom: 'Custom', default: 'Framework default', missing: 'Not set up' })[this.row.guide];
  guideTone = () => ({ custom: 'bg-teal/10 text-[#00857d]', default: 'bg-label text-navy', missing: 'bg-red-100 text-red-700' })[this.row.guide];
  taskRows = (): [string, string | undefined][] => {
    const o = this.row.objective;
    return [
      ['Objective no', String(this.row.no)],
      ['Code', o.code ?? o.id.toUpperCase().replace(/-/g, '_')],
      ['Title', o.title],
      ['Description', o.definition],
      ['Weight', `${o.weight}%`],
      ['Target type', TYPE_LABEL[o.kind]],
      [o.kind === 'revenue' ? 'Currency' : 'Unit', o.kind === 'revenue' ? o.currency ?? 'HKD' : o.kind === 'count' ? o.unit : undefined],
      ['Evidence expected', o.evidence],
    ];
  };
}
