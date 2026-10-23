// Shared MBO display helpers.
import { Component, Input } from '@angular/core';
import type { Escalation, EscalationStatus, EvidenceStatus, Objective, RoleId, TargetStatus } from '../api/mbo';
import { bandsFor, type Band } from '../lib/mbo-bands';
import { FRAMEWORK_EXAMPLES } from '../lib/mbo-examples';
import { slaDueDate } from '../lib/mbo-sla';

export const STATUS: Record<TargetStatus, { label: string; tone: string }> = {
  'not-set': { label: 'Not set', tone: 'bg-mist text-slate' },
  draft: { label: 'Draft', tone: 'bg-amber-100 text-amber-800' },
  'awaiting-acceptance': { label: 'Awaiting employee acceptance', tone: 'bg-sky-100 text-sky-800' },
  'changes-requested': { label: 'Changes requested', tone: 'bg-red-100 text-red-700' },
  accepted: { label: 'Accepted', tone: 'bg-teal/10 text-[#00857d]' },
};

const chip = 'inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium';

@Component({
  selector: 'app-chip',
  standalone: true,
  template: `<span [class]="cls + ' ' + tone"><ng-content /></span>`,
})
export class ChipComponent {
  @Input({ required: true }) tone!: string;
  readonly cls = chip;
}

@Component({
  selector: 'app-status-chip',
  standalone: true,
  template: `<span [class]="cls + ' ' + s[status].tone">{{ s[status].label }}</span>`,
})
export class StatusChipComponent {
  @Input({ required: true }) status!: TargetStatus;
  readonly s = STATUS;
  readonly cls = chip;
}

/** Target / actual formatted for the objective's unit. */
export function formatValue(o: Objective, n?: number) {
  if (n === undefined) return '—';
  return o.kind === 'revenue' ? `HKD ${n.toLocaleString('en-US')}` : `${n.toLocaleString('en-US')} ${n === 1 ? o.unit!.replace(/ies$/, 'y').replace(/s$/, '') : o.unit}`;
}

/** Rating bands for the entered target, computed live. */
@Component({
  selector: 'app-band-guide',
  standalone: true,
  template: `
    @if ((o.kind === 'criteria' || o.kind === 'leadership') && !o.criteria) {
      <p class="py-2 text-xs text-slate">Rating guide not set up yet for this objective.</p>
    } @else if (o.kind === 'criteria' || o.kind === 'leadership') {
      <ol class="divide-y divide-slate/15 text-xs">
        @for (c of o.criteria; track i; let i = $index) {
          <li class="grid grid-cols-[1.25rem_1fr] gap-2 py-1.5"><span class="font-semibold text-navy">{{ 5 - i }}</span><span class="text-night/80">{{ c }}</span></li>
        }
      </ol>
    } @else if (!target) {
      <p class="py-2 text-xs text-slate">Enter a target to see the rating bands.</p>
    } @else {
      <ol class="divide-y divide-slate/15 text-xs">
        @for (b of bands(); track b.rating) {
          <li class="grid grid-cols-[1.25rem_1fr_auto] gap-2 py-1.5" [class.text-slate]="!b.reachable">
            <span class="font-semibold text-navy">{{ b.rating }}</span>
            <span [class]="b.reachable ? 'text-night/80' : ''">{{ b.label }}</span>
            <span class="text-right tabular-nums" [class]="b.reachable ? 'font-medium text-night' : 'italic'">{{ b.range }}</span>
          </li>
        }
      </ol>
      @if (missing().length > 0) {
        <p class="mt-2 rounded bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
          With a target of {{ target }}, rating{{ missing().length > 1 ? 's' : '' }} {{ missing().join(' and ') }} can't be reached in whole {{ o.unit }}.
          Pending MBO Panel guidance on small count targets.
        </p>
      }
    }
  `,
})
export class BandGuideComponent {
  @Input({ required: true }) o!: Objective;
  @Input() target?: number;
  bands = (): Band[] => bandsFor(this.o.kind as 'revenue' | 'count', this.target!, this.o.unit, this.o.bands, this.o.ratingLabels);
  missing = () => this.bands().filter((b) => !b.reachable).map((b) => b.rating);
}

export const EVIDENCE: Record<EvidenceStatus, { label: string; tone: string }> = {
  evidenced: { label: 'Evidence recorded', tone: 'bg-teal/10 text-[#00857d]' },
  pending: { label: 'Evidence pending', tone: 'bg-amber-100 text-amber-800' },
  missing: { label: 'Evidence missing', tone: 'bg-red-100 text-red-700' },
};

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  host: { class: 'block' },
  template: `
    <div class="h-1.5 w-full overflow-hidden rounded-full bg-mist" role="progressbar" [attr.aria-valuenow]="round(pct)" aria-valuemin="0" aria-valuemax="100">
      <div class="h-full rounded-full bg-teal" [style.width.%]="min(100, pct)"></div>
    </div>
  `,
})
export class ProgressBarComponent {
  @Input({ required: true }) pct!: number;
  readonly round = Math.round;
  readonly min = Math.min;
}

export const ESC_STATUS: Record<EscalationStatus, { label: string; tone: string }> = {
  draft: { label: 'Draft', tone: 'bg-amber-100 text-amber-800' },
  submitted: { label: 'Submitted', tone: 'bg-sky-100 text-sky-800' },
  acknowledged: { label: 'Acknowledged', tone: 'bg-teal/10 text-[#00857d]' },
  resolved: { label: 'Resolved', tone: 'bg-mist text-slate' },
};

const escDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** SLA outcome: submitted on/after the due date, or how long a draft has left. */
export function escalationSla(e: Escalation): { label: string; tone: string } {
  const due = slaDueDate(e.category, e.discovered);
  if (e.submittedAt) {
    return e.submittedAt.slice(0, 10) <= due
      ? { label: 'Within SLA', tone: 'bg-teal/10 text-[#00857d]' }
      : { label: 'Late', tone: 'bg-red-100 text-red-700' };
  }
  return new Date().toISOString().slice(0, 10) > due
    ? { label: `Overdue since ${escDate(due)}`, tone: 'bg-red-100 text-red-700' }
    : { label: `Due ${escDate(due)}`, tone: 'bg-amber-100 text-amber-800' };
}

/** The workbook's worked example + note for an objective (Excel columns E–F). */
@Component({
  selector: 'app-framework-example',
  standalone: true,
  template: `
    @if (x(); as x) {
      <div class="flex flex-col gap-1.5 text-xs leading-relaxed">
        <p class="whitespace-pre-line text-night/80">{{ x.example }}</p>
        @if (x.useCase) { <p class="text-night/80"><span class="font-semibold">Use case:</span> {{ x.useCase }}</p> }
        @if (x.note) { <p class="text-slate"><span class="font-semibold">Note:</span> {{ x.note }}</p> }
      </div>
    }
  `,
})
export class FrameworkExampleComponent {
  @Input({ required: true }) role!: RoleId;
  @Input({ required: true }) objectiveId!: string;
  x = () => FRAMEWORK_EXAMPLES[this.role]?.[this.objectiveId];
}
