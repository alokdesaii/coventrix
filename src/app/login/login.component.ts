import { Component } from '@angular/core';
import { DEPARTMENTS, type Department } from '../api/auth';
import { LogoComponent } from '../shared/logo.component';
import { LoginFormComponent, type Step } from './login-form.component';

const BADGES = ['digicert', 'iso-certified', 'secured-platform', 'password-security', 'transaction-alerts', '3-eye'];
const POWERED_BY = ['qor3-plus-white', 'edge-plus', 'conentrix', 'digiqor-plus', 'ficoy-plus', 'xirni', 'h-intelligence', 'prolink-plus'];

// The three cards on the navy panel; the one matching the form's current step is highlighted.
const STEPS: { step: Step | null; title: string; note: string }[] = [
  { step: 'credentials', title: 'Choose your department', note: 'Sign in with your Coventrix credentials.' },
  { step: 'otp', title: 'Verify with OTP', note: 'A one-time code goes to your registered email.' },
  { step: null, title: 'Open your workspace', note: 'Land straight on your department dashboard.' },
];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [LogoComponent, LoginFormComponent],
  template: `
    <main class="min-h-dvh bg-mist px-4 py-8 text-night sm:px-6 lg:py-12">
      <div class="mx-auto w-full max-w-6xl">
        <div class="grid overflow-hidden rounded-md border border-slate/20 bg-white shadow-xl shadow-navy/5 lg:grid-cols-[1.08fr_1fr]">
          <!-- Navy panel — same navy as the portal sidebar -->
          <section class="relative hidden flex-col justify-end gap-10 p-10 xl:p-12 lg:flex
            bg-[radial-gradient(at_15%_10%,#0a6b7d_0px,transparent_55%),radial-gradient(at_90%_5%,#024f73_0px,transparent_45%),linear-gradient(155deg,#023e63,#012a45)] text-white">
            <!-- app-logo is display:contents, so these sit on the svg: self-start stops it
                 stretching to the column width, mb-auto holds it at the top of the panel -->
            <app-logo tone="light" svgClass="h-8 w-auto self-start mb-auto" />

            <div class="grid gap-x-10 gap-y-5 lg:grid-cols-[1.45fr_1fr] lg:items-end">
              <h1 class="text-[2.1rem] font-semibold leading-[1.12] tracking-tight xl:text-[2.5rem]">
                Secure access for every desk.
              </h1>
              <p class="text-sm leading-relaxed text-white/70">
                One portal for BD, Payments, Compliance and the rest. Pick your department to begin.
              </p>
            </div>

            <ol class="grid gap-3 sm:grid-cols-3">
              @for (s of steps; track s.title; let i = $index) {
                <li class="rounded border p-4 transition duration-300"
                  [class]="s.step === step
                    ? 'border-transparent bg-white text-navy shadow-lg shadow-ink/20'
                    : 'border-white/20 bg-white/10 text-white/80'">
                  <span class="grid size-6 place-items-center rounded-full text-[11px] font-semibold"
                    [class]="s.step === step ? 'bg-navy text-white' : 'bg-white/20 text-white'">{{ i + 1 }}</span>
                  <p class="mt-3 text-sm font-medium leading-snug">{{ s.title }}</p>
                  <p class="mt-1 text-xs leading-snug" [class]="s.step === step ? 'text-navy/60' : 'text-white/55'">{{ s.note }}</p>
                </li>
              }
            </ol>
          </section>

          <!-- Form panel -->
          <section class="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-12">
            <div class="mx-auto w-full max-w-[21rem]">
              <!-- display:contents host, so mx-auto goes on the svg itself -->
              <app-logo svgClass="mx-auto mb-9 h-7 w-auto" />
              <app-login-form [(department)]="department" (stepChange)="step = $event" />
            </div>
          </section>
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
          <p class="mt-7 border-t border-white/15 pt-5 text-center text-xs text-white/50">
            © {{ year }} Harbour and Hills Financial Services Limited
          </p>
        </footer>
      </div>
    </main>
  `,
})
export class LoginComponent {
  readonly departments = DEPARTMENTS;
  readonly badges = BADGES;
  readonly poweredBy = POWERED_BY;
  readonly steps = STEPS;
  readonly site = 'https://coventrix.harbourandhills.com';
  readonly year = new Date().getFullYear();

  department: Department = 'bd-cbd';
  step: Step = 'credentials';
}
