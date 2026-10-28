import { Component, Input, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { isDefaultId, listGuides, ROLE_TEMPLATES, type GuideOption, type Objective, type RoleId } from '../../../api/mbo';
import { big } from '../../../shared/client-list.component';
import { ChipComponent } from '../../../shared/mbo';
import { ModalComponent, PageHeaderComponent, PANEL, SelectComponent } from '../../../shared/ui';
import { TYPE_LABEL } from './setup-shared';
import { SetupViewComponent } from './setup-view.component';

type Row = { no: number; task: Objective; g: GuideOption; first: boolean };

/** One-line band summary for a guide. */
const bandsText = (g: GuideOption) => (g.guide.bands ? `${g.guide.bands.join(' / ')}% of target` : g.guide.criteria ? `Criteria for 3: ${g.guide.criteria[2]}` : 'Not set up');

/** Step 2 of MBO setup: every rating guide per task — the framework default plus any alternatives. */
@Component({
  selector: 'app-mbo-rating-guides',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, SelectComponent, ChipComponent, ModalComponent, SetupViewComponent],
  template: `
    <app-page-header title="Rating Guides">
      <a routerLink="/bd/web/mbo/rating-guides/edit" [queryParams]="{ role, guide: 'new' }" class="flex h-9 items-center rounded bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/90">+ Add rating guide</a>
    </app-page-header>

    <section [class]="panel">
      <div class="flex flex-wrap items-end justify-between gap-4 border-b border-slate/20 p-5">
        <div class="flex w-80 flex-col gap-1.5 text-xs font-medium text-slate">Role template
          <app-select [class]="big" label="Role template" [value]="role" (valueChange)="pickRole($event)" [options]="roleOpts" />
        </div>
        <p class="max-w-md text-xs text-slate xl:text-right">Step 2 of 3. Every task has its framework default guide; add alternatives (e.g. a stretch guide) to pick from in MBO Mapping.</p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[920px] text-[13px]">
          <thead class="text-left text-xs text-slate">
            <tr>
              <th class="w-12 py-3 pl-5 pr-3 font-medium">No</th>
              <th class="px-3 py-3 font-medium">MBO task</th>
              <th class="px-3 py-3 font-medium">Rating guide</th>
              <th class="px-3 py-3 font-medium">Bands (5 → 2)</th>
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
              @for (r of rows; track r.g.id) {
                <!-- Task groups: a top border on each task's first guide; alternatives sit under it. -->
                <tr class="hover:bg-mist/60" [class]="r.first ? 'border-t border-slate/15' : ''">
                  <td class="py-3 pl-5 pr-3">@if (r.first) { <span class="grid size-6 place-items-center rounded-full bg-navy text-xs font-semibold text-white">{{ r.no }}</span> }</td>
                  <td class="px-3 py-3">
                    @if (r.first) { <p class="font-semibold">{{ r.task.title }}</p><p class="text-xs text-slate">{{ typeLabel[r.task.kind] }}</p> }
                  </td>
                  <td class="px-3 py-3" [class.pl-6]="!r.first">
                    <span [class]="r.first ? 'font-medium' : 'flex items-center gap-1.5 font-medium text-navy'">
                      @if (!r.first) { <span class="text-slate">↳</span> }{{ r.g.name }}
                    </span>
                  </td>
                  <td class="px-3 py-3 text-xs text-night/80">{{ bandsText(r.g) }}</td>
                  <td class="px-3 py-3"><app-chip [tone]="tone(r)">{{ status(r) }}</app-chip></td>
                  <td class="whitespace-nowrap py-1.5 pl-3 pr-5 text-right">
                    <button type="button" (click)="view = r" class="inline-flex h-8 items-center rounded px-3 text-xs font-semibold text-navy hover:bg-mist">View</button>
                    <a routerLink="/bd/web/mbo/rating-guides/edit" [queryParams]="{ role, no: r.no, guide: r.g.id }" class="inline-flex h-8 items-center rounded px-3 text-xs font-semibold"
                      [class]="status(r) === 'Not set up' ? 'bg-navy text-white hover:bg-navy/90' : 'text-navy hover:bg-mist'">{{ status(r) === 'Not set up' ? 'Set up' : 'Edit' }}</a>
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
        <app-setup-view [role]="role" [no]="v.no" [objective]="v.task" [guideId]="v.g.id" focus="guide" editLabel="Edit rating guide" (closed)="view = null"
          (edit)="view = null; router.navigate(['/bd/web/mbo/rating-guides/edit'], { queryParams: { role, no: v.no, guide: v.g.id } })" />
      }
    </app-modal>
  `,
})
export class MboRatingGuidesComponent implements OnInit {
  @Input('role') set roleIn(v: string | undefined) { if (v) this.role = v as RoleId; } // ?role=

  readonly router = inject(Router);
  readonly panel = PANEL.replace('p-5', '');
  readonly big = big;
  readonly typeLabel = TYPE_LABEL;
  readonly bandsText = bandsText;
  readonly roleOpts = (Object.keys(ROLE_TEMPLATES) as RoleId[]).map((k) => ({ value: k, label: ROLE_TEMPLATES[k].label }));

  role: RoleId = 'sales-rep';
  rows: Row[] | null = null;
  view: Row | null = null;
  private req = 0;

  status = (r: Row) => {
    if (!isDefaultId(r.g.id)) return 'Alternative';
    const o = r.task;
    if (o.kind === 'revenue' || o.kind === 'count') return o.bands || o.ratingLabels ? 'Custom' : 'Framework default';
    return o.criteria ? 'Custom' : 'Not set up';
  };
  tone = (r: Row) => ({ Alternative: 'bg-sky-100 text-sky-800', Custom: 'bg-teal/10 text-[#00857d]', 'Framework default': 'bg-label text-navy', 'Not set up': 'bg-red-100 text-red-700' })[this.status(r)]!;

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
    this.rows = tasks.flatMap((t) => t.options.map((g, i) => ({ no: t.no, task: t.task, g, first: i === 0 })));
  }
}
