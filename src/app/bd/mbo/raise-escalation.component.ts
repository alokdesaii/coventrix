import { Component, Input, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { defaultL4, getCurrentUserId, getEscalation, getMyMbo, L4_RECIPIENTS, recipientsFor, saveEscalation, type Escalation, type Objective } from '../../api/mbo';
import { CATEGORY_LABEL, isMaterialVariance, slaDueDate, VARIANCE_THRESHOLD, variancePct, type EscalationCategory } from '../../lib/mbo-sla';
import { ChipComponent, escalationSla } from '../../shared/mbo';
import { BackButtonComponent, LabelComponent, PageHeaderComponent, PANEL, SelectComponent } from '../../shared/ui';

const field = 'h-10 w-full rounded border bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20';
const area = 'w-full rounded border bg-white px-3 py-2 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20';
const border = (bad?: string) => (bad ? 'border-red-400' : 'border-slate/40');
const primary = 'h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40';
const secondary = 'flex h-10 items-center rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40';
const MAX_MB = 10;

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const parseNum = (s: string) => { const d = s.replace(/[^\d]/g, ''); return d ? Number(d) : undefined; };
const money = (n?: number) => (n === undefined ? '' : n.toLocaleString('en-US'));

type Errors = Partial<Record<string, string>>;
type Form = Omit<Escalation, 'comparison'> & { comparison: { from: string; to: string; expected?: number; actual?: number } };
type Mode = 'draft' | 'submit';

const blank = (period: string, owner: string, objectiveId?: string): Form => ({
  id: `esc-${Date.now()}`, memberId: getCurrentUserId(), l4: defaultL4(), period, status: 'draft', category: 'variance', objectiveId, title: '', discovered: today(),
  comparison: { from: '', to: '' }, impact: '', rootCause: '', recovery: '', owner, attachments: [], reference: '', recipients: recipientsFor(defaultL4()),
});

function validate(f: Form, submit: boolean): Errors {
  const e: Errors = {};
  if (!f.title.trim()) e['title'] = 'Give the issue a short title.';
  if (!submit) return e; // drafts only need a title
  if (!f.discovered) e['discovered'] = 'Enter the date you discovered the issue.';
  else if (f.discovered > today()) e['discovered'] = "Can't be in the future.";
  if (f.category === 'variance') {
    const c = f.comparison;
    if (!c.from || !c.to) e['period'] = 'Enter the comparison period.';
    else if (c.from > c.to) e['period'] = 'Start must be before end.';
    if (!c.expected) e['expected'] = 'Enter the expected amount for the period.';
    if (c.actual === undefined) e['actual'] = 'Enter the actual amount for the period.';
  }
  if (!f.impact.trim()) e['impact'] = 'Describe the business or relationship impact.';
  if (!f.rootCause.trim()) e['rootCause'] = "Explain the root cause, or what's still under investigation.";
  if (!f.recovery.trim()) e['recovery'] = 'Set out the recovery actions or support needed.';
  if (!f.owner.trim()) e['owner'] = 'Name who follows up.';
  if (f.followUp && f.followUp < f.discovered) e['followUp'] = "Follow-up can't be before the discovery date.";
  return e;
}

@Component({
  selector: 'app-raise-escalation',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, BackButtonComponent, LabelComponent, SelectComponent, ChipComponent],
  template: `
    <app-page-header [title]="draftId ? 'Continue Escalation' : 'Raise Escalation'">
      <app-back-button [href]="'/bd/web/mbo/escalations?period=' + periodId" to="My Escalations" />
    </app-page-header>

    <div [class]="panel">
      @if (!f) {
        <div class="h-64 animate-pulse rounded-md bg-mist"></div>
      } @else {
        <form novalidate (submit)="$event.preventDefault(); save('submit')" class="flex flex-col gap-6">
          <div class="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
            <div class="flex flex-col gap-6">
              <section class="flex flex-col gap-4">
                <h2 class="text-[15px] font-semibold text-navy">The issue</h2>
                <fieldset>
                  <legend class="mb-1.5 text-xs font-medium text-night/70">Category<span class="text-red-600"> *</span></legend>
                  <div class="grid gap-2 sm:grid-cols-3">
                    @for (k of categories; track k) {
                      <label class="flex cursor-pointer items-center gap-2 rounded border px-3 py-2.5 text-sm"
                        [class]="f.category === k ? 'border-navy bg-label/50 text-night' : 'border-slate/40 text-night/80 hover:bg-mist'">
                        <input type="radio" name="category" [checked]="f.category === k" (change)="f.category = k"
                          class="size-4 shrink-0 appearance-none rounded-full border border-slate/60 bg-white transition checked:border-[5px] checked:border-navy focus-visible:ring-2 focus-visible:ring-teal/40" />
                        {{ cat[k] }}
                      </label>
                    }
                  </div>
                  @if (f.category === 'bank-risk') {
                    <label class="mt-3 flex items-start gap-2 rounded bg-label/50 px-3 py-2.5 text-sm text-night">
                      <input type="checkbox" class="mt-0.5 size-4 accent-navy" [checked]="f.l4" (change)="f.l4 = $any($event.target).checked" />
                      <span>
                        <span class="font-medium">Escalate as L4</span> — the issue could jeopardise the bank relationship.
                        <span class="block text-xs text-slate">Also goes to {{ l4Recipients.join(', ') }}, immediately.</span>
                      </span>
                    </label>
                  }
                </fieldset>
                <div class="grid gap-4 sm:grid-cols-2">
                  <app-label text="Issue title" [required]="true" [error]="e()['title']">
                    <input [class]="field + ' ' + border(e()['title'])" [attr.aria-invalid]="!!e()['title']" placeholder="e.g. Q3 revenue 12% below plan"
                      [value]="f.title" (input)="f.title = val($event)" />
                  </app-label>
                  <app-label text="Linked objective">
                    <app-select class="[&_select]:h-10 [&_select]:text-sm" label="Linked objective" [value]="f.objectiveId ?? ''"
                      (valueChange)="f.objectiveId = $event || undefined" [options]="objectiveOpts" />
                  </app-label>
                  <app-label text="Date discovered" [required]="true" [error]="e()['discovered']">
                    <input type="date" [max]="today()" [class]="field + ' ' + border(e()['discovered'])" [attr.aria-invalid]="!!e()['discovered']"
                      [value]="f.discovered" (input)="f.discovered = val($event)" />
                  </app-label>
                  <app-label text="Time discovered (if known)">
                    <input type="time" [class]="field + ' border-slate/40'" [value]="f.discoveredTime ?? ''" (input)="f.discoveredTime = val($event) || undefined" />
                  </app-label>
                </div>
              </section>

              @if (f.category === 'variance') {
                <section class="flex flex-col gap-4 border-t border-slate/20 pt-6">
                  <div>
                    <h2 class="text-[15px] font-semibold text-navy">Comparison basis</h2>
                    <p class="mt-0.5 text-xs text-slate">Expected and actual for the same period, from your forecast or monthly target, not the annual target.</p>
                  </div>
                  <div class="grid gap-4 sm:grid-cols-2">
                    <app-label text="Period from" [required]="true" [error]="e()['period']">
                      <input type="date" [class]="field + ' ' + border(e()['period'])" [attr.aria-invalid]="!!e()['period']" [value]="f.comparison.from" (input)="f.comparison.from = val($event)" />
                    </app-label>
                    <app-label text="Period to" [required]="true">
                      <input type="date" [max]="today()" [class]="field + ' ' + border(e()['period'])" [value]="f.comparison.to" (input)="f.comparison.to = val($event)" />
                    </app-label>
                    <app-label text="Expected for the period (HKD)" [required]="true" [error]="e()['expected']">
                      <input #exp inputmode="numeric" [class]="field + ' tabular-nums ' + border(e()['expected'])" [attr.aria-invalid]="!!e()['expected']"
                        [value]="money(f.comparison.expected)" (input)="f.comparison.expected = num(exp)" />
                    </app-label>
                    <app-label text="Actual for the period (HKD)" [required]="true" [error]="e()['actual']">
                      <input #act inputmode="numeric" [class]="field + ' tabular-nums ' + border(e()['actual'])" [attr.aria-invalid]="!!e()['actual']"
                        [value]="money(f.comparison.actual)" (input)="f.comparison.actual = num(act)" />
                    </app-label>
                  </div>
                </section>
              }

              <section class="flex flex-col gap-4 border-t border-slate/20 pt-6">
                <h2 class="text-[15px] font-semibold text-navy">Impact &amp; recovery</h2>
                <app-label text="Impact" [required]="true" [error]="e()['impact']" hint="What's affected — revenue, client, bank relationship — and by how much.">
                  <textarea rows="3" [class]="area + ' ' + border(e()['impact'])" [attr.aria-invalid]="!!e()['impact']" [value]="f.impact" (input)="f.impact = val($event)"></textarea>
                </app-label>
                <app-label text="Root cause" [required]="true" [error]="e()['rootCause']" hint="Mark anything still under investigation.">
                  <textarea rows="2" [class]="area + ' ' + border(e()['rootCause'])" [attr.aria-invalid]="!!e()['rootCause']" [value]="f.rootCause" (input)="f.rootCause = val($event)"></textarea>
                </app-label>
                <app-label text="Recovery actions / support needed" [required]="true" [error]="e()['recovery']">
                  <textarea rows="2" [class]="area + ' ' + border(e()['recovery'])" [attr.aria-invalid]="!!e()['recovery']" [value]="f.recovery" (input)="f.recovery = val($event)"></textarea>
                </app-label>
                <div class="grid gap-4 sm:grid-cols-2">
                  <app-label text="Who follows up" [required]="true" [error]="e()['owner']">
                    <input [class]="field + ' ' + border(e()['owner'])" [attr.aria-invalid]="!!e()['owner']" placeholder="Name / role" [value]="f.owner" (input)="f.owner = val($event)" />
                  </app-label>
                  <app-label text="Follow-up date" [error]="e()['followUp']">
                    <input type="date" [class]="field + ' ' + border(e()['followUp'])" [attr.aria-invalid]="!!e()['followUp']" [value]="f.followUp ?? ''" (input)="f.followUp = val($event) || undefined" />
                  </app-label>
                </div>
              </section>

              <section class="flex flex-col gap-4 border-t border-slate/20 pt-6">
                <h2 class="text-[15px] font-semibold text-navy">Supporting evidence</h2>
                <div class="rounded border border-dashed border-slate/50 p-4">
                  <div class="flex flex-wrap items-center gap-3">
                    <div class="mr-auto text-sm">
                      <p class="font-medium text-night">{{ f.attachments.length ? f.attachments.length + ' file' + (f.attachments.length > 1 ? 's' : '') + ' attached' : 'No files attached' }}</p>
                      <p class="text-xs text-slate">Optional · up to {{ maxMb }} MB each</p>
                    </div>
                    <label class="flex h-9 cursor-pointer items-center rounded border border-navy px-4 text-sm font-medium text-navy hover:bg-mist">
                      Choose files
                      <input #fi type="file" multiple class="sr-only" (change)="addFiles(fi.files); fi.value = ''" />
                    </label>
                  </div>
                  @if (f.attachments.length > 0) {
                    <ul class="mt-3 divide-y divide-slate/15 border-t border-slate/15">
                      @for (a of f.attachments; track i; let i = $index) {
                        <li class="flex items-center gap-3 py-2 text-sm">
                          <span class="mr-auto truncate">{{ a.name }}</span>
                          <button type="button" (click)="removeFile(i)" class="h-7 rounded px-2 text-xs font-semibold text-red-600 hover:bg-red-50">Remove</button>
                        </li>
                      }
                    </ul>
                  }
                  @if (fileError) { <p class="mt-2 text-xs text-red-600">{{ fileError }}</p> }
                </div>
                <app-label text="Source record / reference" hint="e.g. forecast file, CRM report or bank correspondence reference.">
                  <input [class]="field + ' border-slate/40'" [value]="f.reference" (input)="f.reference = val($event)" />
                </app-label>
              </section>
            </div>

            <!-- Side panel: deadline, variance, recipients -->
            <div class="flex flex-col gap-5 lg:sticky lg:top-24">
              <section class="rounded-md border border-slate/25 p-5 text-sm">
                <h2 class="mb-3 text-[15px] font-semibold text-navy">Deadline</h2>
                <p class="text-xs text-slate">{{ f.category === 'bank-risk' ? 'Bank-relationship risk: escalate immediately' : 'Written escalation within 3 business days of discovery' }}</p>
                <p class="mt-1 text-lg font-semibold text-night">{{ f.discovered ? fmtDate(due()) : '—' }}</p>
                <p class="mt-2"><app-chip [tone]="sla().tone">{{ sla().label }}</app-chip></p>
                <p class="mt-3 text-xs text-slate">Don't wait for complete evidence. Send what you know and add the rest later. Business days exclude weekends; public holidays aren't counted yet.</p>
              </section>

              @if (f.category === 'variance') {
                <section class="rounded-md border border-slate/25 p-5 text-sm">
                  <h2 class="mb-3 text-[15px] font-semibold text-navy">Variance</h2>
                  @if (pct() === null) {
                    <p class="text-xs text-slate">Enter expected and actual amounts to calculate it.</p>
                  } @else {
                    <p class="text-2xl font-semibold tabular-nums" [class]="material() ? 'text-red-600' : 'text-night'">{{ pct()! > 0 ? '+' : '' }}{{ pct()!.toFixed(1) }}%</p>
                    <p class="text-xs text-slate">HKD {{ money(f.comparison.actual) }} actual vs HKD {{ money(f.comparison.expected) }} expected</p>
                    <p class="mt-3 rounded px-2.5 py-2 text-xs" [class]="material() ? 'bg-red-50 text-red-800' : 'bg-mist text-night/80'">
                      {{ material() ? 'Material variance (≥' + threshold + '%). A written escalation is required.' : 'Below the ' + threshold + "% threshold, so escalation isn't required. You can still raise it." }}
                    </p>
                  }
                </section>
              }

              <section class="rounded-md border border-slate/25 p-5 text-sm">
                <h2 class="mb-2 text-[15px] font-semibold text-navy">Sent to</h2>
                <ul class="flex flex-col gap-1">
                  @for (r of recipients(); track r; let i = $index) {
                    <li class="flex items-baseline justify-between gap-3"><span class="font-medium text-night">{{ r }}</span><span class="text-xs text-slate">{{ i === 0 ? 'Your manager' : 'L4' }}</span></li>
                  }
                </ul>
                @if (f.category === 'bank-risk') { <p class="mt-2 text-xs text-slate">Also call them — bank risk can't wait for email.</p> }
              </section>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
            @if (error) { <p role="alert" class="mr-auto text-sm text-red-600">{{ error }}</p> }
            @else { <p class="mr-auto text-xs text-slate">A saved draft is not a written escalation — submit it to {{ recipients().join(', ') }} within the deadline.</p> }
            <a routerLink="/bd/web/mbo/escalations" [queryParams]="{ period: periodId }" [class]="secondary">Cancel</a>
            <button type="button" [class]="secondary" [disabled]="!!saving" (click)="save('draft')">{{ saving === 'draft' ? 'Saving…' : 'Save draft' }}</button>
            <button [class]="primary" [disabled]="!!saving">{{ saving === 'submit' ? 'Submitting…' : 'Submit escalation' }}</button>
          </div>
        </form>
      }
    </div>
  `,
})
export class RaiseEscalationComponent implements OnInit {
  // Query-param inputs (?period=, ?draft=, ?objective=), set before ngOnInit.
  @Input() set period(v: string | undefined) { if (v) this.periodId = v; }
  @Input() set draft(v: string | undefined) { this.draftId = v ?? null; }
  @Input() objective?: string;

