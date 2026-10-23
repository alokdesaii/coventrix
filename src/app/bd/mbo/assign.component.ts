import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  getAssignment, listTeam, PERIODS, ROLE_TEMPLATES, saveAssignment,
  type Objective, type ObjectiveTarget, type RoleId, type TargetAssignment, type TargetStatus, type TeamMember,
} from '../../api/mbo';
import { big } from '../../shared/client-list.component';
import { BandGuideComponent, FrameworkExampleComponent, STATUS, StatusChipComponent } from '../../shared/mbo';
import { PageHeaderComponent, PANEL, SelectComponent } from '../../shared/ui';

const field = 'h-10 w-full rounded border bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-mist disabled:text-slate';
const fmt = (n?: number) => (n === undefined ? '' : n.toLocaleString('en-US'));
const parse = (s: string) => { const d = s.replace(/[^\d]/g, ''); return d ? Number(d) : undefined; };
const xIcon = 'M6 6l12 12M18 6 6 18';

@Component({
  selector: 'app-commitment-list',
  standalone: true,
  host: { class: 'flex flex-col gap-2' },
  template: `
    @for (c of items; track i; let i = $index) {
      <div class="flex items-start gap-2">
        <input [class]="field + ' border-slate/40'" [value]="c" [disabled]="disabled" [attr.aria-label]="'Commitment ' + (i + 1)"
          (input)="itemsChange.emit(replace(i, $any($event.target).value))" />
        @if (!disabled) {
          <button type="button" [attr.aria-label]="'Remove commitment ' + (i + 1)" (click)="itemsChange.emit(without(i))"
            class="grid size-10 shrink-0 place-items-center rounded text-slate hover:bg-red-50 hover:text-red-600">
            <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path [attr.d]="x" /></svg>
          </button>
        }
      </div>
    }
    @if (!disabled) {
      <div class="flex gap-2">
        <input [class]="field + ' border-dashed border-slate/50'" [placeholder]="placeholder" [value]="draft" aria-label="New commitment"
          (input)="draft = $any($event.target).value" (keydown.enter)="$event.preventDefault(); add()" />
        <button type="button" (click)="add()" aria-label="Add commitment" class="grid size-10 shrink-0 place-items-center rounded bg-navy text-white transition hover:bg-navy/90">
          <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
    }
  `,
})
export class CommitmentListComponent {
  @Input({ required: true }) items!: string[];
  @Output() itemsChange = new EventEmitter<string[]>();
  @Input() disabled = false;
  @Input() placeholder = '';
  readonly field = field;
  readonly x = xIcon;
  draft = '';
  replace = (i: number, v: string) => this.items.map((x, j) => (j === i ? v : x));
  without = (i: number) => this.items.filter((_, j) => j !== i);
  add() {
    if (!this.draft.trim()) return;
    this.itemsChange.emit([...this.items, this.draft.trim()]);
    this.draft = '';
  }
}

