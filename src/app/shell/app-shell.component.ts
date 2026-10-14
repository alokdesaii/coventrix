import { Component, Input, OnInit, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { getCurrentUserId, listDemoUsers, setCurrentUserId } from '../api/mbo';
import { LogoComponent } from '../shared/logo.component';
import { DETAIL_TITLES, type NavIcon, type NavItem } from './nav';

const ICONS: Record<NavIcon, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  bank: 'M3 9 12 4l9 5M5 10v8m4.67-8v8m4.66-8v8M19 10v8M3 20h18',
  briefcase: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  report: 'M6 3h9l4 4v14H6zM9 12h6M9 16h6M9 8h3',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6.5 6.5 0 0 1 3.5 6',
  chart: 'M4 4v15a1 1 0 0 0 1 1h15M8 16v-4M12 16V8M16 16v-6M20 16V6',
  flow: 'M4 7h15M15 3l4 4-4 4M20 17H5M9 21l-4-4 4-4',
  calendar: 'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  dot: '',
};

const row = 'flex h-10 w-full items-center gap-3 rounded px-3 text-sm font-medium transition';
const idle = 'text-white/80 hover:bg-white/10 hover:text-white';
const on = 'bg-white/15 text-white';

function breadcrumbs(nav: NavItem[], path: string): string[] {
  for (const n of nav) {
    if (n.href === path) return n.href === '/bd/dashboard' ? ['Home'] : ['Home', n.label];
    const c = n.children?.find((c) => c.href === path);
    if (c) return ['Home', n.label, c.label];
  }
  // Detail pages: /bd/web/<section>/<page>/<id> -> parent menu item + DETAIL_TITLES entry.
  const [, , , section, page, sub] = path.split('/');
  const parent = nav.find((n) => n.children?.some((c) => c.href.split('/')[3] === section));
  const title = DETAIL_TITLES[`${page}/${sub}`] ?? DETAIL_TITLES[page];
  if (parent && title) return ['Home', parent.label, title];
  return ['Home'];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, RouterOutlet, LogoComponent],
  template: `
    <div class="min-h-dvh bg-mist">
      <aside class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy text-white transition-transform md:translate-x-0"
        [class.translate-x-0]="open" [class.-translate-x-full]="!open">
        <div class="flex h-16 items-center px-6"><app-logo tone="light" svgClass="h-7 w-auto" /></div>
        <nav class="flex-1 overflow-y-auto px-3 pb-6" aria-label="Main">
          <ul class="flex flex-col gap-1">
            @for (item of nav; track item.label) {
              <li>
                @if (!item.children) {
                  <a [routerLink]="item.href" (click)="open = false" [class]="row + ' ' + (path() === item.href ? on : idle)"
                    [attr.aria-current]="path() === item.href ? 'page' : null">
                    <ng-container *ngTemplateOutlet="icon; context: { $implicit: item.icon }" />
                    {{ item.label }}
                  </a>
                } @else {
                  <button type="button" [class]="row + ' ' + idle" [attr.aria-expanded]="expanded === item.label"
                    (click)="expanded = expanded === item.label ? null : item.label">
                    <ng-container *ngTemplateOutlet="icon; context: { $implicit: item.icon }" />
                    <span class="flex-1 text-left">{{ item.label }}</span>
                    <svg viewBox="0 0 24 24" class="size-4 transition-transform" [class.rotate-90]="expanded === item.label" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                  </button>
                  @if (expanded === item.label) {
                    <ul class="mt-1 ml-[22px] flex flex-col gap-0.5 border-l border-white/20 pl-3">
                      @for (c of item.children; track c.href) {
                        <li>
                          @if (c.disabled) {
                            <span aria-disabled="true" title="Coming soon" class="flex h-9 cursor-not-allowed items-center rounded-md px-3 text-[13px] text-white/35">{{ c.label }}</span>
                          } @else {
                            <a [routerLink]="c.href" (click)="open = false" [class]="'flex h-9 items-center rounded-md px-3 text-[13px] transition ' + (path() === c.href ? on : idle)"
                              [attr.aria-current]="path() === c.href ? 'page' : null">{{ c.label }}</a>
                          }
                        </li>
                      }
                    </ul>
                  }
                }
              </li>
            }
          </ul>
        </nav>
      </aside>
      @if (open) {
        <div class="fixed inset-0 z-30 bg-night/40 md:hidden" (click)="open = false"></div>
      }

      <div class="md:pl-64">
        <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate/20 bg-white px-4 sm:px-6">
          <button type="button" class="-ml-1 rounded-md p-2 text-navy hover:bg-mist md:hidden" (click)="open = true" aria-label="Open menu">
            <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <nav aria-label="Breadcrumb">
            <ol class="flex items-center gap-1.5 text-sm text-slate">
              @for (c of crumbs(); track c; let i = $index, last = $last) {
                <li class="flex items-center gap-1.5">
                  @if (i > 0) { <span aria-hidden="true">/</span> }
                  @if (last) {
                    <span class="font-medium text-teal" aria-current="page">{{ c }}</span>
                  } @else if (i === 0) {
                    <a routerLink="/bd/dashboard" class="hover:text-navy">{{ c }}</a>
                  } @else {
                    {{ c }}
                  }
                </li>
              }
            </ol>
          </nav>
          <!-- ponytail: demo "View as" switch — replace with the signed-in user's menu once auth exists. -->
          <label class="relative ml-auto flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm font-medium text-night hover:bg-mist">
            <span class="grid size-8 place-items-center rounded-full bg-navy text-xs font-semibold text-white">{{ initials() }}</span>
            <span class="hidden flex-col leading-tight sm:flex">
              <span>{{ me().name }}</span>
              <span class="text-[11px] font-normal text-slate">Demo · view as</span>
            </span>
            <svg viewBox="0 0 24 24" class="size-4 text-slate" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            <select aria-label="View the portal as" class="absolute inset-0 cursor-pointer opacity-0" (change)="switchUser($any($event.target).value)">
              @for (u of users; track u.id) {
                <option [value]="u.id" [selected]="u.id === uid">{{ u.name }} — {{ u.role }}</option>
              }
            </select>
          </label>
        </header>
        <!-- re-keyed on uid: switching user remounts the page so it reloads as that person -->
        @for (k of [uid]; track k) {
          <main class="p-4 sm:p-6"><router-outlet /></main>
        }
      </div>
    </div>

    <ng-template #icon let-name>
      @if (name === 'dot') {
        <span class="mx-[7px] size-1.5 shrink-0 rounded-full bg-current"></span>
      } @else {
        <svg viewBox="0 0 24 24" class="size-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="$any(icons)[name]" /></svg>
      }
    </ng-template>
  `,
})
export class AppShellComponent implements OnInit {
  @Input({ required: true }) nav!: NavItem[];

  private router = inject(Router);
  readonly path = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url.split('?')[0])),
    { initialValue: this.router.url.split('?')[0] },
  );
  readonly crumbs = () => breadcrumbs(this.nav, this.path());
  readonly icons = ICONS;
  readonly row = row;
  readonly idle = idle;
  readonly on = on;
  readonly users = listDemoUsers();

  open = false;
  uid = getCurrentUserId();
  expanded: string | null = null;

  me = () => this.users.find((u) => u.id === this.uid)!;
  initials = () => this.me().name.split(' ').map((w) => w[0]).join('').slice(0, 2);

  ngOnInit() {
    this.expanded = this.nav.find((n) => n.children?.some((c) => this.path().startsWith(c.href)))?.label ?? null;
  }

  switchUser(id: string) {
    setCurrentUserId(id);
    this.uid = id;
  }
}
