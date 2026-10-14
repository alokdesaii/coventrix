import { Component, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { listTeamOverview, PERIODS, ROLE_TEMPLATES, type RoleId, type TargetStatus, type TeamRow } from '../../api/mbo';
import { big, field } from '../../shared/client-list.component';
import { ChipComponent, EVIDENCE, ProgressBarComponent, STATUS, StatusChipComponent } from '../../shared/mbo';
import { PageHeaderComponent, PANEL, SelectComponent } from '../../shared/ui';

const SHORT: Record<string, string> = {
  revenue: 'Revenue', opportunities: 'Qualified opps', 'partner-dev': 'Partner dev', 'cbd-dev': 'CBD partners',
  escalation: 'Escalation', reporting: 'Reporting & coaching', leadership: 'Leadership',
};

const gaps = (r: TeamRow) => r.progress.filter((p) => p.evidence !== 'evidenced');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** One objective as a single line: name + weight · actual / target + bar · % (or evidence chip if qualitative). */
@Component({
  selector: 'app-objective-line',
  standalone: true,
  imports: [ChipComponent, ProgressBarComponent],
  host: { class: 'grid grid-cols-[10rem_minmax(0,1fr)_3rem] items-center gap-4 py-1.5 text-xs', '[title]': 'o().title' },
  template: `
    <span class="truncate font-semibold text-navy">{{ short[id] ?? o().title }} <span class="font-normal text-slate">{{ o().weight }}%</span></span>
    @if (numeric()) {
      <span class="flex min-w-0 items-center gap-2">
        <span class="w-36 shrink-0 tabular-nums text-night">{{ o().kind === 'revenue' ? 'HKD ' : '' }}{{ val(p()?.actual) }} <span class="text-slate">/ {{ val(t()?.target) }}</span></span>
        @if (pct() !== null) { <span class="min-w-8 flex-1"><app-progress-bar [pct]="pct()!" /></span> }
      </span>
    } @else {
      <span>@if (p(); as pp) { <app-chip [tone]="ev[pp.evidence].tone">{{ ev[pp.evidence].label }}</app-chip> }</span>
    }
    <span class="text-right font-semibold tabular-nums text-[#00857d]">{{ pct() !== null ? round(pct()!) + '%' : '' }}</span>
  `,
})
export class ObjectiveLineComponent {
  @Input({ required: true }) r!: TeamRow;
  @Input({ required: true }) id!: string;
  readonly short = SHORT;
  readonly ev = EVIDENCE;
  readonly round = Math.round;
  o = () => this.r.template.objectives.find((x) => x.id === this.id)!;
  t = () => this.r.assignment.targets.find((x) => x.objectiveId === this.id);
  p = () => this.r.progress.find((x) => x.objectiveId === this.id);
  numeric = () => this.o().kind === 'revenue' || this.o().kind === 'count';
  pct = () => { const t = this.t()?.target, a = this.p()?.actual; return this.numeric() && t && a !== undefined ? (a / t) * 100 : null; };
  val = (n?: number) => (n === undefined ? '—' : this.o().kind === 'revenue' ? compact.format(n) : String(n));
}

const tile = 'flex flex-col gap-0.5 border-slate/20 px-5 py-4 [&:not(:first-child)]:border-t sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-t-0';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, SelectComponent, ChipComponent, StatusChipComponent, ObjectiveLineComponent],
  template: `
    <app-page-header title="Team MBO Overview">
      <a routerLink="/bd/web/mbo/assign" [queryParams]="{ period }" class="flex h-9 items-center rounded bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy/90">Assign targets</a>
    </app-page-header>

    <div class="flex flex-col gap-5">
      <section class="grid overflow-hidden rounded-md border border-slate/20 bg-white sm:grid-cols-4">
        @for (x of tiles(); track x.label) {
          <div [class]="tile">
            <span class="text-xs font-medium text-slate">{{ x.label }}</span>
            <span class="text-xl font-semibold tabular-nums" [class]="x.tone ?? 'text-night'">{{ x.value }}</span>
            <span class="text-xs text-slate">{{ x.sub }}</span>
          </div>
        }
      </section>

      <section [class]="panel">
        <div class="grid gap-4 border-b border-slate/20 p-5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_auto] xl:items-end">
          <label class="flex flex-col gap-1.5 text-xs font-medium text-slate">Employee
            <input [class]="field" placeholder="Search by name" [value]="q" (input)="q = $any($event.target).value" />
          </label>
          <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Review period
            <app-select [class]="big" label="Review period" [value]="period" (valueChange)="period = $event; load()" [options]="periods" />
          </div>
          <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Role
            <app-select [class]="big" label="Role" [value]="role" (valueChange)="role = $event" [options]="roleOpts" />
          </div>
          <div class="flex flex-col gap-1.5 text-xs font-medium text-slate">Target status
            <app-select [class]="big" label="Target status" [value]="status" (valueChange)="status = $event" [options]="statusOpts" />
          </div>
          <label class="flex h-9 items-center gap-2 whitespace-nowrap text-sm text-night">
            <input type="checkbox" class="size-4 accent-navy" [checked]="followUp" (change)="followUp = $any($event.target).checked" />
            Needs evidence follow-up
          </label>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[1080px] text-sm">
            <thead class="text-left text-xs text-slate">
              <tr>
                <th class="w-52 py-3 pl-5 pr-4 font-medium">Employee</th>
                <th class="px-3 py-3 font-medium">Objective progress · actual of annual target</th>
                <th class="w-56 px-3 py-3 font-medium">Evidence &amp; escalations</th>
                <th class="w-36 py-3 pl-3 pr-5"><span class="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate/15 border-t border-slate/15">
              @if (!all) {
                @for (i of [0, 1, 2]; track i) { <tr><td colspan="4" class="px-5 py-4"><div class="h-20 animate-pulse rounded bg-mist"></div></td></tr> }
              } @else if (rows().length === 0) {
                <tr><td colspan="4" class="px-5 py-12 text-center text-sm text-slate">No employees match these filters.</td></tr>
              } @else {
                @for (r of rows(); track r.member.id) {
                  <tr class="align-top">
                    <td class="py-4 pl-5 pr-4">
                      <p class="font-semibold text-night">{{ r.member.name }}</p>
                      <p class="mt-0.5 text-xs text-night/80">{{ r.template.label }}</p>
                      <p class="mt-0.5 text-xs text-slate">{{ r.member.unit }}</p>
                      <p class="mt-2"><app-status-chip [status]="r.assignment.status" /></p>
                    </td>
                    <td class="px-3 py-4">
                      @if (r.assignment.status === 'accepted') {
                        <div class="flex max-w-xl flex-col divide-y divide-slate/10">
                          @for (o of r.template.objectives; track o.id) { <app-objective-line [r]="r" [id]="o.id" /> }
                        </div>
                      } @else {
                        <p class="rounded border border-dashed border-slate/40 px-4 py-5 text-center text-xs text-slate">{{ waiting(r) }}</p>
                      }
                    </td>
                    <td class="px-3 py-4 text-xs">
                      @if (r.assignment.status === 'accepted') {
                        <div class="flex flex-col gap-1.5">
                          <span><app-chip [tone]="gaps(r).length ? 'bg-amber-100 text-amber-800' : 'bg-teal/10 text-[#00857d]'">{{ r.progress.length - gaps(r).length }} / {{ r.progress.length }} evidenced</app-chip></span>
                          @for (p of gaps(r).slice(0, 2); track p.objectiveId) {
                            <span class="text-night/80"><span class="font-medium">{{ short[p.objectiveId] }}:</span> {{ p.note ?? ev[p.evidence].label }}</span>
                          }
                        </div>
                      }
                      @if (r.openEscalations > 0) {
                        <span class="inline-flex" [class.mt-2]="r.assignment.status === 'accepted'">
                          <app-chip tone="bg-red-100 text-red-700">{{ r.openEscalations }} open escalation{{ r.openEscalations > 1 ? 's' : '' }}</app-chip>
                        </span>
                      }
                    </td>
                    <td class="py-4 pl-3 pr-5 text-right">
                      <a routerLink="/bd/web/mbo/assign" [queryParams]="{ member: r.member.id, period }"
                        class="inline-flex h-8 items-center whitespace-nowrap rounded px-3 text-xs font-semibold transition"
                        [class]="strong(r) ? 'bg-navy text-white hover:bg-navy/90' : 'text-navy hover:bg-mist'">{{ actionLabel(r) }}</a>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        <div class="border-t border-slate/20 px-5 py-3 text-xs text-slate">
          {{ all ? 'Showing ' + rows().length + ' of ' + all.length + ' employees · progress is % of the annual target, not a rating. Final ratings: MBO Panel / RemCo.' : 'Loading…' }}
        </div>
      </section>
    </div>
  `,
})
export class TeamComponent implements OnInit {
  readonly panel = PANEL.replace('p-5', '');
  readonly field = field;
  readonly big = big;
  readonly tile = tile;
  readonly periods = PERIODS;
  readonly short = SHORT;
  readonly ev = EVIDENCE;
  readonly gaps = gaps;
  readonly roleOpts = [{ value: '', label: 'All roles' }, ...(Object.keys(ROLE_TEMPLATES) as RoleId[]).map((k) => ({ value: k, label: ROLE_TEMPLATES[k].label }))];
  readonly statusOpts = [{ value: '', label: 'All statuses' }, ...(Object.keys(STATUS) as TargetStatus[]).map((k) => ({ value: k, label: STATUS[k].label }))];

