import { Component, Input, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  deleteAltExample, exampleOptions, isDefaultId, listGuides, ROLE_TEMPLATES, saveAltExample, saveExample,
  type GuideOption, type Objective, type RoleId,
} from '../../../api/mbo';
import { BandGuideComponent } from '../../../shared/mbo';
import { BackButtonComponent, LabelComponent, PageHeaderComponent, PANEL, SelectComponent } from '../../../shared/ui';

const field = 'h-10 w-full rounded border bg-white px-3 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20';
const area = 'w-full rounded border bg-white px-3 py-2 text-sm text-night outline-none placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20';
const border = (bad?: string) => (bad ? 'border-red-400' : 'border-slate/40');
const tall = '[&_select]:h-10 [&_select]:text-sm';
const primary = 'h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40';
const secondary = 'h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40';

type GuideRef = { no: number; task: Objective; g: GuideOption };

/** Add or edit a framework example. Pick the rating guide first, then which of its examples (or a new one). */
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
          <app-select [class]="tall" label="Rating guide" [value]="sel ? key(sel) : ''" [invalid]="!!e()['guide']" (valueChange)="pickGuide($event)" [options]="guideOpts()" />
        </app-label>
        @if (sel && ready()) {
          <app-label text="Example" [required]="true" hint="A guide can have several examples; MBO Mapping picks one per employee.">
            <app-select [class]="tall" label="Example" [value]="exampleId" (valueChange)="pickExample($event)" [options]="exampleOpts()" />
          </app-label>
          @if (named()) {
            <app-label text="Example name" [required]="true" [error]="e()['name']" hint="e.g. New-market example">
              <input #xn [class]="field + ' ' + border(e()['name'])" [attr.aria-invalid]="!!e()['name']" [value]="name" (input)="name = xn.value" />
            </app-label>
          }
        }
      </section>

      @if (!sel) {
        <div class="rounded-md border border-dashed border-slate/40 px-5 py-12 text-center text-sm text-slate">Pick a rating guide to add or edit its framework example.</div>
      } @else if (!ready()) {
        <div class="rounded bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p class="font-semibold">This rating guide isn't set up yet</p>
          <p class="mt-1">Set up its bands first; the example explains how those bands work.</p>
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
              <textarea #uc rows="2" [class]="area + ' border-slate/40'" [value]="f.useCase" (input)="f.useCase = uc.value"></textarea>
            </app-label>
            <app-label text="Note">
              <input #nt [class]="field + ' border-slate/40'" placeholder="e.g. Highest weight. Personal outcome." [value]="f.note" (input)="f.note = nt.value" />
            </app-label>
          </section>

          <section class="flex flex-col gap-4">
            <div class="rounded-md border border-slate/25 p-4">
              <h2 class="text-[15px] font-semibold text-navy">Rating guide · {{ sel.g.name }}</h2>
              <p class="mb-1 mt-0.5 text-xs text-slate">Shown at a sample target of {{ sample().toLocaleString('en-US') }}</p>
              <app-band-guide [o]="withGuide()" [target]="sample()" />
            </div>
            <div class="rounded-md border border-slate/25 p-4">
              <h2 class="mb-2 text-[15px] font-semibold text-navy">Preview</h2>
              @if (f.example.trim()) {
                <div class="flex flex-col gap-1.5 rounded border border-slate/20 px-3 py-2 text-xs leading-relaxed">
                  <p class="whitespace-pre-line text-night/80">{{ f.example }}</p>
                  @if (f.useCase.trim()) { <p class="text-night/80"><span class="font-semibold">Use case:</span> {{ f.useCase }}</p> }
                  @if (f.note.trim()) { <p class="text-slate"><span class="font-semibold">Note:</span> {{ f.note }}</p> }
                </div>
              } @else { <p class="text-xs text-slate">Nothing to show yet.</p> }
            </div>
          </section>
        </div>
      }

      <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
        @if (tried && hasErrors()) { <p role="alert" class="mr-auto text-sm text-red-600">Complete the highlighted fields before saving.</p> }
        @else { <p class="mr-auto text-xs text-slate">Examples are optional, but help managers set realistic targets.</p> }
        @if (existing()) {
          <button type="button" [disabled]="saving" (click)="remove()" class="h-10 rounded border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40">Delete example</button>
        }
        <button type="button" [class]="secondary" [disabled]="saving" (click)="back()">Cancel</button>
        <button [class]="primary" [disabled]="saving || !sel || !ready()">{{ saving ? 'Saving…' : 'Save example' }}</button>
      </div>
    </form>
  `,
})
export class MboFrameworkExampleFormComponent implements OnInit {
  @Input('role') set roleIn(v: string | undefined) { if (v) this.role = v as RoleId; } // ?role=
  @Input('no') set noIn(v: string | undefined) { if (v) this.wantNo = +v; }            // ?no=
  @Input('guide') set guideIn(v: string | undefined) { this.wantGuide = v; }          // ?guide=
  @Input('example') set exampleIn(v: string | undefined) { if (v) this.exampleId = v; } // ?example= (id or 'new')

  private router = inject(Router);
  readonly panel = PANEL;
  readonly field = field;
  readonly area = area;
  readonly border = border;
  readonly tall = tall;
  readonly primary = primary;
  readonly secondary = secondary;
  readonly roleOpts = (Object.keys(ROLE_TEMPLATES) as RoleId[]).map((k) => ({ value: k, label: ROLE_TEMPLATES[k].label }));

  role: RoleId = 'sales-rep';
  guides: GuideRef[] = [];
  sel: GuideRef | null = null;
  exampleId = 'new';
  name = '';
  f = { example: '', useCase: '', note: '' };
  tried = false;
  saving = false;
  private wantNo = 0;
  private wantGuide?: string;

  key = (r: GuideRef) => `${r.no}|${r.g.id}`;
  guideOpts = () => [{ value: '', label: 'Select rating guide…' }, ...this.guides.map((r) => ({ value: this.key(r), label: `${r.no}. ${r.task.title} — ${r.g.name}` }))];
  ready = () => !!this.sel && !!(this.sel.g.guide.bands || this.sel.g.guide.criteria);
  examples = () => (this.sel ? exampleOptions(this.role, this.sel.task, this.sel.g.id) : []);
  exampleOpts = () => [...this.examples().map((x) => ({ value: x.id, label: x.name })), { value: 'new', label: '+ New example' }];
  existing = () => this.examples().some((x) => x.id === this.exampleId);
  /** The default guide's own example (stored with the task) has a fixed name; any further example is named. */
  primarySlot = () => !!this.sel && isDefaultId(this.sel.g.id) && (isDefaultId(this.exampleId) || (this.exampleId === 'new' && !this.examples().some((x) => isDefaultId(x.id))));
  named = () => !this.primarySlot();
  sample = () => (this.sel?.task.kind === 'revenue' ? 1_000_000 : 10);
  withGuide = (): Objective => {
    const g = this.sel!.g.guide;
    return { ...this.sel!.task, ratingLabels: g.labels, ...(g.bands ? { bands: g.bands } : { criteria: g.criteria }) };
  };

  async ngOnInit() {
    await this.loadGuides();
    const r = this.guides.find((x) => x.no === this.wantNo && (!this.wantGuide || x.g.id === this.wantGuide))
      ?? (this.wantNo ? this.guides.find((x) => x.no === this.wantNo) : undefined);
    if (r) this.select(r, this.exampleId);
  }

  async loadGuides() {
    const tasks = await listGuides(this.role);
    this.guides = tasks.flatMap((t) => t.options.map((g) => ({ no: t.no, task: t.task, g })));
  }

  async pickRole(r: RoleId) { this.role = r; this.sel = null; await this.loadGuides(); }
  pickGuide(k: string) { const r = this.guides.find((x) => this.key(x) === k) ?? null; if (r) this.select(r); else this.sel = null; }
  pickExample(id: string) { this.select(this.sel!, id); }

  /** Selects a guide and loads one of its examples into the form (first existing one by default). */
  select(r: GuideRef, exampleId?: string) {
    this.sel = r;
    this.tried = false;
    const xs = this.examples();
    this.exampleId = exampleId && (exampleId === 'new' || xs.some((x) => x.id === exampleId)) ? exampleId : xs[0]?.id ?? 'new';
    const x = xs.find((e) => e.id === this.exampleId);
    this.name = x && !isDefaultId(x.id) ? x.name : '';
    this.f = x ? { example: x.example.example, useCase: x.example.useCase ?? '', note: x.example.note ?? '' } : { example: '', useCase: '', note: '' };
  }

  validate() {
    const e: Partial<Record<string, string>> = {};
    if (!this.sel) { e['guide'] = 'Pick a rating guide.'; return e; }
    if (this.named()) {
      const n = this.name.trim().toLowerCase();
      if (!n) e['name'] = 'Name the example.';
      else if (this.examples().some((x) => x.id !== this.exampleId && x.name.toLowerCase() === n)) e['name'] = 'This guide already has an example with that name.';
    }
    if (!this.f.example.trim()) e['example'] = 'Write the example, or Cancel if this guide doesn’t need one.';
    return e;
  }
  e = () => (this.tried ? this.validate() : {});
  hasErrors = () => Object.keys(this.e()).length > 0;

  back() { this.router.navigate(['/bd/web/mbo/framework-examples'], { queryParams: { role: this.role } }); }
  toGuide() { this.router.navigate(['/bd/web/mbo/rating-guides/edit'], { queryParams: { role: this.role, no: this.sel!.no, guide: this.sel!.g.id } }); }

  async save() {
    this.tried = true;
    if (this.hasErrors()) {
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
      return;
    }
    const example = { example: this.f.example.trim(), useCase: this.f.useCase.trim() || undefined, note: this.f.note.trim() };
    this.saving = true;
    if (this.primarySlot()) await saveExample(this.role, this.sel!.no, example);
    else await saveAltExample({ id: this.exampleId === 'new' ? undefined : this.exampleId, guideId: this.sel!.g.id, name: this.name.trim(), example });
    this.back();
  }

  async remove() {
    const x = this.examples().find((e) => e.id === this.exampleId)!;
    if (!confirm(`Delete the "${x.name}" example? Employees mapped to it will have no example.`)) return;
    this.saving = true;
    if (isDefaultId(x.id)) await saveExample(this.role, this.sel!.no, null);
    else await deleteAltExample(x.id);
    this.back();
  }
}
