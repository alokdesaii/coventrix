import { Component, OnInit } from '@angular/core';
import {
  BANDS, getFrameworkTask, RATING_LABELS, ROLE_TEMPLATES, saveFrameworkTask,
  type Objective, type ObjectiveKind, type RoleId,
} from '../../api/mbo';
import { BackButtonComponent, LabelComponent, PageHeaderComponent, PANEL, SelectComponent } from '../../shared/ui';

type TargetType = 'Amount' | 'Count' | 'Commitment';
type Errors = Partial<Record<string, string>>;
type Band = { label: string; mult: string; criteria: string }; // mult/criteria as typed; rating 1 has no multiplier

const field = 'h-10 w-full rounded border bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-mist disabled:text-slate';
const small = 'h-9 w-full rounded border bg-white px-2.5 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-mist disabled:text-slate';
const area = 'w-full rounded border bg-white px-3 py-2 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20';
const border = (bad?: string) => (bad ? 'border-red-400' : 'border-slate/40');
const tall = '[&_select]:h-10 [&_select]:text-sm';
const primary = 'h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40';
const secondary = 'h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40';
const RATING_TONE = ['', 'bg-red-100 text-red-700', 'bg-amber-100 text-amber-800', 'bg-label text-navy', 'bg-sky-100 text-sky-800', 'bg-teal/15 text-[#00857d]'];

const kindToType = (k: ObjectiveKind): TargetType => (k === 'revenue' ? 'Amount' : k === 'count' ? 'Count' : 'Commitment');
const defaultMults = (t: TargetType) => (t === 'Commitment' ? ['', '', '', ''] : BANDS[t === 'Amount' ? 'revenue' : 'count'].map(String));
const toCode = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
const blankBands = (t: TargetType): Band[] => RATING_LABELS.map((label, i) => ({ label, mult: i < 4 ? defaultMults(t)[i] : '', criteria: '' }));

const emptyForm = () => ({
  code: '', title: '', description: '', weight: '', type: '' as TargetType | '', unit: '', currency: 'HKD', evidence: '',
  bands: blankBands('Amount'), example: '', useCase: '', note: '',
});