  period = '2026';
  q = '';
  role: RoleId | '' = '';
  status: TargetStatus | '' = '';
  followUp = false;
  all: TeamRow[] | null = null;
  private req = 0;

  rows = () => (this.all ?? []).filter((r) =>
    (!this.q.trim() || r.member.name.toLowerCase().includes(this.q.trim().toLowerCase())) &&
    (!this.role || r.member.role === this.role) &&
    (!this.status || r.assignment.status === this.status) &&
    (!this.followUp || (r.assignment.status === 'accepted' && gaps(r).length > 0)));

  tiles = () => {
    const all = this.all;
    const accepted = all?.filter((r) => r.assignment.status === 'accepted') ?? [];
    const needAction = all?.filter((r) => r.assignment.status !== 'accepted' && r.assignment.status !== 'awaiting-acceptance').length ?? 0;
    const followUps = accepted.filter((r) => gaps(r).length).length;
    const openEsc = all?.reduce((n, r) => n + r.openEscalations, 0) ?? 0;
    return [
      { label: 'Team members', value: all?.length ?? '—', sub: 'In this view' },
      { label: 'Targets accepted', value: all ? `${accepted.length} / ${all.length}` : '—', sub: needAction ? `${needAction} need your action` : 'All targets sent', tone: needAction ? 'text-amber-700' : undefined },
      { label: 'Evidence follow-up', value: all ? followUps : '—', sub: 'Employees with missing or pending evidence', tone: followUps ? 'text-amber-700' : undefined },
      { label: 'Open escalations', value: all ? openEsc : '—', sub: 'Submitted or acknowledged', tone: openEsc ? 'text-red-700' : undefined },
    ];
  };

  waiting = (r: TeamRow) => {
    const s = r.assignment.status;
    return s === 'not-set' ? 'No targets yet for this period.'
      : s === 'draft' ? 'Targets drafted but not sent to the employee.'
      : s === 'changes-requested' ? `Asked for changes: “${r.assignment.changeRequest}”`
      : 'Waiting for the employee to accept their targets.';
  };
  strong = (r: TeamRow) => ['not-set', 'draft', 'changes-requested'].includes(r.assignment.status);
  actionLabel = (r: TeamRow) => {
    const s = r.assignment.status;
    return s === 'not-set' ? 'Assign targets' : s === 'draft' ? 'Finish targets' : s === 'changes-requested' ? 'Review request' : 'View targets';
  };

  ngOnInit() { this.load(); }

  async load() {
    const n = ++this.req;
    this.all = null;
    const rows = await listTeamOverview(this.period);
    if (n === this.req) this.all = rows;
  }
}
