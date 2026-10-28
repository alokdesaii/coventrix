import { Component, Input, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { exampleOptions, isDefaultId, listGuides, ROLE_TEMPLATES, type ExampleOption, type GuideOption, type Objective, type RoleId } from '../../../api/mbo';
import { big } from '../../../shared/client-list.component';
import { ChipComponent } from '../../../shared/mbo';
import { ModalComponent, PageHeaderComponent, PANEL, SelectComponent } from '../../../shared/ui';
import { SetupViewComponent } from './setup-view.component';

type Row = { key: string; no: number; task: Objective; g: GuideOption; x: ExampleOption | null; firstOfTask: boolean; firstOfGuide: boolean; guideReady: boolean };

/** Step 3 of MBO setup: framework examples per rating guide (a guide can have several). */
@Component({
  selector: 'app-mbo-framework-examples',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, SelectComponent, ChipComponent, ModalComponent, SetupViewComponent],
  template: `
    <app-page-header title="Framework Examples">
      <a routerLink="/bd/web/mbo/framework-examples/edit" [queryParams]="{ role, example: 'new' }" class="flex h-9 items-center rounded bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/90">+ Add framework example</a>
    </app-page-header>

    <section [class]="panel">
      <div class="flex flex-wrap items-end justify-between gap-4 border-b border-slate/20 p-5">
        <div class="flex w-80 flex-col gap-1.5 text-xs font-medium text-slate">Role template
          <app-select [class]="big" label="Role template" [value]="role" (valueChange)="pickRole($event)" [options]="roleOpts" />
        </div>
        <p class="max-w-md text-xs text-slate xl:text-right">Step 3 of 3. Worked examples shown as "Framework example" on Assign and Objective Details. A guide can have several; MBO Mapping picks one per employee.</p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[960px] text-[13px]">
          <thead class="text-left text-xs text-slate">
            <tr>
              <th class="w-12 py-3 pl-5 pr-3 font-medium">No</th>
              <th class="px-3 py-3 font-medium">MBO task</th>
              <th class="px-3 py-3 font-medium">Rating guide</th>
              <th class="w-[34%] px-3 py-3 font-medium">Example</th>
              <th class="px-3 py-3 font-medium">Status</th>
              <th class="py-3 pl-3 pr-5"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="text-night">
            @if (!rows) {
              @for (i of [0, 1, 2]; track i) { <tr><td colspan="6" class="px-5 py-3.5"><div class="h-4 animate-pulse rounded bg-mist"></div></td></tr> }
            } @else if (rows.length === 0) {
              <tr><td colspan="6" class="px-5 py-12 text-center text-sm text-slate">No MBO tasks for this role yet. Add them on MBO Tasks first.</td></tr>
            } @else {
              @for (r of rows; track r.key) {
                <tr class="align-top hover:bg-mist/60" [class]="r.firstOfTask ? 'border-t border-slate/15' : ''">
                  <td class="py-3 pl-5 pr-3">@if (r.firstOfTask) { <span class="grid size-6 place-items-center rounded-full bg-navy text-xs font-semibold text-white">{{ r.no }}</span> }</td>
                  <td class="px-3 py-3">@if (r.firstOfTask) { <p class="font-semibold">{{ r.task.title }}</p> }</td>
                  <td class="px-3 py-3">
                    @if (r.firstOfGuide) {
                      <span class="font-medium" [class.text-navy]="!isDefault(r.g)">{{ r.g.name }}</span>
                      @if (!isDefault(r.g)) { <span class="ml-1.5 text-[11px] text-sky-800">Alternative</span> }
                    }
                  </td>
                  <td class="px-3 py-3 text-xs text-night/80">
                    @if (r.x) { <p class="font-semibold text-night">{{ r.x.name }}</p><p class="line-clamp-2">{{ oneLine(r.x) }}</p> } @else { — }
                  </td>
                  <td class="px-3 py-3">
                    @if (!r.guideReady) { <app-chip tone="bg-red-100 text-red-700">Rating guide needed</app-chip> }
                    @else { <app-chip [tone]="r.x ? 'bg-teal/10 text-[#00857d]' : 'bg-mist text-slate'">{{ r.x ? 'Set' : 'None' }}</app-chip> }
                  </td>
                  <!-- py-1.5: the h-8 buttons then centre on the first text line (rows are top-aligned) -->
                  <td class="whitespace-nowrap py-1.5 pl-3 pr-5 text-right">
                    @if (!r.guideReady) {
                      <a routerLink="/bd/web/mbo/rating-guides/edit" [queryParams]="{ role, no: r.no, guide: r.g.id }" class="inline-flex h-8 items-center rounded px-3 text-xs font-semibold text-navy hover:bg-mist">Set up rating guide</a>
                    } @else {
                      @if (r.x) { <button type="button" (click)="view = r" class="inline-flex h-8 items-center rounded px-3 text-xs font-semibold text-navy hover:bg-mist">View</button> }
                      <a routerLink="/bd/web/mbo/framework-examples/edit" [queryParams]="{ role, no: r.no, guide: r.g.id, example: r.x?.id ?? 'new' }"
                        class="inline-flex h-8 items-center rounded px-3 text-xs font-semibold text-navy hover:bg-mist">{{ r.x ? 'Edit' : 'Add' }}</a>
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </section>

    <app-modal [open]="!!view" [title]="view?.task?.title ?? ''" width="40rem" (closed)="view = null">
      @if (view; as v) {
        <app-setup-view [role]="role" [no]="v.no" [objective]="v.task" [guideId]="v.g.id" focus="example" editLabel="Edit example" (closed)="view = null"
          (edit)="view = null; router.navigate(['/bd/web/mbo/framework-examples/edit'], { queryParams: { role, no: v.no, guide: v.g.id, example: v.x?.id } })" />
      }
    </app-modal>
  `,
})
export class MboFrameworkExamplesComponent implements OnInit {
  @Input('role') set roleIn(v: string | undefined) { if (v) this.role = v as RoleId; } // ?role=

  readonly router = inject(Router);
  readonly panel = PANEL.replace('p-5', '');
  readonly big = big;
  readonly roleOpts = (Object.keys(ROLE_TEMPLATES) as RoleId[]).map((k) => ({ value: k, label: ROLE_TEMPLATES[k].label }));

  role: RoleId = 'sales-rep';
  rows: Row[] | null = null;
  view: Row | null = null;
  private req = 0;

  isDefault = (g: GuideOption) => isDefaultId(g.id);
  oneLine = (x: ExampleOption) => x.example.example.replace(/\s+/g, ' ');

  ngOnInit() { this.load(); }

  pickRole(r: RoleId) {
    this.role = r;
    this.router.navigate([], { queryParams: { role: r }, replaceUrl: true });
    this.load();
  }

  async load() {
    const n = ++this.req;
    this.rows = null;
    const tasks = await listGuides(this.role);
    if (n !== this.req) return;
    this.rows = tasks.flatMap((t) => t.options.flatMap((g, gi) => {
      const guideReady = !!(g.guide.bands || g.guide.criteria);
      const xs = exampleOptions(this.role, t.task, g.id);
      const list: (ExampleOption | null)[] = xs.length ? xs : [null];
      return list.map((x, xi) => ({ key: `${g.id}|${x?.id ?? 'none'}`, no: t.no, task: t.task, g, x, firstOfTask: gi === 0 && xi === 0, firstOfGuide: xi === 0, guideReady }));
    }));
  }
}
