import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, QueryList, ViewChildren, inject } from '@angular/core';
import type { Department } from '../api/auth';
import { LogoComponent } from '../shared/logo.component';
import { LoginFormComponent } from './login-form.component';

const BADGES = ['digicert', 'iso-certified', 'secured-platform', 'password-security', 'transaction-alerts', '3-eye'];
const POWERED_BY = ['qor3-plus-white', 'edge-plus', 'conentrix', 'digiqor-plus', 'ficoy-plus', 'xirni', 'h-intelligence', 'prolink-plus'];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [LogoComponent, LoginFormComponent],
  styles: `
    .blob {
      position: absolute;
      left: 0;
      top: 0;
      width: 38vmax;
      height: 38vmax;
      border-radius: 9999px;
      filter: blur(70px);
      mix-blend-mode: screen;
      transition-property: transform;
      transition-timing-function: ease-in-out;
      will-change: transform;
    }
    .blob-a { background: radial-gradient(circle at 35% 35%, #5eead4, #00bfb3 40%, transparent 70%); opacity: 0.55; }
    .blob-b { background: radial-gradient(circle at 60% 40%, #22d3ee, #0ea5e9 45%, transparent 70%); opacity: 0.4; }
  `,
  template: `
    <!-- Full-bleed navy gradient (the sidebar navy with a teal glow); white card centred on top -->
    <main class="relative isolate flex min-h-dvh flex-col items-center overflow-hidden px-4 pt-10 text-white sm:px-6
      bg-[radial-gradient(at_15%_10%,#0a6b7d_0px,transparent_55%),radial-gradient(at_90%_5%,#024f73_0px,transparent_45%),linear-gradient(155deg,#023e63,#012a45)]">
      <!-- Neon blobs that wander to random spots (positions set in code); still under prefers-reduced-motion -->
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <span #blob class="blob blob-a"></span>
        <span #blob class="blob blob-b"></span>
      </div>

      <svg viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true" class="absolute inset-x-0 bottom-0 -z-10 h-2/5 w-full">
        <path fill="#ffffff" fill-opacity="0.03" d="M0 210C170 120 330 100 480 150S760 70 940 95s330 120 500 55V320H0Z" />
        <path fill="#ffffff" fill-opacity="0.03" d="M0 260C200 190 380 215 590 235s390-55 590-30c120 15 200 35 260 25V320H0Z" />
        <path fill="#00bfb3" fill-opacity="0.06" d="M0 290c260-45 480-25 720-10s470 5 720-25V320H0Z" />
      </svg>

      <app-logo tone="light" svgClass="h-8 w-auto" />

      <div class="my-auto w-full max-w-sm py-12">
        <div class="rounded-md bg-white p-6 text-night shadow-2xl shadow-ink/40 sm:p-7">
          <app-login-form [(department)]="department" />
        </div>
      </div>

      <!-- Full-width footer -->
      <footer class="-mx-4 w-[calc(100%+2rem)] border-t border-white/10 px-4 pt-10 text-xs leading-relaxed text-white/60 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6">
        <div class="mx-auto max-w-5xl">
        <!-- One compact notice rather than four sentences spread across the page -->
        <section class="flex gap-4 rounded-md border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <span class="grid size-9 shrink-0 place-items-center rounded-full bg-teal/15 text-teal">
            <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
          </span>
          <div class="min-w-0">
            <h2 class="text-sm font-semibold text-white">Security information</h2>
            <ul class="mt-3 grid gap-x-10 gap-y-2 sm:grid-cols-2">
              <li [class]="item"><span [class]="dot"></span><span>Ensure the address bar starts with <a class="font-medium text-white hover:underline" [href]="site">{{ site }}</a>.</span></li>
              <li [class]="item"><span [class]="dot"></span><span>Never share your PIN, OTP, User ID or Password with anyone.</span></li>
              <li [class]="item"><span [class]="dot"></span><span>Do not enter login or other sensitive information in any pop up window.</span></li>
              <li [class]="item"><span [class]="dot"></span><span>The URL is inaccessible in sanctioned/embargoed countries.</span></li>
            </ul>
          </div>
        </section>

        <div class="mt-10 grid gap-8">
          <section class="text-center">
            <h2 [class]="heading">Digital security</h2>
            <ul class="flex flex-wrap items-center justify-center gap-2.5">
              @for (b of badges; track b) {
                <li><img [src]="'assets/login/' + b + '.svg'" [alt]="b.replaceAll('-', ' ')" class="h-9 w-auto" /></li>
              }
            </ul>
          </section>
          <section class="text-center">
            <h2 [class]="heading">Powered by</h2>
            <ul class="flex flex-wrap items-center justify-center gap-2.5">
              @for (p of poweredBy; track p) {
                <li><img [src]="'assets/login/' + p + '.svg'" [alt]="p.replaceAll('-', ' ')" class="h-9 w-auto" /></li>
              }
            </ul>
          </section>
        </div>

        <div class="mt-10 flex flex-col items-center gap-2 border-t border-white/10 py-6 sm:flex-row sm:justify-between">
          <span>© {{ year }} Harbour and Hills Financial Services Limited</span>
          <a class="inline-flex items-center gap-2 hover:text-white" href="mailto:tech.support&#64;harbourandhills.com">
            <span class="text-white/45">Login support</span>
            <span class="font-medium text-white/80 hover:underline">tech.support&#64;harbourandhills.com</span>
          </a>
        </div>
        </div>
      </footer>
    </main>
  `,
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('blob') private blobs!: QueryList<ElementRef<HTMLElement>>;
  private zone = inject(NgZone);
  private timer?: ReturnType<typeof setInterval>;

  readonly badges = BADGES;
  readonly poweredBy = POWERED_BY;
  readonly site = 'https://coventrix.harbourandhills.com';
  readonly year = new Date().getFullYear();
  readonly heading = 'mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/45';
  readonly item = 'flex gap-2.5';
  readonly dot = 'mt-[7px] size-1 shrink-0 rounded-full bg-teal';

  department: Department = 'bd-cbd';

  ngAfterViewInit() {
    // Start each blob somewhere random without animating there
    this.blobs.forEach(({ nativeElement: el }) => {
      el.style.transitionDuration = '0s';
      this.wander(el);
    });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Outside Angular so the timer never triggers change detection
    this.zone.runOutsideAngular(() => {
      const move = () => this.blobs.forEach(({ nativeElement: el }) => {
        el.style.transitionDuration = `${10 + Math.random() * 6}s`;
        this.wander(el);
      });
      setTimeout(move, 50);
      this.timer = setInterval(move, 11000);
    });
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  private wander(el: HTMLElement) {
    const x = -15 + Math.random() * 85;
    const y = -15 + Math.random() * 75;
    const s = 0.75 + Math.random() * 0.55;
    el.style.transform = `translate(${x}vw, ${y}vh) scale(${s})`;
  }
}