@Component({
  selector: 'app-mbo-framework',
  standalone: true,
  imports: [PageHeaderComponent, BackButtonComponent, LabelComponent, SelectComponent],
  template: `
    <app-page-header title="MBO Framework">
      <app-back-button href="/bd/web/mbo/assign" to="Assign MBO Targets" />
    </app-page-header>

    <div class="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)] xl:items-start">
      <!-- Role's current objectives: pick one to edit, or an empty slot to add -->
      <nav aria-label="Framework objectives" class="rounded-md border border-slate/20 bg-white">
        <div class="border-b border-slate/20 p-4">
          <p class="mb-1.5 text-xs font-medium text-slate">Role template</p>
          <app-select [class]="tall" label="Role template" [value]="role" (valueChange)="pickRole($event)" [options]="roleOpts" />
        </div>
        <ul class="divide-y divide-slate/15">
          @for (n of [1, 2, 3, 4, 5]; track n) {
            <li>
              <button type="button" (click)="pickNo(n)" [attr.aria-current]="n === no ? 'true' : null"
                class="flex w-full items-start gap-3 px-4 py-3 text-left transition" [class]="n === no ? 'bg-label/60' : 'hover:bg-mist'">
                <span class="grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold"
                  [class]="objectives()[n - 1] ? 'bg-navy text-white' : 'border border-dashed border-slate/60 text-slate'">{{ n }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold" [class]="objectives()[n - 1] ? 'text-night' : 'text-slate'">{{ objectives()[n - 1]?.title ?? 'Empty — add objective' }}</span>
                  @if (objectives()[n - 1]; as o) { <span class="block text-xs text-slate">{{ typeOf(o) }} · {{ o.weight }}%</span> }
                </span>
              </button>
            </li>
          }
        </ul>
        <div class="flex items-center justify-between border-t border-slate/20 px-4 py-3 text-xs">
          <span class="text-slate">Total weight</span>
          <span class="font-semibold tabular-nums" [class]="savedTotal() === 100 ? 'text-[#00857d]' : 'text-amber-700'">{{ savedTotal() }}%</span>
        </div>
      </nav>

      <form novalidate (submit)="$event.preventDefault(); save()" [class]="panel + ' flex flex-col gap-6'">
        <div class="flex gap-2.5 rounded bg-teal/10 px-4 py-3 text-sm text-navy">
          <svg viewBox="0 0 24 24" class="mt-0.5 size-4 shrink-0 text-teal" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
          <span>
            {{ existing ? 'Editing objective ' + no + ' of the ' + roleLabel() + ' framework.' : 'Adding objective ' + no + ' to the ' + roleLabel() + ' framework.' }}
            All 5 rating bands are required: <strong>Amount / Count</strong> objectives use the multiplier %, <strong>Commitment</strong> objectives use the criteria text.
          </span>
        </div>

        @if (loading) {
          <div class="h-96 animate-pulse rounded-md bg-mist"></div>
        } @else {
          <!-- 1 · Task / objective definition -->
          <section class="overflow-hidden rounded-md border border-slate/25">
            <header class="flex items-center gap-3 border-b border-slate/20 bg-label/60 px-5 py-3">
              <span class="grid size-7 place-items-center rounded-full bg-navy text-xs font-semibold text-white">1</span>
              <h2 class="text-[15px] font-semibold text-navy">Task / Objective Definition</h2>
            </header>
            <div class="grid gap-4 p-5 sm:grid-cols-2">
              <app-label text="Objective code" [required]="true" [error]="e()['code']" hint="e.g. PERSONAL_REVENUE">
                <input #c [class]="field + ' uppercase ' + border(e()['code'])" [attr.aria-invalid]="!!e()['code']" placeholder="PERSONAL_REVENUE"
                  [value]="f.code" (input)="f.code = c.value" (blur)="f.code = toCode(f.code); c.value = f.code" />
              </app-label>
              <app-label text="Weight %" [required]="true" [error]="e()['weight']" [hint]="'Fixed by the framework · role total after saving: ' + totalAfter() + '%'">
                <div class="flex">
                  <input #w inputmode="decimal" [class]="field + ' rounded-r-none tabular-nums ' + border(e()['weight'])" [attr.aria-invalid]="!!e()['weight']" placeholder="e.g. 45"
                    [value]="f.weight" (input)="f.weight = w.value" />
                  <span class="flex items-center rounded-r border border-l-0 border-slate/40 bg-mist px-3 text-sm text-slate">%</span>
                </div>
              </app-label>
              <div class="sm:col-span-2">
                <app-label text="Objective title" [required]="true" [error]="e()['title']">
                  <input #t [class]="field + ' ' + border(e()['title'])" [attr.aria-invalid]="!!e()['title']" placeholder="e.g. Personal gross revenue / fee income"
                    [value]="f.title" (input)="f.title = t.value" (blur)="f.code || (f.code = toCode(f.title))" />
                </app-label>
              </div>
              <div class="sm:col-span-2">
                <app-label text="Description" hint="What this objective measures. Shown under the title on Assign and My MBO.">
                  <textarea #d rows="2" [class]="area + ' border-slate/40'" [value]="f.description" (input)="f.description = d.value"></textarea>
                </app-label>
              </div>
              <app-label text="Target type" [required]="true" [error]="e()['type']">
                <app-select [class]="tall" label="Target type" [value]="f.type" [invalid]="!!e()['type']" (valueChange)="setType($event)" [options]="typeOpts" />
              </app-label>
              @if (f.type === 'Amount') {
                <app-label text="Currency code" [required]="true" [error]="e()['currency']" hint="3-letter code">
                  <input #cur maxlength="3" [class]="field + ' uppercase ' + border(e()['currency'])" [value]="f.currency" (input)="f.currency = cur.value.toUpperCase()" />
                </app-label>
              } @else if (f.type === 'Count') {
                <app-label text="Target unit" [required]="true" [error]="e()['unit']" hint="Plural, e.g. partners, opportunities">
                  <input #u [class]="field + ' ' + border(e()['unit'])" [attr.aria-invalid]="!!e()['unit']" placeholder="e.g. opportunities" [value]="f.unit" (input)="f.unit = u.value" />
                </app-label>
              } @else { <div></div> }
              <div class="sm:col-span-2">
                <app-label text="Evidence expected">
                  <textarea #ev rows="2" [class]="area + ' border-slate/40'" placeholder="e.g. Closed revenue register, origination / closure log and fee-income reconciliation."
                    [value]="f.evidence" (input)="f.evidence = ev.value"></textarea>
                </app-label>
              </div>
            </div>
          </section>

          <!-- 2 · Rating guide -->
          <section class="overflow-hidden rounded-md border border-slate/25">
            <header class="flex items-center gap-3 border-b border-slate/20 bg-label/60 px-5 py-3">
              <span class="grid size-7 place-items-center rounded-full bg-navy text-xs font-semibold text-white">2</span>
              <h2 class="text-[15px] font-semibold text-navy">Rating Guide</h2>
            </header>
            <div class="p-5">
              <p class="mb-4 text-xs leading-relaxed text-night/70">
                Multiplier % is the lowest attainment for each rating, e.g. 120 = at least 120% of the manager's target. Below rating 2's multiplier is rating 1.
                Criteria is the description the Panel rates Commitment objectives against.
              </p>
              <div class="overflow-x-auto">
                <table class="w-full min-w-[640px] text-sm">
                  <thead class="text-left text-xs text-slate">
                    <tr>
                      <th class="w-14 pb-2 font-medium">Rating</th>
                      <th class="w-52 pb-2 pr-3 font-medium">Label <span class="text-red-600">*</span></th>
                      <th class="w-36 pb-2 pr-3 font-medium">Multiplier % <span class="font-normal">(Amount / Count)</span></th>
                      <th class="pb-2 font-medium">Criteria <span class="font-normal">(Commitment)</span></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate/15 border-t border-slate/15">
                    @for (b of f.bands; track i; let i = $index) {
                      <tr class="align-top">
                        <td class="py-2.5"><span class="grid size-7 place-items-center rounded-full text-xs font-bold" [class]="tone[5 - i]">{{ 5 - i }}</span></td>
                        <td class="py-2.5 pr-3">
                          <input #bl [class]="small + ' ' + border(e()['label' + i])" [attr.aria-label]="'Rating ' + (5 - i) + ' label'" [attr.aria-invalid]="!!e()['label' + i]"
                            [value]="b.label" (input)="b.label = bl.value" />
                        </td>
                        <td class="py-2.5 pr-3">
                          <div class="flex">
                            <input #bm inputmode="decimal" [disabled]="i === 4 || !numericType()" [class]="small + ' rounded-r-none tabular-nums ' + border(e()['mult' + i])"
                              [attr.aria-label]="'Rating ' + (5 - i) + ' multiplier'" [attr.aria-invalid]="!!e()['mult' + i]"
                              [placeholder]="i === 4 ? 'Below ' + (f.bands[3].mult || '…') : '—'" [value]="i === 4 ? '' : b.mult" (input)="b.mult = bm.value" />
                            <span class="flex items-center rounded-r border border-l-0 border-slate/40 bg-mist px-2.5 text-xs text-slate">%</span>
                          </div>
                        </td>
                        <td class="py-2.5">
                          <input #bc [disabled]="numericType()" [class]="small + ' ' + border(e()['criteria' + i])" [attr.aria-label]="'Rating ' + (5 - i) + ' criteria'"
                            [attr.aria-invalid]="!!e()['criteria' + i]" [placeholder]="numericType() ? 'Not used for Amount / Count' : 'e.g. ' + criteriaHint[i]"
                            [value]="b.criteria" (input)="b.criteria = bc.value" />
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              @if (bandError()) { <p class="mt-2 text-xs text-red-600">{{ bandError() }}</p> }
            </div>
          </section>

          <!-- 3 · Framework example -->
          <section class="overflow-hidden rounded-md border border-slate/25">
            <header class="flex items-center gap-3 border-b border-slate/20 bg-label/60 px-5 py-3">
              <span class="grid size-7 place-items-center rounded-full bg-navy text-xs font-semibold text-white">3</span>
              <h2 class="text-[15px] font-semibold text-navy">Framework Example <span class="text-xs font-normal text-slate">(optional)</span></h2>
            </header>
            <div class="flex flex-col gap-4 p-5">
              <p class="text-xs text-night/70">Shown as the expandable "Framework example" on each objective when a manager assigns targets, and on Objective Details.</p>
              <app-label text="Example text">
                <textarea #ex rows="3" [class]="area + ' border-slate/40'" placeholder="e.g. Personal annual target = HKD 4m. Rating 5: ≥ HKD 4.8m closed. Rating 3: HKD 4.0–4.36m. Rating 1: < HKD 3.4m."
                  [value]="f.example" (input)="f.example = ex.value"></textarea>
              </app-label>
              <app-label text="Use case">
                <textarea #uc rows="2" [class]="area + ' border-slate/40'" placeholder="e.g. Individual contributor measured primarily on personal origination / closure under H&H HK identity."
                  [value]="f.useCase" (input)="f.useCase = uc.value"></textarea>
              </app-label>
              <app-label text="Note">
                <input #nt [class]="field + ' border-slate/40'" placeholder="e.g. Highest weight. Personal outcome." [value]="f.note" (input)="f.note = nt.value" />
              </app-label>
            </div>
          </section>

          <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
            @if (notice) {
              <p role="status" class="mr-auto text-sm text-[#00857d]">{{ notice }}</p>
            } @else if (tried && hasErrors()) {
              <p role="alert" class="mr-auto text-sm text-red-600">Complete the highlighted fields before saving.</p>
            } @else {
              <p class="mr-auto text-xs text-slate">Role template + objective number is unique: saving objective {{ no }} replaces what's there. Assigned targets keep pointing at it.</p>
            }
            <button type="button" [class]="secondary" [disabled]="saving" (click)="load()">Reset</button>
            <button [class]="primary" [disabled]="saving">{{ saving ? 'Saving…' : existing ? 'Save changes' : 'Save task' }}</button>
          </div>
        }
      </form>
    </div>
  `,
})
export class MboFrameworkComponent implements OnInit {
  readonly panel = PANEL;
  readonly field = field;
  readonly small = small;
  readonly area = area;
  readonly border = border;
  readonly tall = tall;
  readonly primary = primary;
  readonly secondary = secondary;
  readonly tone = RATING_TONE;
  readonly toCode = toCode;
  readonly roleOpts = (Object.keys(ROLE_TEMPLATES) as RoleId[]).map((k) => ({ value: k, label: ROLE_TEMPLATES[k].label }));
  readonly typeOpts = [
    { value: '', label: 'Select…' },
    { value: 'Amount', label: 'Amount (monetary value)' },
    { value: 'Count', label: 'Count (whole number)' },
    { value: 'Commitment', label: 'Commitment (verbal / behavioural)' },
  ];
  readonly criteriaHint = ['100% timely + proactive + clean reporting', '100% timely + clean reporting', 'All required escalations within SLA', '1 late escalation or incomplete reporting', '≥2 late or any unflagged material issue'];

