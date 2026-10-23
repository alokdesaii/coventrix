import { Component, Input, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BANDS, getRatingGuide, RATING_LABELS, ROLE_TEMPLATES, saveRatingGuide, type Objective, type RatingGuide, type RoleId } from '../../../api/mbo';
import { BandGuideComponent } from '../../../shared/mbo';
import { BackButtonComponent, LabelComponent, PageHeaderComponent, PANEL, SelectComponent } from '../../../shared/ui';
import { TYPE_LABEL } from './tasks.component';

type Errors = Partial<Record<string, string>>;
type Row = { label: string; mult: string; criteria: string };

const small = 'h-9 w-full rounded border bg-white px-2.5 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-mist disabled:text-slate';
const border = (bad?: string) => (bad ? 'border-red-400' : 'border-slate/40');
const tall = '[&_select]:h-10 [&_select]:text-sm';
const primary = 'h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40';
const secondary = 'h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40';
const RATING_TONE = ['', 'bg-red-100 text-red-700', 'bg-amber-100 text-amber-800', 'bg-label text-navy', 'bg-sky-100 text-sky-800', 'bg-teal/15 text-[#00857d]'];
const CRITERIA_HINT = ['100% timely + proactive + clean reporting', '100% timely + clean reporting', 'All required escalations within SLA', '1 late escalation or incomplete reporting', '≥2 late or any unflagged material issue'];