  private router = inject(Router);
  readonly panel = PANEL;
  readonly field = field;
  readonly area = area;
  readonly border = border;
  readonly primary = primary;
  readonly secondary = secondary;
  readonly today = today;
  readonly fmtDate = fmtDate;
  readonly money = money;
  readonly maxMb = MAX_MB;
  readonly threshold = VARIANCE_THRESHOLD;
  readonly cat = CATEGORY_LABEL;
  readonly categories = Object.keys(CATEGORY_LABEL) as EscalationCategory[];
  readonly l4Recipients = L4_RECIPIENTS;

  periodId = '2026';
  draftId: string | null = null;
  f: Form | null = null;
  objectiveOpts: { value: string; label: string }[] = [];
  tried: Mode | null = null;
  saving: Mode | null = null;
  error = '';
  fileError = '';

  val = (ev: Event) => (ev.target as HTMLInputElement).value;
  num = (el: HTMLInputElement) => { const n = parseNum(el.value); el.value = money(n); return n; };
  e = (): Errors => (this.f && this.tried ? validate(this.f, this.tried === 'submit') : {});
  isL4 = () => this.f!.category === 'bank-risk' && this.f!.l4;
  recipients = () => recipientsFor(this.isL4());
  due = () => slaDueDate(this.f!.category, this.f!.discovered || today());
  sla = () => escalationSla({ ...this.f!, comparison: undefined } as Escalation);
  pct = () => { const c = this.f!.comparison; return c.expected && c.actual !== undefined ? variancePct(c.expected, c.actual) : null; };
  material = () => isMaterialVariance(this.pct()!);

