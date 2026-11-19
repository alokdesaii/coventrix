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
    <main class="min-h-dvh bg-mist px-4 py-6 text-night sm:px-6 lg:py-10">
      <div class="mx-auto w-full max-w-6xl">
        <!-- Canvas: soft brand tint with low hills along the bottom, card centred on top -->
        <div class="relative isolate flex min-h-[40rem] flex-col items-center overflow-hidden rounded-md border border-slate/20 px-4 py-10 lg:min-h-[calc(100dvh-5rem)]
          bg-[radial-gradient(ellipse_at_50%_0%,#ffffff,transparent_70%),radial-gradient(ellipse_at_50%_115%,#00bfb326,transparent_60%),linear-gradient(180deg,#f8fafc,#e9f0f6)]">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true" class="absolute inset-x-0 bottom-0 -z-10 h-1/2 w-full">
            <path fill="#023e63" fill-opacity="0.05" d="M0 210C170 120 330 100 480 150S760 70 940 95s330 120 500 55V320H0Z" />
            <path fill="#023e63" fill-opacity="0.05" d="M0 260C200 190 380 215 590 235s390-55 590-30c120 15 200 35 260 25V320H0Z" />
            <path fill="#00bfb3" fill-opacity="0.07" d="M0 290c260-45 480-25 720-10s470 5 720-25V320H0Z" />
          </svg>

          <app-logo svgClass="h-8 w-auto" />

          <div class="my-auto w-full max-w-sm py-10">
            <div class="rounded-md border border-slate/20 bg-white/85 p-6 shadow-sm shadow-navy/5 backdrop-blur-sm sm:p-7">
              <app-login-form [(department)]="department" />
            </div>
          </div>

          <p class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-night/60">
            <span>© {{ year }} Harbour and Hills Financial Services Limited</span>
            <span aria-hidden="true">·</span>
            <a class="hover:text-navy hover:underline" href="mailto:tech.support&#64;harbourandhills.com">Login support</a>
          </p>
        </div>

        <section class="mt-10">
          <h2 class="mb-3 text-xs font-semibold uppercase tracking-widest text-navy">Security information</h2>
          <ul class="grid gap-2 text-xs leading-relaxed text-night/55 sm:grid-cols-2 lg:grid-cols-3">
            <li>Ensure the address bar starts with <a class="font-medium text-navy hover:underline" [href]="site">{{ site }}</a>.</li>
            <li>Never share your PIN, OTP, User ID or Password with anyone.</li>
            <li>Do not enter login or other sensitive information in any pop up window.</li>
            <li>Login issues: <a class="font-medium text-navy hover:underline" href="mailto:tech.support&#64;harbourandhills.com">tech.support&#64;harbourandhills.com</a>.</li>
            <li>The URL is inaccessible in sanctioned/embargoed countries.</li>
          </ul>
        </section>

        <!-- The badge and partner artwork is drawn in white, so it sits on navy rather than on the page -->
        <footer class="mt-8 rounded-md bg-navy px-6 py-7 text-white sm:px-8">
          <div class="grid gap-7">
            <div>
              <p class="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/45">Digital security</p>
              <ul class="flex flex-wrap items-center gap-4">
                @for (b of badges; track b) {
                  <li><img [src]="'assets/login/' + b + '.svg'" [alt]="b.replaceAll('-', ' ')" class="h-9 w-auto" /></li>
                }
              </ul>
            </div>
            <div>
              <p class="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/45">Powered by</p>
              <ul class="flex flex-wrap items-center gap-3">
                @for (p of poweredBy; track p) {
                  <li><img [src]="'assets/login/' + p + '.svg'" [alt]="p.replaceAll('-', ' ')" class="h-9 w-auto" /></li>
                }
              </ul>
            </div>
          </div>
        </footer>
      </div>
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
