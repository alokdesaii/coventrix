import { Component, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  exampleOptions, getAssignment, getMapping, guideOptions, listTeam, PERIODS, ROLE_TEMPLATES, saveMapping,
  type EmployeeMapping, type MappingLine, type Objective, type RoleId, type TargetStatus, type TeamMember,
} from '../../../api/mbo';
import { big } from '../../../shared/client-list.component';
import { ChipComponent, STATUS, StatusChipComponent } from '../../../shared/mbo';
import { PageHeaderComponent, PANEL, SelectComponent } from '../../../shared/ui';
import { TYPE_LABEL } from './setup-shared';

type Member = TeamMember & { status: Record<string, TargetStatus> };
const small = '[&_select]:h-9 [&_select]:text-sm';
const fmt = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Map a role template, its tasks, each task's rating guide and framework example to one employee for a period. */
@Component({
  selector: 'app-mbo-mapping',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, SelectComponent, ChipComponent, StatusChipComponent],
  template: `
    <app-page-header title="MBO Mapping">
      <a routerLink="/bd/web/mbo/assign" [queryParams]="{ member: memberId, period }" class="flex h-9 items-center rounded border border-slate/40 bg-white px-4 text-sm font-medium text-navy transition hover:bg-mist">Assign MBO targets →</a>
    </app-page-header>

    <section [class]="panel">
      <div class="flex flex-col gap-4 border-b border-slate/20 p-5">
        <div class="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Employee
            <app-select [class]="big" label="Employee" [value]="memberId" (valueChange)="memberId = $event; load()" [options]="memberOpts()" />
          </div>
          <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Review period
            <app-select [class]="big" label="Review period" [value]="period" (valueChange)="period = $event; load()" [options]="periods" />
          </div>
          <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Role template
            <app-select [class]="big" label="Role template" [value]="m?.role ?? ''" [disabled]="locked()" (valueChange)="changeRole($event)" [options]="roleOpts" />
            @if (m && member() && m.role !== member()!.role) {
              <span class="font-normal text-amber-700">Overrides {{ member()!.name }}'s own role ({{ roleLabel(member()!.role) }}).</span>
            }
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate">
          <span class="flex items-center gap-2">Mapping
            <app-chip [tone]="m?.savedAt ? 'bg-teal/10 text-[#00857d]' : 'bg-mist text-slate'">{{ m?.savedAt ? 'Saved ' + fmt(m!.savedAt!) : 'Not saved · role defaults' }}</app-chip>
          </span>
          @if (status) { <span class="flex items-center gap-2">Targets <app-status-chip [status]="status" /></span> }
          <span class="ml-auto">Pick what applies to this employee. Assign MBO Targets then uses exactly this.</span>
        </div>
        @if (locked()) {
          <p class="rounded bg-sky-50 px-3 py-2 text-xs text-sky-900">{{ member()?.name }}'s {{ period }} targets are {{ statusLabel() }}, so the mapping is locked. It can change again for a new agreement.</p>
        }
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[980px] text-[13px]">
          <thead class="text-left text-xs text-slate">
            <tr>
              <th class="w-16 py-3 pl-5 pr-2 font-medium">Include</th>
              <th class="px-3 py-3 font-medium">MBO task</th>
              <th class="w-20 px-3 py-3 text-right font-medium">Weight</th>
              <th class="w-[24%] px-3 py-3 font-medium">Rating guide</th>
              <th class="w-[24%] py-3 pl-3 pr-5 font-medium">Framework example</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate/15 border-t border-slate/15">
            @if (!m) {
              @for (i of [0, 1, 2]; track i) { <tr><td colspan="5" class="px-5 py-3.5"><div class="h-5 animate-pulse rounded bg-mist"></div></td></tr> }
            } @else {
              @for (row of rows(); track row.o.id) {
                <tr class="align-top" [class.opacity-50]="!row.line.included">
                  <td class="py-3.5 pl-5 pr-2">
                    <input type="checkbox" class="mt-0.5 size-4 accent-navy" [checked]="row.line.included" [disabled]="locked()"
                      [attr.aria-label]="'Include ' + row.o.title" (change)="row.line.included = $any($event.target).checked; dirty = true" />
                  </td>
                  <td class="px-3 py-3">
                    <p class="font-semibold text-night">{{ row.no }}. {{ row.o.title }}</p>
                    <p class="mt-0.5 text-xs text-slate">{{ typeLabel[row.o.kind] }}{{ unit(row.o) }}</p>
                  </td>
                  <td class="px-3 py-3 text-right font-semibold tabular-nums text-navy">{{ row.o.weight }}%</td>
                  <td class="px-3 py-2.5">
                    <app-select [class]="small" [label]="'Rating guide for ' + row.o.title" [value]="row.line.guideId" [disabled]="locked() || !row.line.included"
                      (valueChange)="pickGuide(row.o, row.line, $event)" [options]="guideOpts(row.o)" />
                    <p class="mt-1 text-xs text-slate">{{ guideSummary(row.o, row.line.guideId) }}</p>
                  </td>
                  <td class="py-2.5 pl-3 pr-5">
                    <app-select [class]="small" [label]="'Framework example for ' + row.o.title" [value]="row.line.exampleId ?? ''" [disabled]="locked() || !row.line.included"
                      (valueChange)="row.line.exampleId = $event || null; dirty = true" [options]="exampleOpts(row.o, row.line.guideId)" />
                  </td>
                </tr>
              }
            }
          </tbody>
          @if (m) {
            <tfoot class="bg-navy text-sm text-white">
              <tr>
                <td colspan="2" class="py-3.5 pl-5 pr-3 font-semibold">Total weight · {{ included() }} of {{ rows().length }} tasks</td>
                <td class="px-3 py-3.5 text-right">
                  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 font-bold tabular-nums" [class]="total() === 100 ? 'bg-white text-[#00857d]' : 'bg-amber-100 text-amber-800'">{{ total() }}%</span>
                </td>
                <td colspan="2" class="py-3.5 pl-3 pr-5 text-xs font-medium" [class]="total() === 100 ? 'text-white/85' : 'text-amber-200'">
                  {{ total() === 100 ? 'Included weights add up to 100%.' : 'Included weights should add up to 100%. Adjust weights on MBO Tasks if a task is left out.' }}
                </td>
              </tr>
            </tfoot>
          }
        </table>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 p-5">
        @if (notice) { <p role="status" class="mr-auto text-sm text-[#00857d]">{{ notice }}</p> }
        @else if (dirty) { <p class="mr-auto text-sm text-slate">Unsaved changes for {{ member()?.name }}, {{ period }}.</p> }
        @else { <p class="mr-auto text-xs text-slate">Draft targets update to the new mapping; sent or accepted targets don't change.</p> }
        <button type="button" [disabled]="!m || locked() || saving" (click)="resetDefaults()"
          class="h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist disabled:opacity-40">Reset to role defaults</button>
        <button type="button" [disabled]="!m || locked() || saving || included() === 0" (click)="save()"
          class="h-10 rounded bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-40">{{ saving ? 'Saving…' : 'Save mapping' }}</button>
      </div>
    </section>
  `,
})
export class MboMappingComponent implements OnInit {
  @Input('member') set memberIn(v: string | undefined) { if (v) this.memberId = v; } // ?member=
  @Input('period') set periodIn(v: string | undefined) { if (v) this.period = v; } // ?period=