  async ngOnInit() {
    const [mbo, draft] = await Promise.all([getMyMbo(this.periodId), this.draftId ? getEscalation(this.draftId) : null]);
    this.objectiveOpts = [{ value: '', label: 'Not linked to an objective' }, ...mbo.template.objectives.map((o: Objective) => ({ value: o.id, label: o.title }))];
    this.f = draft && draft.status === 'draft'
      ? { ...structuredClone(draft), comparison: draft.comparison ? { ...draft.comparison } : { from: '', to: '' } }
      : blank(this.periodId, mbo.member.name, this.objective);
  }

  addFiles(list: FileList | null) {
    const picked = Array.from(list ?? []), limit = MAX_MB * 1024 * 1024;
    const big = picked.filter((x) => x.size > limit);
    this.f!.attachments = [...this.f!.attachments, ...picked.filter((x) => x.size <= limit).map((x) => ({ name: x.name, size: x.size }))];
    this.fileError = big.length ? `${big.map((x) => x.name).join(', ')} over ${MAX_MB} MB.` : '';
  }

  removeFile(i: number) { this.f!.attachments = this.f!.attachments.filter((_, j) => j !== i); }

  async save(mode: Mode) {
    const f = this.f!;
    this.tried = mode;
    if (Object.keys(validate(f, mode === 'submit')).length) {
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
      return;
    }
    this.saving = mode;
    this.error = '';
    const c = f.comparison, l4 = this.isL4();
    try {
      await saveEscalation({
        ...f, title: f.title.trim(), owner: f.owner.trim(), l4, recipients: recipientsFor(l4),
        comparison: f.category === 'variance' && c.expected !== undefined && c.actual !== undefined ? { from: c.from, to: c.to, expected: c.expected, actual: c.actual } : undefined,
      }, mode === 'submit');
      this.router.navigate(['/bd/web/mbo/escalations'], { queryParams: { period: this.periodId } });
    } catch {
      this.error = "Couldn't save. Please try again.";
      this.saving = null;
    }
  }
}
