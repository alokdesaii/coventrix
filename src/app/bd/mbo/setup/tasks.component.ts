import { Component, Input, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { listTasks, ROLE_TEMPLATES, type RoleId, type TaskRow } from '../../../api/mbo';
import { big } from '../../../shared/client-list.component';
import { ChipComponent } from '../../../shared/mbo';
import { ModalComponent, PageHeaderComponent, PANEL, SelectComponent } from '../../../shared/ui';
import { SetupViewComponent } from './setup-view.component';
import { TYPE_LABEL } from './setup-shared';

const GUIDE = {
  custom: { label: 'Set', tone: 'bg-teal/10 text-[#00857d]' },
  default: { label: 'Framework default', tone: 'bg-label text-navy' },
  missing: { label: 'Missing', tone: 'bg-red-100 text-red-700' },
};

/** Step 1 of MBO setup: each role's objectives (tasks). Rating guides and examples hang off these. */
@Component({
  selector: 'app-mbo-tasks',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, SelectComponent, ChipComponent, ModalComponent, SetupViewComponent],
  template: `
    <app-page-header title="MBO Tasks">
      @if (full()) {
        <!-- Always shown so it's findable; a role holds at most 5 tasks (objective no 1–5). -->
        <span aria-disabled="true" title="This role already has 5 tasks. Delete one to add another."
          class="flex h-9 cursor-not-allowed items-center rounded bg-navy/40 px-4 text-sm font-semibold text-white">+ Add MBO task</span>
      } @else {
        <a routerLink="/bd/web/mbo/tasks/new" [queryParams]="{ role }" class="flex h-9 items-center rounded bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/90">+ Add MBO task</a>
      }
    </app-page-header>

    <section [class]="panel">
      <div class="flex flex-col gap-4 border-b border-slate/20 p-5">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div class="flex w-80 flex-col gap-1.5 text-xs font-medium text-slate">Role template
            <app-select [class]="big" label="Role template" [value]="role" (valueChange)="pickRole($event)" [options]="roleOpts" />
          </div>
          <p class="max-w-md text-xs text-slate xl:text-right">Step 1 of 3. Each role has up to 5 tasks with fixed weights. Next: a rating guide per task, then a framework example per rating guide.</p>
        </div>
        @if (full()) {
          <p class="flex items-center gap-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <svg viewBox="0 0 24 24" class="size-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            {{ roleLabel() }} has 5 tasks, the framework maximum. Delete one to add another, or edit an existing one.
          </p>
        }
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[880px] text-[13px]">
          <thead class="text-left text-xs text-slate">
            <tr>
              <th class="w-12 py-3 pl-5 pr-3 font-medium">No</th>
              <th class="px-3 py-3 font-medium">Task</th>
              <th class="px-3 py-3 font-medium">Type</th>
              <th class="px-3 py-3 text-right font-medium">Weight</th>
              <th class="px-3 py-3 font-medium">Rating guide</th>
              <th class="px-3 py-3 font-medium">Framework example</th>
              <th class="py-3 pl-3 pr-5"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate/15 border-t border-slate/15">
            @if (!rows) {
              @for (i of [0, 1, 2]; track i) { <tr><td colspan="7" class="px-5 py-3.5"><div class="h-4 animate-pulse rounded bg-mist"></div></td></tr> }
            } @else if (rows.length === 0) {
              <tr><td colspan="7" class="px-5 py-12 text-center text-sm text-slate">No tasks for this role yet.</td></tr>
            } @else {
              @for (r of rows; track r.objective.id) {
                <tr class="text-night hover:bg-mist/60">
                  <td class="py-3 pl-5 pr-3"><span class="grid size-6 place-items-center rounded-full bg-navy text-xs font-semibold text-white">{{ r.no }}</span></td>
                  <td class="px-3 py-3">
                    <p class="font-semibold">{{ r.objective.title }}</p>
                    <p class="mt-0.5 font-mono text-[11px] text-slate">{{ code(r) }}</p>
                  </td>
                  <td class="whitespace-nowrap px-3 py-3">{{ typeLabel[r.objective.kind] }}{{ unit(r) }}</td>
                  <td class="px-3 py-3 text-right font-semibold tabular-nums text-navy">{{ r.objective.weight }}%</td>
                  <td class="px-3 py-3"><app-chip [tone]="guide[r.guide].tone">{{ guide[r.guide].label }}</app-chip></td>
                  <td class="px-3 py-3"><app-chip [tone]="r.hasExample ? 'bg-teal/10 text-[#00857d]' : 'bg-mist text-slate'">{{ r.hasExample ? 'Set' : 'None' }}</app-chip></td>
                  <!-- py-1.5: the h-8 buttons then centre on the first text line (rows are top-aligned) -->
                  <td class="whitespace-nowrap py-1.5 pl-3 pr-5 text-right">
                    <button type="button" (click)="view = r" class="inline-flex h-8 items-center rounded px-3 text-xs font-semibold text-navy hover:bg-mist">View</button>
                    <a [routerLink]="['/bd/web/mbo/tasks', role, r.no]" class="inline-flex h-8 items-center rounded px-3 text-xs font-semibold text-navy hover:bg-mist">Edit</a>
                  </td>
                </tr>
              }
            }
          </tbody>
          @if (rows?.length) {
            <tfoot class="bg-navy text-sm text-white">
              <tr>
                <td colspan="3" class="py-3.5 pl-5 pr-3 font-semibold">Total weight</td>
                <td class="px-3 py-3.5 text-right">
                  <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold tabular-nums"
                    [class]="total() === 100 ? 'bg-white text-[#00857d]' : 'bg-amber-100 text-amber-800'">
                    @if (total() === 100) {
                      <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
                    } @else {
                      <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
                    }
                    {{ total() }}%
                  </span>
                </td>
                <td colspan="3" class="py-3.5 pl-3 pr-5 text-xs font-medium" [class]="total() === 100 ? 'text-white/85' : 'text-amber-200'">
                  {{ total() === 100 ? 'Weights add up to 100%.' : 'Weights should add up to 100% before targets are assigned.' }}
                </td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
    </section>
    <app-modal [open]="!!view" [title]="view?.objective?.title ?? ''" width="40rem" (closed)="view = null">
      @if (view; as v) {
        <app-setup-view [role]="role" [no]="v.no" [objective]="v.objective" focus="task" editLabel="Edit task" (closed)="view = null" (edit)="view = null; router.navigate(['/bd/web/mbo/tasks', role, v.no])" />
      }
    </app-modal>
  `,
})
export class MboTasksComponent implements OnInit {
  @Input('role') set roleIn(v: string | undefined) { if (v) this.role = v as RoleId; } // ?role=

  readonly router = inject(Router);
  readonly panel = PANEL.replace('p-5', '');
  readonly big = big;
  readonly typeLabel = TYPE_LABEL;
  readonly guide = GUIDE;
  readonly roleOpts = (Object.keys(ROLE_TEMPLATES) as RoleId[]).map((k) => ({ value: k, label: ROLE_TEMPLATES[k].label }));

  role: RoleId = 'sales-rep';
  rows: TaskRow[] | null = null;
  view: TaskRow | null = null;
  private req = 0;

  code = (r: TaskRow) => r.objective.code ?? r.objective.id.toUpperCase().replace(/-/g, '_');
  unit = (r: TaskRow) => (r.objective.kind === 'count' ? ` · ${r.objective.unit}` : r.objective.kind === 'revenue' ? ` · ${r.objective.currency ?? 'HKD'}` : '');
  full = () => !!this.rows && this.rows.length >= 5;
  roleLabel = () => ROLE_TEMPLATES[this.role].label;
  total = () => +(this.rows ?? []).reduce((s, r) => s + r.objective.weight, 0).toFixed(2);

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