  readonly panel = PANEL.replace('p-5', '');
  readonly big = big;
  readonly small = small;
  readonly periods = PERIODS;
  readonly typeLabel = TYPE_LABEL;
  readonly fmt = fmt;
  readonly roleOpts = (Object.keys(ROLE_TEMPLATES) as RoleId[]).map((k) => ({ value: k, label: ROLE_TEMPLATES[k].label }));

  memberId = 'u1';
  period = '2026';
  team: Member[] = [];
  m: EmployeeMapping | null = null;
  status: TargetStatus | null = null;
  dirty = false;
  saving = false;
  notice = '';
  private req = 0;

  member = () => this.team.find((t) => t.id === this.memberId);
  roleLabel = (r: RoleId) => ROLE_TEMPLATES[r].label;
  statusLabel = () => (this.status ? STATUS[this.status].label.toLowerCase() : '');
  locked = () => this.status === 'awaiting-acceptance' || this.status === 'accepted';
  memberOpts = () => (this.team.length
    ? this.team.map((t) => ({ value: t.id, label: `${t.name} — ${ROLE_TEMPLATES[t.role].label}` }))
    : [{ value: this.memberId, label: 'Loading…' }]);
  rows = () => (this.m ? ROLE_TEMPLATES[this.m.role].objectives.map((o, i) => ({ no: i + 1, o, line: this.m!.lines.find((l) => l.objectiveId === o.id)! })) : []);
  included = () => this.rows().filter((r) => r.line.included).length;
  total = () => +this.rows().filter((r) => r.line.included).reduce((s, r) => s + r.o.weight, 0).toFixed(2);
  unit = (o: Objective) => (o.kind === 'count' ? ` · ${o.unit}` : o.kind === 'revenue' ? ` · ${o.currency ?? 'HKD'}` : '');

  guideOpts = (o: Objective) => guideOptions(this.m!.role, o).map((g) => ({ value: g.id, label: g.name }));
  exampleOpts = (o: Objective, guideId: string) => [
    { value: '', label: 'No example' },
    ...exampleOptions(this.m!.role, o, guideId).map((x) => ({ value: x.id, label: x.name })),
  ];
  guideSummary = (o: Objective, guideId: string) => {
    const g = guideOptions(this.m!.role, o).find((x) => x.id === guideId)?.guide;
    if (!g) return '';
    return g.bands ? `${g.bands.join(' / ')}% of target` : g.criteria ? `Criteria for 3: ${g.criteria[2]}` : 'Rating guide not set up';
  };

  async ngOnInit() {
    this.load();
    this.team = await listTeam();
  }

  async load(role?: RoleId) {
    const n = ++this.req;
    this.m = null;
    this.notice = '';
    this.dirty = !!role;
    const [m, a] = await Promise.all([getMapping(this.memberId, this.period, role), getAssignment(this.memberId, this.period)]);
    if (n !== this.req) return;
    this.m = m;
    this.status = a.status;
  }

  changeRole(r: RoleId) { this.load(r); }

  pickGuide(o: Objective, line: MappingLine, guideId: string) {
    line.guideId = guideId;
    // The example belongs to the guide, so default to the new guide's first example.
    line.exampleId = exampleOptions(this.m!.role, o, guideId)[0]?.id ?? null;
    this.dirty = true;
  }

  resetDefaults() { this.load(this.member()?.role); }

  async save() {
    this.saving = true;
    this.m = await saveMapping(this.m!);
    this.saving = false;
    this.dirty = false;
    this.notice = `Mapping saved for ${this.member()?.name}, ${this.period}.`;
  }
}