/** Set the 5-band rating guide for one MBO task. Starts by picking the task. */
@Component({
  selector: 'app-mbo-rating-guide-form',
  standalone: true,
  imports: [PageHeaderComponent, BackButtonComponent, LabelComponent, SelectComponent, BandGuideComponent],
  template: `
    <app-page-header title="Rating Guide">
      <app-back-button [href]="'/bd/web/mbo/rating-guides?role=' + role" to="Rating Guides" />
    </app-page-header>

    <form novalidate (submit)="$event.preventDefault(); save()" [class]="panel + ' flex flex-col gap-6'">
      <section class="grid gap-4 sm:grid-cols-2">
        <app-label text="Role template" [required]="true">
          <app-select [class]="tall" label="Role template" [value]="role" (valueChange)="pickRole($event)" [options]="roleOpts" />
        </app-label>
        <app-label text="MBO task" [required]="true" [error]="e()['task']">
          <app-select [class]="tall" label="MBO task" [value]="no ? '' + no : ''" [invalid]="!!e()['task']" (valueChange)="pickTask(+$event)" [options]="taskOpts()" />
        </app-label>
      </section>

      @if (!task) {
        <div class="rounded-md border border-dashed border-slate/40 px-5 py-12 text-center text-sm text-slate">
          {{ loading ? 'Loading…' : 'Pick an MBO task to set up its rating guide.' }}
        </div>
      } @else {
        <div class="flex flex-wrap items-center gap-x-8 gap-y-2 rounded bg-label/50 px-4 py-3 text-sm">
          <span class="text-night/80">Type <span class="font-semibold text-night">{{ typeLabel[task.kind] }}{{ unit() }}</span></span>
          <span class="text-night/80">Weight <span class="font-semibold text-navy">{{ task.weight }}%</span></span>
          <span class="text-night/80">Uses <span class="font-semibold text-night">{{ numeric() ? 'multiplier % of the manager’s target' : 'criteria text the Panel rates against' }}</span></span>
        </div>

        <div class="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
          <section>
            <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 class="text-[15px] font-semibold text-navy">Bands</h2>
              @if (numeric()) { <button type="button" (click)="useDefaults()" class="text-xs font-semibold text-navy hover:underline">Reset to framework default</button> }
            </div>
            <div class="overflow-x-auto rounded-md border border-slate/25">
              <table class="w-full min-w-[440px] text-sm">
                <thead class="bg-label/60 text-left text-xs text-slate">
                  <tr>
                    <th class="w-16 py-2.5 pl-4 font-medium">Rating</th>
                    <th class="py-2.5 pr-3 font-medium">Label <span class="text-red-600">*</span></th>
                    @if (numeric()) { <th class="w-40 py-2.5 pr-4 font-medium">Multiplier % <span class="text-red-600">*</span></th> }
                    @else { <th class="py-2.5 pr-4 font-medium">Criteria <span class="text-red-600">*</span></th> }
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate/15">
                  @for (r of rows; track i; let i = $index) {
                    <tr class="align-top">
                      <td class="py-2.5 pl-4"><span class="grid size-7 place-items-center rounded-full text-xs font-bold" [class]="tone[5 - i]">{{ 5 - i }}</span></td>
                      <td class="py-2.5 pr-3">
                        <input #l [class]="small + ' ' + border(e()['label' + i])" [attr.aria-label]="'Rating ' + (5 - i) + ' label'" [attr.aria-invalid]="!!e()['label' + i]" [value]="r.label" (input)="r.label = l.value" />
                      </td>
                      @if (numeric()) {
                        <td class="py-2.5 pr-4">
                          @if (i < 4) {
                            <div class="flex">
                              <span class="flex items-center rounded-l border border-r-0 border-slate/40 bg-mist px-2.5 text-xs text-slate">≥</span>
                              <input #m inputmode="decimal" [class]="small + ' rounded-none tabular-nums ' + border(e()['mult' + i])" [attr.aria-label]="'Rating ' + (5 - i) + ' multiplier'"
                                [attr.aria-invalid]="!!e()['mult' + i]" [value]="r.mult" (input)="r.mult = m.value" />
                              <span class="flex items-center rounded-r border border-l-0 border-slate/40 bg-mist px-2.5 text-xs text-slate">%</span>
                            </div>
                          } @else {
                            <p class="py-2 text-xs text-slate">Below {{ rows[3].mult || '…' }}%</p>
                          }
                        </td>
                      } @else {
                        <td class="py-2.5 pr-4">
                          <input #c [class]="small + ' ' + border(e()['criteria' + i])" [attr.aria-label]="'Rating ' + (5 - i) + ' criteria'" [attr.aria-invalid]="!!e()['criteria' + i]"
                            [placeholder]="'e.g. ' + criteriaHint[i]" [value]="r.criteria" (input)="r.criteria = c.value" />
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (bandError()) { <p class="mt-2 text-xs text-red-600">{{ bandError() }}</p> }
          </section>

          <section class="rounded-md border border-slate/25 p-4">
            <h2 class="text-[15px] font-semibold text-navy">Preview</h2>
            @if (numeric()) {
              <label class="mt-2 flex items-center gap-2 text-xs text-slate">
                Sample target
                <input #st inputmode="numeric" class="h-8 w-32 rounded border border-slate/40 px-2 text-sm tabular-nums text-night outline-none focus:border-teal" [value]="sample.toLocaleString('en-US')"
                  (input)="sample = +st.value.replace(digitsOnly, '') || 0; st.value = sample.toLocaleString('en-US')" />
              </label>
            }
            <p class="mb-1 mt-2 text-xs text-slate">As managers and the Panel will see it:</p>
            <app-band-guide [o]="preview()" [target]="sample" />
          </section>
        </div>
      }

      <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
        @if (tried && hasErrors()) { <p role="alert" class="mr-auto text-sm text-red-600">Complete every band before saving.</p> }
        @else { <p class="mr-auto text-xs text-slate">One rating guide per MBO task. Next step: its framework example.</p> }
        <button type="button" [class]="secondary" [disabled]="saving" (click)="back()">Cancel</button>
        <button [class]="primary" [disabled]="saving || !task">{{ saving ? 'Saving…' : 'Save rating guide' }}</button>
      </div>
    </form>
  `,
})
export class MboRatingGuideFormComponent implements OnInit {
  @Input('role') set roleIn(v: string | undefined) { if (v) this.role = v as RoleId; } // ?role=
  @Input('no') set noIn(v: string | undefined) { if (v) this.no = +v; }              // ?no=

  private router = inject(Router);
  readonly panel = PANEL;
  readonly small = small;
  readonly border = border;
  readonly tall = tall;
  readonly primary = primary;
  readonly secondary = secondary;
  readonly tone = RATING_TONE;
  readonly typeLabel = TYPE_LABEL;
  readonly criteriaHint = CRITERIA_HINT;
  readonly digitsOnly = /\D/g;
  readonly roleOpts = (Object.keys(ROLE_TEMPLATES) as RoleId[]).map((k) => ({ value: k, label: ROLE_TEMPLATES[k].label }));