  role: RoleId = 'sales-rep';
  no = 1;
  f = emptyForm();
  existing: Objective | null = null;
  loading = true;
  tried = false;
  saving = false;
  notice = '';
  private req = 0;

  objectives = () => ROLE_TEMPLATES[this.role].objectives;
  roleLabel = () => ROLE_TEMPLATES[this.role].label;
  typeOf = (o: Objective) => kindToType(o.kind);
  numericType = () => this.f.type === 'Amount' || this.f.type === 'Count';
  savedTotal = () => this.objectives().reduce((s, o) => s + o.weight, 0);
  totalAfter = () => {
    const w = Number(this.f.weight) || 0;
    return +(this.savedTotal() - (this.existing?.weight ?? 0) + w).toFixed(2);
  };

  ngOnInit() { this.load(); }

  pickRole(r: RoleId) { this.role = r; this.no = 1; this.load(); }
  pickNo(n: number) { this.no = n; this.load(); }

  /** Loads the objective at role + number into the form, or a blank form for an empty slot. */
  async load() {
    const n = ++this.req;
    this.loading = true;
    this.tried = false;
    this.notice = '';
    const t = await getFrameworkTask(this.role, this.no);
    if (n !== this.req) return;
    this.existing = t?.objective ?? null;
    if (!t) {
      this.f = emptyForm();
    } else {
      const o = t.objective, type = kindToType(o.kind);
      const mults = (o.bands ?? (type === 'Commitment' ? null : BANDS[o.kind as 'revenue' | 'count']))?.map(String) ?? defaultMults(type);
      this.f = {
        code: o.code ?? toCode(o.id), title: o.title, description: o.definition, weight: String(o.weight), type,
        unit: o.unit ?? '', currency: o.currency ?? 'HKD', evidence: o.evidence,
        bands: (o.ratingLabels ?? RATING_LABELS).map((label, i) => ({ label, mult: i < 4 ? mults[i] ?? '' : '', criteria: o.criteria?.[i] ?? '' })),
        example: t.example?.example ?? '', useCase: t.example?.useCase ?? '', note: t.example?.note ?? '',
      };
    }
    this.loading = false;
  }

