import { Component } from '@angular/core';
import { DEPARTMENTS, type Department } from '../api/auth';
import { LogoComponent } from '../shared/logo.component';
import { LoginFormComponent, type Step } from './login-form.component';

const BADGES = ['digicert', 'iso-certified', 'secured-platform', 'password-security', 'transaction-alerts', '3-eye'];
const POWERED_BY = ['qor3-plus-white', 'edge-plus', 'conentrix', 'digiqor-plus', 'ficoy-plus', 'xirni', 'h-intelligence', 'prolink-plus'];

// The three cards on the gradient panel; the one matching the form's current step is highlighted.
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
    <main class="min-h-dvh bg-ink px-4 py-8 text-white sm:px-6 lg:py-12">
      <div class="mx-auto w-full max-w-6xl">
        <div class="grid overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50 lg:grid-cols-[1.08fr_1fr]">
          <!-- Gradient panel -->
          <section class="relative hidden flex-col justify-end gap-10 p-10 xl:p-12 lg:flex
            bg-[radial-gradient(at_18%_12%,#00bfb3_0px,transparent_55%),radial-gradient(at_85%_8%,#0b6e82_0px,transparent_45%),radial-gradient(at_70%_95%,#023e63_0px,transparent_55%),linear-gradient(155deg,#025a79,#012f4a_55%,#01202f)]">
            <div class="grid gap-x-10 gap-y-5 lg:grid-cols-[1.45fr_1fr] lg:items-end">
              <h1 class="text-[2.1rem] font-semibold leading-[1.12] tracking-tight xl:text-[2.6rem]">
                Secure access for every desk.
              </h1>
              <p class="text-sm leading-relaxed text-white/70">
                One portal for BD, Payments, Compliance and the rest. Pick your department to begin.
              </p>
            </div>

            <ol class="grid gap-3 sm:grid-cols-3">
              @for (s of steps; track s.title; let i = $index) {
                <li class="rounded-xl border p-4 transition duration-300"
                  [class]="s.step === step
                    ? 'border-transparent bg-white text-ink shadow-lg shadow-black/20'
                    : 'border-white/15 bg-white/10 text-white/80 backdrop-blur-sm'">
                  <span class="grid size-6 place-items-center rounded-full text-[11px] font-semibold"
                    [class]="s.step === step ? 'bg-ink text-white' : 'bg-white/20 text-white'">{{ i + 1 }}</span>
                  <p class="mt-3 text-sm font-medium leading-snug">{{ s.title }}</p>
                  <p class="mt-1 text-xs leading-snug" [class]="s.step === step ? 'text-ink/60' : 'text-white/50'">{{ s.note }}</p>
                </li>
              }
            </ol>
          </section>

          <!-- Form panel -->
          <section class="flex flex-col justify-center bg-[#04121c] px-6 py-12 sm:px-10 lg:px-12">
            <div class="mx-auto w-full max-w-[21rem]">
              <!-- display:contents host, so mx-auto goes on the svg itself -->
              <app-logo tone="light" svgClass="mx-auto mb-9 h-7 w-auto" />
              <app-login-form [(department)]="department" (stepChange)="step = $event" />
            </div>
          </section>
        </div>

        <footer class="mt-12 text-xs leading-relaxed text-label/45">
          <div class="grid gap-10 border-t border-white/10 pt-10 md:grid-cols-[1.5fr_1fr]">
            <section>
              <h2 class="mb-3 text-xs font-semibold uppercase tracking-widest text-label/60">Security information</h2>
              <ul class="grid gap-2 sm:grid-cols-2">
                <li>Ensure the address bar starts with <a class="text-teal/80 hover:text-teal hover:underline" [href]="site">{{ site }}</a>.</li>
                <li>Never share your PIN, OTP, User ID or Password with anyone.</li>
                <li>Do not enter login or other sensitive information in any pop up window.</li>
                <li>Login issues: <a class="text-teal/80 hover:text-teal hover:underline" href="mailto:tech.support&#64;harbourandhills.com">tech.support&#64;harbourandhills.com</a>.</li>
                <li>The URL is inaccessible in sanctioned/embargoed countries.</li>
              </ul>
            </section>
            <section>
              <h2 class="mb-3 text-xs font-semibold uppercase tracking-widest text-label/60">Digital security</h2>
              <ul class="grid max-w-xs grid-cols-3 items-center gap-x-5 gap-y-4">
                @for (b of badges; track b) {
                  <li><img [src]="'assets/login/' + b + '.svg'" [alt]="b.replaceAll('-', ' ')" class="h-9 w-auto opacity-60 transition hover:opacity-100" /></li>
                }
              </ul>
            </section>
          </div>

          <div class="mt-10 flex flex-col items-center gap-5 border-t border-white/10 pt-8">
            <ul class="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 opacity-50">
              @for (p of poweredBy; track p) {
                <li><img [src]="'assets/login/' + p + '.svg'" [alt]="p.replaceAll('-', ' ')" class="h-4 w-auto" /></li>
              }
            </ul>
            <p>© {{ year }} Harbour and Hills Financial Services Limited</p>
          </div>
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
