import { Component } from '@angular/core';
import { DEPARTMENTS, type Department } from '../api/auth';
import { LogoComponent } from '../shared/logo.component';
import { LoginFormComponent } from './login-form.component';

const BADGES = ['digicert', 'iso-certified', 'secured-platform', 'password-security', 'transaction-alerts', '3-eye'];
const POWERED_BY = ['qor3-plus-white', 'edge-plus', 'conentrix', 'digiqor-plus', 'ficoy-plus', 'xirni', 'h-intelligence', 'prolink-plus'];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [LogoComponent, LoginFormComponent],
  template: `
    <main class="min-h-dvh bg-[radial-gradient(ellipse_at_top_left,#00bfb340,transparent_55%),linear-gradient(160deg,#023e63,#012a45_60%,#000c14)] text-white lg:grid lg:grid-cols-[1.1fr_1fr]">
      <!-- Visual panel: the artwork follows the department chosen in the form. -->
      <aside class="relative isolate hidden flex-col justify-between overflow-hidden p-10 xl:p-14 lg:flex">
        @for (d of departments; track d.id) {
          <img [src]="'assets/login/' + d.img" alt="" aria-hidden="true"
            class="absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-700"
            [class]="d.id === department ? 'opacity-100' : 'opacity-0'" />
        }
        <div class="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#012a45f2,#012a45b3_45%,#000c14d9)]"></div>

        <app-logo tone="light" svgClass="h-11 w-auto" />

        <div class="max-w-md">
          <p class="inline-flex items-center gap-2 rounded-full border border-teal/40 bg-teal/10 px-3 py-1 text-xs font-medium text-teal">
            <span class="size-1.5 rounded-full bg-teal"></span>
            {{ current().label }}
          </p>
          <h1 class="mt-5 text-4xl font-semibold leading-tight xl:text-[2.75rem]">
            One portal.<br />Every department.
          </h1>
          <p class="mt-4 text-sm leading-relaxed text-label/70">
            Choose your department, sign in once, and pick up exactly where your team left off.
          </p>
        </div>

        <div>
          <p class="mb-4 text-xs font-medium uppercase tracking-widest text-label/50">Digital security</p>
          <ul class="grid w-fit grid-cols-3 items-center gap-x-6 gap-y-4">
            @for (b of badges; track b) {
              <li><img [src]="'assets/login/' + b + '.svg'" [alt]="b.replaceAll('-', ' ')" class="h-10 w-auto opacity-90" /></li>
            }
          </ul>
        </div>
      </aside>

      <!-- Form column -->
      <div class="flex flex-col gap-10 px-4 py-10 sm:px-8 lg:px-10 lg:py-12">
        <header class="flex justify-center lg:hidden">
          <app-logo tone="light" svgClass="h-10 w-auto" />
        </header>

        <div class="mx-auto w-full max-w-sm lg:my-auto">
          <div class="rounded-2xl border border-white/15 bg-white/[0.07] p-6 shadow-2xl shadow-ink/40 backdrop-blur-xl sm:p-7">
            <app-login-form [(department)]="department" />
          </div>
        </div>

        <div class="mx-auto w-full max-w-sm space-y-8 lg:max-w-md">
          <section>
            <h2 class="mb-3 text-sm font-semibold">Security Information</h2>
            <ul class="list-disc space-y-2 pl-4 text-xs leading-relaxed text-label/60 marker:text-teal">
              <li>Before logging in, please ensure that the URL address on the address bar of your internet browser starts with <a class="text-teal hover:underline" [href]="site">{{ site }}</a>.</li>
              <li>Never share your PIN, OTP, User ID, or Password with anyone. Sharing these details can lead to unauthorized access to your account.</li>
              <li>Do not enter login or other sensitive information in any pop up window.</li>
              <li>Contact us at <a class="text-teal hover:underline" href="mailto:tech.support&#64;harbourandhills.com">tech.support&#64;harbourandhills.com</a> for any issue related to login.</li>
              <li>The URL is inaccessible in sanctioned/embargoed countries.</li>
            </ul>
          </section>

          <section class="lg:hidden">
            <h2 class="mb-3 text-sm font-semibold">Digital Security</h2>
            <ul class="grid grid-cols-3 gap-3 sm:grid-cols-6">
              @for (b of badges; track b) {
                <li class="flex h-12 items-center justify-center">
                  <img [src]="'assets/login/' + b + '.svg'" [alt]="b.replaceAll('-', ' ')" class="max-h-full max-w-full" />
                </li>
              }
            </ul>
          </section>

          <footer class="border-t border-white/15 pt-6 text-center">
            <p class="mb-4 text-xs font-medium uppercase tracking-widest text-label/50">Powered by</p>
            <ul class="flex flex-wrap items-center justify-center gap-3">
              @for (p of poweredBy; track p) {
                <li><img [src]="'assets/login/' + p + '.svg'" [alt]="p.replaceAll('-', ' ')" class="h-5 w-auto" /></li>
              }
            </ul>
            <p class="mt-6 text-xs text-label/50">© {{ year }} Harbour and Hills Financial Services Limited</p>
          </footer>
        </div>
      </div>
    </main>
  `,
})
export class LoginComponent {
  readonly departments = DEPARTMENTS;
  readonly badges = BADGES;
  readonly poweredBy = POWERED_BY;
  readonly site = 'https://coventrix.harbourandhills.com';
  readonly year = new Date().getFullYear();

  department: Department = 'bd-cbd';
  current = () => this.departments.find((d) => d.id === this.department)!;
}
