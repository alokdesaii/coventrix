import { Component, Input, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { getExample, listTasks, ROLE_TEMPLATES, saveExample, type RoleId, type TaskRow } from '../../../api/mbo';
import { BandGuideComponent } from '../../../shared/mbo';
import { BackButtonComponent, LabelComponent, PageHeaderComponent, PANEL, SelectComponent } from '../../../shared/ui';
import { guideSummary } from './setup-shared';

const field = 'h-10 w-full rounded border bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20';
const area = 'w-full rounded border bg-white px-3 py-2 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20';
const border = (bad?: string) => (bad ? 'border-red-400' : 'border-slate/40');
const tall = '[&_select]:h-10 [&_select]:text-sm';
const primary = 'h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40';
const secondary = 'h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40';

/** Add or edit the worked example for one rating guide. Starts by picking the rating guide. */
@Component({
  selector: 'app-mbo-framework-example-form',
  standalone: true,
  imports: [PageHeaderComponent, BackButtonComponent, LabelComponent, SelectComponent, BandGuideComponent],
  template: `
    <app-page-header title="Framework Example">
      <app-back-button [href]="'/bd/web/mbo/framework-examples?role=' + role" to="Framework Examples" />
    </app-page-header>

    <form novalidate (submit)="$event.preventDefault(); save()" [class]="panel + ' flex flex-col gap-6'">
      <section class="grid gap-4 sm:grid-cols-2">
        <app-label text="Role template" [required]="true">
          <app-select [class]="tall" label="Role template" [value]="role" (valueChange)="pickRole($event)" [options]="roleOpts" />
        </app-label>
        <app-label text="Rating guide" [required]="true" [error]="e()['guide']">
          <app-select [class]="tall" label="Rating guide" [value]="no ? '' + no : ''" [invalid]="!!e()['guide']" (valueChange)="pickGuide(+$event)" [options]="guideOpts()" />
        </app-label>
      </section>

      @if (!row()) {
        <div class="rounded-md border border-dashed border-slate/40 px-5 py-12 text-center text-sm text-slate">Pick a rating guide to add its framework example.</div>
      } @else if (row()!.guide === 'missing') {
        <div class="rounded bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p class="font-semibold">This task has no rating guide yet</p>
          <p class="mt-1">Set up its rating guide first; the example explains how those bands work.</p>
          <button type="button" (click)="toGuide()" class="mt-2 font-semibold text-navy hover:underline">Set up rating guide →</button>
        </div>
      } @else {
        <div class="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:items-start">
          <section class="flex flex-col gap-4">
            <app-label text="Example text" [required]="true" [error]="e()['example']" hint="A worked example in numbers, one point per line.">
              <textarea #ex rows="5" [class]="area + ' ' + border(e()['example'])" [attr.aria-invalid]="!!e()['example']"
                placeholder="Example: Personal annual target = HKD 4m.&#10;• Rating 5: ≥ HKD 4.8m closed&#10;• Rating 3: HKD 4.0–4.36m&#10;• Rating 1: < HKD 3.4m"
                [value]="f.example" (input)="f.example = ex.value"></textarea>
            </app-label>
            <app-label text="Use case" hint="Who this applies to and how it's measured in practice.">
              <textarea #uc rows="2" [class]="area + ' border-slate/40'" placeholder="e.g. Individual contributor measured primarily on personal origination / closure under H&H HK identity."
                [value]="f.useCase" (input)="f.useCase = uc.value"></textarea>
            </app-label>
            <app-label text="Note">
              <input #nt [class]="field + ' border-slate/40'" placeholder="e.g. Highest weight. Personal outcome." [value]="f.note" (input)="f.note = nt.value" />
            </app-label>
          </section>

          <section class="flex flex-col gap-4">
            <div class="rounded-md border border-slate/25 p-4">
              <h2 class="text-[15px] font-semibold text-navy">Rating guide</h2>
              <p class="mb-1 mt-0.5 text-xs text-slate">{{ summary(row()!) }} · shown at a sample target of {{ sample().toLocaleString('en-US') }}</p>
              <app-band-guide [o]="row()!.objective" [target]="sample()" />
            </div>
            <div class="rounded-md border border-slate/25 p-4">
              <h2 class="mb-2 text-[15px] font-semibold text-navy">Preview</h2>
              <p class="mb-2 text-xs text-slate">As the expandable "Framework example" on Assign MBO Targets:</p>
              @if (f.example.trim()) {
                <div class="flex flex-col gap-1.5 rounded border border-slate/20 px-3 py-2 text-xs leading-relaxed">
                  <p class="whitespace-pre-line text-night/80">{{ f.example }}</p>
                  @if (f.useCase.trim()) { <p class="text-night/80"><span class="font-semibold">Use case:</span> {{ f.useCase }}</p> }
                  @if (f.note.trim()) { <p class="text-slate"><span class="font-semibold">Note:</span> {{ f.note }}</p> }
                </div>
              } @else {
                <p class="text-xs text-slate">Nothing to show yet.</p>
              }
            </div>
          </section>
        </div>
      }

      <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
        @if (tried && hasErrors()) { <p role="alert" class="mr-auto text-sm text-red-600">Complete the highlighted fields before saving.</p> }
        @else { <p class="mr-auto text-xs text-slate">One example per rating guide. It's optional, but helps managers set realistic targets.</p> }
        @if (existing) {
          <button type="button" [disabled]="saving" (click)="remove()" class="h-10 rounded border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40">Remove example</button>
        }
        <button type="button" [class]="secondary" [disabled]="saving" (click)="back()">Cancel</button>
        <button [class]="primary" [disabled]="saving || !row() || row()!.guide === 'missing'">{{ saving ? 'Saving…' : 'Save example' }}</button>
      </div>
    </form>
  `,
})
export class MboFrameworkExampleFormComponent implements OnInit {
  @Input('role') set roleIn(v: string | undefined) { if (v) this.role = v as RoleId; } // ?role=
  @Input('no') set noIn(v: string | undefined) { if (v) this.no = +v; }              // ?no=

  private router = inject(Router);
  readonly panel = PANEL;
  readonly field = field;
  readonly area = area;
  readonly border = border;
  readonly tall = tall;
  readonly primary = primary;
  readonly secondary = secondary;
  readonly summary = guideSummary;
  readonly roleOpts = (Object.keys(ROLE_TEMPLATES) as RoleId[]).map((k) => ({ value: k, label: ROLE_TEMPLATES[k].label }));

  role: RoleId = 'sales-rep';
  no = 0;
  tasks: TaskRow[] = [];
  existing = false;
  f = { example: '', useCase: '', note: '' };
  tried = false;
  saving = false;
  private req = 0;

  row = () => this.tasks.find((t) => t.no === this.no);
  sample = () => (this.row()?.objective.kind === 'revenue' ? 1_000_000 : 10);
  guideOpts = () => [{ value: '', label: 'Select rating guide…' }, ...this.tasks.map((t) => ({
    value: String(t.no), label: `${t.no}. ${t.objective.title}${t.guide === 'missing' ? ' (rating guide needed)' : ''}`,
  }))];

  ngOnInit() { this.loadTasks(); }

  async pickRole(r: RoleId) { this.role = r; this.no = 0; await this.loadTasks(); }
  pickGuide(n: number) { this.no = n; this.loadExample(); }

  async loadTasks() {
    this.tasks = await listTasks(this.role);
    this.loadExample();
  }

  async loadExample() {
    const n = ++this.req;
    this.tried = false;
    this.f = { example: '', useCase: '', note: '' };
    this.existing = false;
    if (!this.no) return;
    const x = await getExample(this.role, this.no);
    if (n !== this.req) return;
    this.existing = !!x;
    if (x) this.f = { example: x.example, useCase: x.useCase ?? '', note: x.note ?? '' };
  }

  validate() {
    const e: Partial<Record<string, string>> = {};
    if (!this.row()) e['guide'] = 'Pick a rating guide.';
    else if (!this.f.example.trim()) e['example'] = 'Write the example, or Cancel if this guide doesn’t need one.';
    return e;
  }
  e = () => (this.tried ? this.validate() : {});
  hasErrors = () => Object.keys(this.e()).length > 0;

  back() { this.router.navigate(['/bd/web/mbo/framework-examples'], { queryParams: { role: this.role } }); }
  toGuide() { this.router.navigate(['/bd/web/mbo/rating-guides/edit'], { queryParams: { role: this.role, no: this.no } }); }

  async save() {
    this.tried = true;
    if (this.hasErrors()) {
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
      return;
    }
    this.saving = true;
    await saveExample(this.role, this.no, { example: this.f.example.trim(), useCase: this.f.useCase.trim() || undefined, note: this.f.note.trim() });
    this.back();
  }

  async remove() {
    if (!confirm(`Remove the framework example for "${this.row()!.objective.title}"?`)) return;
    this.saving = true;
    await saveExample(this.role, this.no, null);
    this.back();
  }
}