@Component({
  selector: 'app-objective-card',
  standalone: true,
  imports: [CommitmentListComponent, BandGuideComponent, FrameworkExampleComponent],
  host: { class: 'block overflow-hidden rounded-md border border-slate/25' },
  template: `
    <header class="flex items-start gap-4 border-b border-slate/20 bg-label/60 px-5 py-3">
      <span class="grid size-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-semibold text-white">{{ n }}</span>
      <div class="mr-auto">
        <h3 class="text-[15px] font-semibold text-navy">{{ o.title }}</h3>
        <p class="mt-0.5 text-xs leading-relaxed text-night/70">{{ o.definition }}</p>
      </div>
      <span class="shrink-0 rounded bg-white px-2.5 py-1 text-sm font-semibold tabular-nums text-navy" title="Weight is fixed by the role framework">{{ o.weight }}%</span>
    </header>

    <div class="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div class="flex flex-col gap-4">
        @if (numeric) {
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-night/70">Annual target {{ o.kind === 'revenue' ? '(HKD)' : '(' + o.unit + ')' }}<span class="text-red-600"> *</span></span>
            <div class="relative">
              @if (o.kind === 'revenue') { <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate">HKD</span> }
              <input #inp inputmode="numeric" [disabled]="locked" [attr.aria-invalid]="!!error"
                [class]="field + (o.kind === 'revenue' ? ' pl-12' : '') + ' tabular-nums ' + (error ? 'border-red-400' : 'border-slate/40')"
                [placeholder]="o.kind === 'revenue' ? 'e.g. 4,000,000' : 'e.g. 2'" [value]="fmt(t.target)" (input)="setTarget(inp)" />
            </div>
            @if (error) { <span class="text-xs text-red-600">{{ error }}</span> }
          </label>
        } @else {
          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-night/70">{{ o.kind === 'leadership' ? 'Agreed leadership commitments' : 'Agreed commitments' }}<span class="text-red-600"> *</span></span>
            <app-commitment-list [items]="t.commitments" [disabled]="locked" (itemsChange)="tChange.emit({ objectiveId: t.objectiveId, target: t.target, commitments: $event })"
              [placeholder]="o.kind === 'leadership' ? 'Add a commitment, e.g. quarterly coaching for direct reports' : 'Add a commitment'" />
            @if (error) { <span class="text-xs text-red-600">{{ error }}</span> }
          </div>
        }
        <div>
          <p class="text-xs font-medium text-night/70">Evidence expected</p>
          <p class="mt-1 text-xs leading-relaxed text-slate">{{ o.evidence }}</p>
        </div>
        <details class="group rounded border border-slate/20 px-3 py-2">
          <summary class="cursor-pointer text-xs font-semibold text-navy">Framework example</summary>
          <div class="mt-2"><app-framework-example [role]="role" [objectiveId]="o.id" /></div>
        </details>
      </div>

      <div class="rounded border border-slate/20 px-4 py-3">
        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate">Rating guide</p>
        <app-band-guide [o]="o" [target]="t.target" />
      </div>
    </div>
  `,
})
export class ObjectiveCardComponent {
  @Input({ required: true }) n!: number;
  @Input({ required: true }) o!: Objective;
  @Input({ required: true }) t!: ObjectiveTarget;
  @Output() tChange = new EventEmitter<ObjectiveTarget>();
  @Input() error?: string;
  @Input() locked = false;
  @Input({ required: true }) role!: RoleId;
  readonly field = field;
  readonly fmt = fmt;
  get numeric() { return this.o.kind === 'revenue' || this.o.kind === 'count'; }
  setTarget(el: HTMLInputElement) {
    const target = parse(el.value);
    el.value = fmt(target); // keep thousands separators as the user types
    this.tChange.emit({ ...this.t, target });
  }
}

function validate(objectives: Objective[], a: TargetAssignment) {
  const errors: Record<string, string> = {};
  for (const o of objectives) {
    const t = a.targets.find((x) => x.objectiveId === o.id)!;
    if ((o.kind === 'revenue' || o.kind === 'count') && !t.target) errors[o.id] = 'Enter an annual target greater than 0.';
    if ((o.kind === 'criteria' || o.kind === 'leadership') && !t.commitments.some((c) => c.trim())) errors[o.id] = 'Add at least one commitment.';
  }
  return errors;
}

type Member = TeamMember & { status: Record<string, TargetStatus> };

