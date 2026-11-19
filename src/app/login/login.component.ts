import { Component } from '@angular/core';
import type { Department } from '../api/auth';
import { LogoComponent } from '../shared/logo.component';
import { LoginFormComponent } from './login-form.component';

const BADGES = ['digicert', 'iso-certified', 'secured-platform', 'password-security', 'transaction-alerts', '3-eye'];
const POWERED_BY = ['qor3-plus-white', 'edge-plus', 'conentrix', 'digiqor-plus', 'ficoy-plus', 'xirni', 'h-intelligence', 'prolink-plus'];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [LogoComponent, LoginFormComponent],
  template: `
    <!-- Full-bleed navy gradient (the sidebar navy with a teal glow); white card centred on top -->
    <main class="relative isolate flex min-h-dvh flex-col items-center overflow-hidden px-4 py-10 text-white sm:px-6
      bg-[radial-gradient(at_15%_10%,#0a6b7d_0px,transparent_55%),radial-gradient(at_90%_5%,#024f73_0px,transparent_45%),linear-gradient(155deg,#023e63,#012a45)]">
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

      <footer class="w-full max-w-6xl text-xs leading-relaxed text-white/60">
        <div class="grid gap-8 lg:grid-cols-[1fr_1.35fr] lg:gap-12">
          <section>
            <h2 class="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/45">Security information</h2>
            <ul class="grid gap-2 sm:grid-cols-2">
              <li>Ensure the address bar starts with <a class="font-medium text-white hover:underline" [href]="site">{{ site }}</a>.</li>
              <li>Never share your PIN, OTP, User ID or Password with anyone.</li>
              <li>Do not enter login or other sensitive information in any pop up window.</li>
              <li>The URL is inaccessible in sanctioned/embargoed countries.</li>
            </ul>
          </section>
          <div class="grid gap-6">
            <section>
              <h2 class="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/45">Digital security</h2>
              <ul class="flex flex-wrap items-center gap-2.5">
                @for (b of badges; track b) {
                  <li><img [src]="'assets/login/' + b + '.svg'" [alt]="b.replaceAll('-', ' ')" class="h-7 w-auto" /></li>
                }
              </ul>
            </section>
            <section>
              <h2 class="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/45">Powered by</h2>
              <ul class="flex flex-wrap items-center gap-2.5">
                @for (p of poweredBy; track p) {
                  <li><img [src]="'assets/login/' + p + '.svg'" [alt]="p.replaceAll('-', ' ')" class="h-7 w-auto" /></li>
                }
              </ul>
            </section>
          </div>
        </div>

        <p class="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-white/15 pt-6">
          <span>© {{ year }} Harbour and Hills Financial Services Limited</span>
          <span aria-hidden="true">·</span>
          <a class="hover:text-white hover:underline" href="mailto:tech.support&#64;harbourandhills.com">tech.support&#64;harbourandhills.com</a>
        </p>
      </footer>
    </main>
  `,
})
export class LoginComponent {
  readonly badges = BADGES;
  readonly poweredBy = POWERED_BY;
  readonly site = 'https://coventrix.harbourandhills.com';
  readonly year = new Date().getFullYear();

  department: Department = 'bd-cbd';
}
