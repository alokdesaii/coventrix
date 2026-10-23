import { Component, Input, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { listTasks, ROLE_TEMPLATES, type RoleId, type TaskRow } from '../../../api/mbo';
import { FRAMEWORK_EXAMPLES } from '../../../lib/mbo-examples';
import { big } from '../../../shared/client-list.component';
import { ChipComponent } from '../../../shared/mbo';
import { ModalComponent, PageHeaderComponent, PANEL, SelectComponent } from '../../../shared/ui';
import { SetupViewComponent } from './setup-view.component';
import { guideSummary } from './setup-shared';

/** Step 3 of MBO setup: one framework example per rating guide. */
@Component({
  selector: 'app-mbo-framework-examples',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, SelectComponent, ChipComponent, ModalComponent, SetupViewComponent],
  template: `
    <app-page-header title="Framework Examples">
      <a routerLink="/bd/web/mbo/framework-examples/edit" [queryParams]="{ role }" class="flex h-9 items-center rounded bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/90">+ Add framework example</a>
    </app-page-header>

    <section [class]="panel">
      <div class="flex flex-wrap items-end gap-4 border-b border-slate/20 p-5">
        <div class="flex w-80 flex-col gap-1.5 text-xs font-medium text-slate">Role template
          <app-select [class]="big" label="Role template" [value]="role" (valueChange)="pickRole($event)" [options]="roleOpts" />
        </div>
        <p class="ml-auto max-w-md text-xs text-slate">Step 3 of 3. Each rating guide can have one worked example, shown as "Framework example" when managers assign targets and on Objective Details.</p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[880px] text-[13px]">
          <thead class="text-left text-xs text-slate">
            <tr>
              <th class="w-12 py-3 pl-5 pr-3 font-medium">No</th>
              <th class="px-3 py-3 font-medium">Rating guide</th>
              <th class="w-[38%] px-3 py-3 font-medium">Example</th>
              <th class="px-3 py-3 font-medium">Status</th>
              <th class="py-3 pl-3 pr-5"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate/15 border-t border-slate/15">
            @if (!rows) {
              @for (i of [0, 1, 2]; track i) { <tr><td colspan="5" class="px-5 py-3.5"><div class="h-4 animate-pulse rounded bg-mist"></div></td></tr> }
            } @else if (rows.length === 0) {
              <tr><td colspan="5" class="px-5 py-12 text-center text-sm text-slate">No MBO tasks for this role yet. Add them on MBO Tasks first.</td></tr>
            } @else {
              @for (r of rows; track r.objective.id) {
                <tr class="align-top text-night hover:bg-mist/60">
                  <td class="py-3 pl-5 pr-3"><span class="grid size-6 place-items-center rounded-full bg-navy text-xs font-semibold text-white">{{ r.no }}</span></td>
                  <td class="px-3 py-3">
                    <p class="font-semibold">{{ r.objective.title }}</p>
                    <p class="mt-0.5 text-xs text-slate">{{ summary(r) }}</p>
                  </td>
                  <td class="px-3 py-3 text-xs text-night/80"><p class="line-clamp-2">{{ example(r) || '—' }}</p></td>
                  <td class="px-3 py-3">
                    @if (r.guide === 'missing') { <app-chip tone="bg-red-100 text-red-700">Rating guide needed</app-chip> }
                    @else { <app-chip [tone]="r.hasExample ? 'bg-teal/10 text-[#00857d]' : 'bg-mist text-slate'">{{ r.hasExample ? 'Set' : 'None' }}</app-chip> }
                  </td>
                  <!-- py-1.5: the h-8 buttons then centre on the first text line (rows are top-aligned) -->
                  <td class="whitespace-nowrap py-1.5 pl-3 pr-5 text-right">
                    <button type="button" (click)="view = r" class="inline-flex h-8 items-center rounded px-3 text-xs font-semibold text-navy hover:bg-mist">View</button>
                    @if (r.guide === 'missing') {
                      <a routerLink="/bd/web/mbo/rating-guides/edit" [queryParams]="{ role, no: r.no }" class="inline-flex h-8 items-center whitespace-nowrap rounded px-3 text-xs font-semibold text-navy hover:bg-mist">Set up rating guide</a>
                    } @else {
                      <a routerLink="/bd/web/mbo/framework-examples/edit" [queryParams]="{ role, no: r.no }" class="inline-flex h-8 items-center whitespace-nowrap rounded px-3 text-xs font-semibold text-navy hover:bg-mist">{{ r.hasExample ? 'Edit' : 'Add' }}</a>
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </section>
    <app-modal [open]="!!view" [title]="view?.objective?.title ?? ''" width="40rem" (closed)="view = null">
      @if (view; as v) {
        <app-setup-view [role]="role" [row]="v" focus="example" editLabel="Edit example" (closed)="view = null" (edit)="view = null; router.navigate(['/bd/web/mbo/framework-examples/edit'], { queryParams: { role, no: v.no } })" />
      }
    </app-modal>
  `,
})
export class MboFrameworkExamplesComponent implements OnInit {
  @Input('role') set roleIn(v: string | undefined) { if (v) this.role = v as RoleId; } // ?role=

  readonly router = inject(Router);
  readonly panel = PANEL.replace('p-5', '');
  readonly big = big;
  readonly summary = guideSummary;
  readonly roleOpts = (Object.keys(ROLE_TEMPLATES) as RoleId[]).map((k) => ({ value: k, label: ROLE_TEMPLATES[k].label }));

  role: RoleId = 'sales-rep';
  rows: TaskRow[] | null = null;
  view: TaskRow | null = null;
  private req = 0;

  example = (r: TaskRow) => FRAMEWORK_EXAMPLES[this.role][r.objective.id]?.example.replace(/\s+/g, ' ');

  ngOnInit() { this.load(); }

  pickRole(r: RoleId) {
    this.role = r;
    this.router.navigate([], { queryParams: { role: r }, replaceUrl: true });
    this.load();
  }

  async load() {
    const n = ++this.req;
    this.rows = null;
    const rows = await listTasks(this.role);
    if (n === this.req) this.rows = rows;
  }
}