@Component({
  selector: 'app-assign',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, SelectComponent, StatusChipComponent, ObjectiveCardComponent],
  template: `
    <app-page-header title="Assign MBO Targets">@if (a) { <app-status-chip [status]="a.status" /> }</app-page-header>

    <div [class]="panel + ' flex flex-col gap-6'">
      <section class="grid gap-x-5 gap-y-4 border-b border-slate/20 pb-6 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Team member
          <app-select [class]="big" label="Team member" [value]="memberId" (valueChange)="memberId = $event; load()" [options]="options()" />
        </div>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Review period
          <app-select [class]="big" label="Review period" [value]="periodId" (valueChange)="periodId = $event; load()" [options]="periods" />
        </div>
        <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">
          <span class="flex items-baseline justify-between gap-2">Role template <a routerLink="/bd/web/mbo/tasks" [queryParams]="{ role: template()?.id }" class="font-semibold text-navy hover:underline">Edit MBO setup →</a></span>
          <div class="flex min-h-9 flex-col justify-center rounded bg-label/60 px-3 py-1.5">
            <span class="text-sm font-semibold text-navy">{{ template()?.label ?? '—' }}</span>
            @if (template(); as tpl) { <span class="text-xs font-normal text-night/70">{{ tpl.objectives.length }} objectives · 100% weight · weights fixed by framework</span> }
          </div>
        </div>
      </section>

      @if (locked()) {
        <p class="rounded bg-teal/10 px-4 py-3 text-sm text-[#00857d]">{{ current()?.name }} accepted these targets. They're read-only for this period; changes need a new agreement.</p>
      }
      @if (a?.status === 'changes-requested') {
        <div class="rounded bg-red-50 px-4 py-3 text-sm text-red-800">
          <p class="font-semibold">{{ current()?.name }} asked for changes</p>
          <p class="mt-1 whitespace-pre-line">{{ a?.changeRequest }}</p>
        </div>
      }
      @if (a?.status === 'awaiting-acceptance') {
        <p class="rounded bg-sky-50 px-4 py-3 text-sm text-sky-800">Waiting for {{ current()?.name }} to accept. Editing and sending again replaces the version they were sent.</p>
      }

      @if (!a || !template()) {
        <div class="flex flex-col gap-4">@for (i of [0, 1, 2]; track i) { <div class="h-44 animate-pulse rounded-md bg-mist"></div> }</div>
      } @else {
        <div class="flex flex-col gap-4">
          @for (o of template()!.objectives; track o.id; let i = $index) {
            <app-objective-card [n]="i + 1" [o]="o" [role]="template()!.id" [locked]="locked()" [error]="errors()[o.id]"
              [t]="targetFor(o.id)" (tChange)="setTarget($event)" />
          }
        </div>

        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-medium text-night/70">Notes for {{ current()?.name }} (optional)</span>
          <textarea rows="3" [disabled]="locked()" [value]="a.notes" placeholder="Context for the employee, e.g. how the targets were set"
            (input)="a.notes = $any($event.target).value"
            class="w-full rounded border border-slate/40 px-3 py-2 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-mist"></textarea>
        </label>

        @if (!locked()) {
          <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
            @if (notice) {
              <p role="status" class="mr-auto text-sm text-[#00857d]">{{ notice }}</p>
            } @else if (tried && hasErrors()) {
              <p role="alert" class="mr-auto text-sm text-red-600">Complete the highlighted objectives before sending.</p>
            } @else if (!tried) {
              <p class="mr-auto text-xs text-slate">Final ratings are set by the MBO Panel / RemCo, not on this screen.</p>
            }
            <button type="button" [disabled]="!!saving" (click)="save(false)"
              class="h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40">
              {{ saving === 'draft' ? 'Saving…' : 'Save draft' }}
            </button>
            <button type="button" [disabled]="!!saving" (click)="save(true)"
              class="h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40">
              {{ saving === 'send' ? 'Sending…' : a.status === 'awaiting-acceptance' ? 'Send updated targets' : 'Send for acceptance' }}
            </button>
          </div>
        }
      }
    </div>
  `,
})
export class AssignComponent implements OnInit {
  // Bound from ?member= and ?period= (withComponentInputBinding).
  @Input() set member(v: string | undefined) { if (v) this.memberId = v; }
  @Input() set period(v: string | undefined) { if (v) this.periodId = v; }

  readonly panel = PANEL;
  readonly big = big;
  readonly periods = PERIODS;

  memberId = 'u1';
  periodId = '2026';
  team: Member[] | null = null;
  a: TargetAssignment | null = null;
  tried = false;
  saving: 'draft' | 'send' | null = null;
  notice = '';
  private req = 0;

  current = () => this.team?.find((m) => m.id === this.memberId);
  template = () => { const m = this.current(); return m ? ROLE_TEMPLATES[m.role] : null; };
  locked = () => this.a?.status === 'accepted';
  errors = (): Record<string, string> => (this.a && this.template() && this.tried ? validate(this.template()!.objectives, this.a) : {});
  hasErrors = () => Object.keys(this.errors()).length > 0;
  targetFor = (id: string) => this.a!.targets.find((x) => x.objectiveId === id)!;

  options = () => (this.team?.length
    ? this.team.map((m) => ({
        value: m.id,
        label: `${m.name} — ${ROLE_TEMPLATES[m.role].label}${m.status[this.periodId] !== 'not-set' ? ` (${STATUS[m.status[this.periodId]].label})` : ''}`,
      }))
    : [{ value: this.memberId, label: 'Loading…' }]);

  // Query-param inputs are set before ngOnInit.
  async ngOnInit() {
    this.load();
    this.team = await listTeam();
  }

  async load() {
    const n = ++this.req;
    this.a = null;
    const a = await getAssignment(this.memberId, this.periodId);
    if (n !== this.req) return;
    this.a = a;
    this.tried = false;
    this.notice = '';
  }

  setTarget(t: ObjectiveTarget) {
    this.a!.targets = this.a!.targets.map((x) => (x.objectiveId === t.objectiveId ? t : x));
    this.notice = '';
  }

  async save(send: boolean) {
    const a = this.a, tpl = this.template();
    if (!a || !tpl) return;
    if (send) {
      this.tried = true;
      if (Object.keys(validate(tpl.objectives, a)).length) {
        setTimeout(() => document.querySelector<HTMLElement>("[aria-invalid=true], input[aria-label='New commitment']")?.focus());
        return;
      }
    }
    this.saving = send ? 'send' : 'draft';
    this.a = await saveAssignment(a, send);
    this.saving = null;
    this.team = await listTeam(); // keep status labels in the picker current
    this.notice = send ? `Sent to ${this.current()?.name} for acceptance.` : 'Draft saved.';
  }
}