  setType(t: TargetType | '') {
    const prev = this.f.type;
    this.f.type = t;
    // Swap in the framework's default multipliers when they're still the previous type's defaults.
    if (t && prev !== t && this.f.bands.slice(0, 4).every((b, i) => b.mult === (prev ? defaultMults(prev)[i] : defaultMults('Amount')[i]) || !b.mult)) {
      const d = defaultMults(t);
      this.f.bands.forEach((b, i) => { if (i < 4) b.mult = d[i]; });
    }
  }

  validate(): Errors {
    const f = this.f, e: Errors = {};
    if (!toCode(f.code)) e['code'] = 'Objective code is required.';
    else if (this.objectives().some((o, i) => i !== this.no - 1 && toCode(o.code ?? o.id) === toCode(f.code))) e['code'] = 'Another objective in this role already uses this code.';
    if (!f.title.trim()) e['title'] = 'Objective title is required.';
    const w = Number(f.weight);
    if (!f.weight.trim() || !(w > 0) || w > 100) e['weight'] = 'Enter a weight between 0 and 100.';
    if (!f.type) e['type'] = 'Choose the target type.';
    if (f.type === 'Count' && !f.unit.trim()) e['unit'] = 'Enter the unit counted.';
    if (f.type === 'Amount' && !/^[A-Z]{3}$/.test(f.currency)) e['currency'] = 'Use a 3-letter code, e.g. HKD.';
    f.bands.forEach((b, i) => {
      if (!b.label.trim()) e['label' + i] = 'Required';
      if (this.numericType() && i < 4 && !(Number(b.mult) > 0)) e['mult' + i] = 'Required';
      if (f.type === 'Commitment' && !b.criteria.trim()) e['criteria' + i] = 'Required';
    });
    if (this.numericType() && f.bands.slice(0, 4).every((_, i) => !e['mult' + i])) {
      const m = f.bands.slice(0, 4).map((b) => Number(b.mult));
      if (m.some((v, i) => i > 0 && v >= m[i - 1])) e['bands'] = 'Multipliers must go down from rating 5 to rating 2 (e.g. 120, 110, 100, 85).';
    }
    return e;
  }
  e = (): Errors => (this.tried ? this.validate() : {});
  hasErrors = () => Object.keys(this.e()).length > 0;
  bandError = () => {
    const e = this.e();
    if (e['bands']) return e['bands'];
    return Object.keys(e).some((k) => /^(label|mult|criteria)\d$/.test(k)) ? 'Complete every rating band.' : '';
  };

