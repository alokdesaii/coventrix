import { Component, Input, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { deleteTask, ROLE_TEMPLATES, saveTask, type Objective, type ObjectiveKind, type RoleId } from '../../../api/mbo';
import { BackButtonComponent, LabelComponent, PageHeaderComponent, PANEL, SelectComponent } from '../../../shared/ui';

type TargetType = 'Amount' | 'Count' | 'Commitment';
type Errors = Partial<Record<string, string>>;

const field = 'h-10 w-full rounded border bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-mist disabled:text-slate';
const area = 'w-full rounded border bg-white px-3 py-2 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20';
const border = (bad?: string) => (bad ? 'border-red-400' : 'border-slate/40');
const tall = '[&_select]:h-10 [&_select]:text-sm';
const primary = 'h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40';
const secondary = 'h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40';

const kindToType = (k: ObjectiveKind): TargetType => (k === 'revenue' ? 'Amount' : k === 'count' ? 'Count' : 'Commitment');
export const toCode = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

/** Add or edit one MBO task (objective definition). Rating guide and example are set on their own pages. */
@Component({
  selector: 'app-mbo-task-form',
  standalone: true,
  imports: [PageHeaderComponent, BackButtonComponent, LabelComponent, SelectComponent],
  template: `
    <app-page-header [title]="isNew ? 'Add MBO Task' : 'Edit MBO Task'">
      <app-back-button [href]="'/bd/web/mbo/tasks?role=' + role" to="MBO Tasks" />
    </app-page-header>

    @if (missing) {
      <div [class]="panel + ' py-14 text-center'">
        <p class="text-sm font-semibold text-night">This task doesn't exist</p>
        <p class="mt-1 text-sm text-slate">It may have been deleted. Go back to MBO Tasks to pick another.</p>
      </div>
    } @else {
      <form novalidate (submit)="$event.preventDefault(); save()" [class]="panel + ' flex flex-col gap-6'">
        <section class="grid gap-4 sm:grid-cols-2">
          <app-label text="Role template" [required]="true">
            <app-select [class]="tall" label="Role template" [value]="role" [disabled]="!isNew" (valueChange)="pickRole($event)" [options]="roleOpts" />
          </app-label>
          <app-label text="Objective no" [required]="true" [hint]="isNew ? 'Position in the role (1–5). Tasks after it move down one.' : 'Position in the role. Fixed once created.'">
            <app-select [class]="tall" label="Objective no" [value]="'' + no" [disabled]="!isNew" (valueChange)="no = +$event" [options]="noOpts()" />
          </app-label>
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
          <app-label text="Target type" [required]="true" [error]="e()['type']" [hint]="typeHint()">
            <app-select [class]="tall" label="Target type" [value]="f.type" [invalid]="!!e()['type']" (valueChange)="f.type = $event" [options]="typeOpts" />
          </app-label>
          @if (f.type === 'Amount') {
            <app-label text="Currency code" [required]="true" [error]="e()['currency']" hint="3-letter code">
              <input #cur maxlength="3" [class]="field + ' uppercase ' + border(e()['currency'])" [attr.aria-invalid]="!!e()['currency']" [value]="f.currency" (input)="f.currency = cur.value.toUpperCase()" />
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
        </section>

        <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
          @if (tried && hasErrors()) {
            <p role="alert" class="mr-auto text-sm text-red-600">Complete the highlighted fields before saving.</p>
          } @else {
            <p class="mr-auto text-xs text-slate">Role + objective no is unique. Next step: the task's rating guide.</p>
          }
          @if (!isNew) {
            <button type="button" [disabled]="saving" (click)="remove()" class="h-10 rounded border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40">Delete task</button>
          }
          <button type="button" [class]="secondary" [disabled]="saving" (click)="back()">Cancel</button>
          <button [class]="primary" [disabled]="saving">{{ saving ? 'Saving…' : isNew ? 'Save task' : 'Save changes' }}</button>
        </div>
      </form>
    }
  `,
})
export class MboTaskFormComponent implements OnInit {
  // Route: /tasks/new?role=  or  /tasks/:role/:no
  @Input('role') set roleIn(v: string | undefined) { if (v) this.role = v as RoleId; }
  @Input('no') set noIn(v: string | undefined) { if (v) { this.no = +v; this.isNew = false; } }

  private router = inject(Router);
  readonly panel = PANEL;
  readonly field = field;
  readonly area = area;
  readonly border = border;
  readonly tall = tall;
  readonly primary = primary;
  readonly secondary = secondary;
  readonly toCode = toCode;
  readonly roleOpts = (Object.keys(ROLE_TEMPLATES) as RoleId[]).map((k) => ({ value: k, label: ROLE_TEMPLATES[k].label }));
  readonly typeOpts = [
    { value: '', label: 'Select…' },
    { value: 'Amount', label: 'Amount (monetary value)' },
    { value: 'Count', label: 'Count (whole number)' },
    { value: 'Commitment', label: 'Commitment (verbal / behavioural)' },
  ];

  role: RoleId = 'sales-rep';
  no = 0;
  isNew = true;
  missing = false;
  existing: Objective | null = null;
  f = { code: '', title: '', description: '', weight: '', type: '' as TargetType | '', unit: '', currency: 'HKD', evidence: '' };
  tried = false;
  saving = false;

  list = () => ROLE_TEMPLATES[this.role].objectives;
  noOpts = () => (this.isNew
    ? Array.from({ length: Math.min(5, this.list().length + 1) }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))
    : [{ value: String(this.no), label: String(this.no) }]);
  totalAfter = () => +(this.list().reduce((s, o) => s + o.weight, 0) - (this.existing?.weight ?? 0) + (Number(this.f.weight) || 0)).toFixed(2);
  typeHint = () => (this.existing && kindToType(this.existing.kind) !== this.f.type && this.f.type
    ? 'Changing between numeric and Commitment clears the rating guide.' : '');

  ngOnInit() {
    if (this.isNew) {
      this.no = Math.min(5, this.list().length + 1);
      return;
    }
    const o = this.list()[this.no - 1];
    if (!o) { this.missing = true; return; }
    this.existing = o;
    this.f = {
      code: o.code ?? toCode(o.id), title: o.title, description: o.definition, weight: String(o.weight), type: kindToType(o.kind),
      unit: o.unit ?? '', currency: o.currency ?? 'HKD', evidence: o.evidence,
    };
  }

  pickRole(r: RoleId) {
    this.role = r;
    this.no = Math.min(5, this.list().length + 1);
  }

  validate(): Errors {
    const f = this.f, e: Errors = {};
    if (this.isNew && this.list().length >= 5) e['no'] = 'This role already has 5 tasks.';
    if (!toCode(f.code)) e['code'] = 'Objective code is required.';
    else if (this.list().some((o) => o !== this.existing && toCode(o.code ?? o.id) === toCode(f.code))) e['code'] = 'Another task in this role already uses this code.';
    if (!f.title.trim()) e['title'] = 'Objective title is required.';
    const w = Number(f.weight);
    if (!f.weight.trim() || !(w > 0) || w > 100) e['weight'] = 'Enter a weight between 0 and 100.';
    if (!f.type) e['type'] = 'Choose the target type.';
    if (f.type === 'Count' && !f.unit.trim()) e['unit'] = 'Enter the unit counted.';
    if (f.type === 'Amount' && !/^[A-Z]{3}$/.test(f.currency)) e['currency'] = 'Use a 3-letter code, e.g. HKD.';
    return e;
  }
  e = (): Errors => (this.tried ? this.validate() : {});
  hasErrors = () => Object.keys(this.e()).length > 0;

  back() { this.router.navigate(['/bd/web/mbo/tasks'], { queryParams: { role: this.role } }); }

  async save() {
    this.tried = true;
    if (this.hasErrors()) {
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
      return;
    }
    const f = this.f, type = f.type as TargetType, code = toCode(f.code);
    const kind: ObjectiveKind = type === 'Amount' ? 'revenue' : type === 'Count' ? 'count' : this.existing?.kind === 'leadership' ? 'leadership' : 'criteria';
    const def: Objective = {
      id: code.toLowerCase().replace(/_/g, '-'), kind, code, title: f.title.trim(), definition: f.description.trim(),
      weight: Number(f.weight), evidence: f.evidence.trim(),
      ...(type === 'Count' ? { unit: f.unit.trim() } : {}),
      ...(type === 'Amount' ? { currency: f.currency } : {}),
    };
    this.saving = true;
    await saveTask(this.role, this.no, def, this.isNew);
    this.back();
  }

  async remove() {
    if (!confirm(`Delete "${this.existing!.title}" from ${ROLE_TEMPLATES[this.role].label}? Its rating guide and example go too, and tasks after it move up one.`)) return;
    this.saving = true;
    await deleteTask(this.role, this.no);
    this.back();
  }
}