  role: RoleId = 'sales-rep';
  no = 0;
  task: Objective | null = null;
  rows: Row[] = [];
  sample = 0;
  loading = false;
  tried = false;
  saving = false;
  private req = 0;

  numeric = () => this.task!.kind === 'revenue' || this.task!.kind === 'count';
  unit = () => (this.task!.kind === 'count' ? ` · ${this.task!.unit}` : this.task!.kind === 'revenue' ? ` · ${this.task!.currency ?? 'HKD'}` : '');
  taskOpts = () => [{ value: '', label: 'Select MBO task…' }, ...ROLE_TEMPLATES[this.role].objectives.map((o, i) => ({ value: String(i + 1), label: `${i + 1}. ${o.title}` }))];

  /** The task with the bands as currently typed, for the live preview. */
  preview = (): Objective => {
    const valid = this.rows.slice(0, 4).every((r) => Number(r.mult) > 0);
    return {
      ...this.task!,
      ratingLabels: this.rows.map((r) => r.label || '—') as Objective['ratingLabels'],
      ...(this.numeric()
        ? { bands: valid ? this.rows.slice(0, 4).map((r) => Number(r.mult)) as Objective['bands'] : this.task!.bands }
        : { criteria: this.rows.map((r) => r.criteria || '—') as Objective['criteria'] }),
    };
  };

  ngOnInit() { if (this.no) this.load(); }

  pickRole(r: RoleId) { this.role = r; this.no = 0; this.task = null; this.tried = false; }
  pickTask(n: number) { this.no = n; this.tried = false; if (n) this.load(); else this.task = null; }

  async load() {
    const n = ++this.req;
    this.loading = true;
    this.task = null;
    const res = await getRatingGuide(this.role, this.no);
    if (n !== this.req) return;
    this.loading = false;
    if (!res) return;
    const g = res.guide;
    this.rows = g.labels.map((label, i) => ({ label, mult: i < 4 && g.bands ? String(g.bands[i]) : '', criteria: g.criteria?.[i] ?? '' }));
    this.sample = res.task.kind === 'revenue' ? 1_000_000 : 10;
    this.task = res.task;
  }

  useDefaults() {
    const d = BANDS[this.task!.kind as 'revenue' | 'count'];
    this.rows.forEach((r, i) => { r.label = RATING_LABELS[i]; if (i < 4) r.mult = String(d[i]); });
  }

  validate(): Errors {
    const e: Errors = {};
    if (!this.task) { e['task'] = 'Pick an MBO task.'; return e; }
    this.rows.forEach((r, i) => {
      if (!r.label.trim()) e['label' + i] = 'Required';
      if (this.numeric() && i < 4 && !(Number(r.mult) > 0)) e['mult' + i] = 'Required';
      if (!this.numeric() && !r.criteria.trim()) e['criteria' + i] = 'Required';
    });
    if (this.numeric() && this.rows.slice(0, 4).every((_, i) => !e['mult' + i])) {
      const m = this.rows.slice(0, 4).map((r) => Number(r.mult));
      if (m.some((v, i) => i > 0 && v >= m[i - 1])) e['bands'] = 'Multipliers must go down from rating 5 to rating 2 (e.g. 120, 110, 100, 85).';
    }
    return e;
  }
  e = (): Errors => (this.tried ? this.validate() : {});
  hasErrors = () => Object.keys(this.e()).length > 0;
  bandError = () => this.e()['bands'] ?? '';

  back() { this.router.navigate(['/bd/web/mbo/rating-guides'], { queryParams: { role: this.role } }); }

  async save() {
    this.tried = true;
    if (this.hasErrors()) {
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
      return;
    }
    const g: RatingGuide = {
      labels: this.rows.map((r) => r.label.trim()) as RatingGuide['labels'],
      ...(this.numeric()
        ? { bands: this.rows.slice(0, 4).map((r) => Number(r.mult)) as RatingGuide['bands'] }
        : { criteria: this.rows.map((r) => r.criteria.trim()) as RatingGuide['criteria'] }),
    };
    this.saving = true;
    await saveRatingGuide(this.role, this.no, g);
    this.back();
  }
}