  async save() {
    this.tried = true;
    this.notice = '';
    if (this.hasErrors()) {
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
      return;
    }
    const f = this.f, type = f.type as TargetType, keep = this.existing;
    const kind: ObjectiveKind = type === 'Amount' ? 'revenue' : type === 'Count' ? 'count' : keep?.kind === 'leadership' ? 'leadership' : 'criteria';
    const code = toCode(f.code);
    const objective: Objective = {
      id: keep?.id ?? code.toLowerCase().replace(/_/g, '-'),
      kind, code, title: f.title.trim(), definition: f.description.trim(), weight: Number(f.weight), evidence: f.evidence.trim(),
      ratingLabels: f.bands.map((b) => b.label.trim()) as Objective['ratingLabels'],
      ...(type === 'Count' ? { unit: f.unit.trim() } : {}),
      ...(type === 'Amount' ? { currency: f.currency } : {}),
      ...(type !== 'Commitment'
        ? { bands: f.bands.slice(0, 4).map((b) => Number(b.mult)) as Objective['bands'] }
        : { criteria: f.bands.map((b) => b.criteria.trim()) as Objective['criteria'] }),
    };
    const example = f.example.trim() ? { example: f.example.trim(), useCase: f.useCase.trim() || undefined, note: f.note.trim() } : null;
    this.saving = true;
    await saveFrameworkTask({ role: this.role, no: this.no, objective, example });
    this.saving = false;
    const total = this.savedTotal();
    this.existing = objective;
    this.tried = false;
    this.notice = `Objective ${this.no} saved to the ${this.roleLabel()} framework.` + (total === 100 ? '' : ` Role weights now total ${total}% — adjust to reach 100%.`);
  }
}
