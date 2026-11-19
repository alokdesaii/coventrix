import { AfterViewInit, Component, Directive, ElementRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiError, DEPARTMENTS, forgotPassword, login, verifyOtp, type Department } from '../api/auth';

type Step = 'credentials' | 'otp' | 'forgot' | 'forgot-sent';

/** The native autofocus attribute only fires on page load, so it misses the fields each later step creates. */
@Directive({ selector: '[appAutofocus]', standalone: true })
export class AutofocusDirective implements AfterViewInit {
  private el: ElementRef<HTMLElement> = inject(ElementRef);
  ngAfterViewInit() {
    this.el.nativeElement.focus();
  }
}

// Same control styles as the rest of the portal (see shared/ui.ts and the MBO screens).
const field =
  'h-10 w-full rounded border border-slate/40 bg-white px-3 text-sm text-night outline-none transition placeholder:text-slate hover:border-slate/60 focus:border-teal focus:ring-2 focus:ring-teal/20';
const primary =
  'h-10 w-full rounded bg-navy text-sm font-semibold text-white transition hover:bg-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-40';
const link = 'text-xs font-medium text-navy underline-offset-4 transition hover:underline';
const label = 'mb-1.5 block text-xs font-medium text-night/60';
const heading = 'text-base font-semibold text-navy';
const sub = 'mt-1.5 text-xs leading-relaxed text-slate';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [FormsModule, AutofocusDirective],
  template: `
    @switch (step) {
      @case ('credentials') {
        <form class="flex flex-col" (ngSubmit)="submitCredentials()">
          <header class="mb-6">
            <h2 [class]="heading">Sign in</h2>
            <p [class]="sub">Choose your department and sign in. You will confirm with a one-time code.</p>
          </header>

          <div class="mb-4">
            <label [class]="label" for="department">Department</label>
            <!-- appearance-none + our own chevron: the native arrow sits flush against the border -->
            <div class="relative">
              <select id="department" name="department" [class]="field + ' cursor-pointer appearance-none pr-10'"
                [ngModel]="department" (ngModelChange)="departmentChange.emit($event)">
                @for (d of departments; track d.id) {
                  <option [value]="d.id">{{ d.label }}</option>
                }
              </select>
              <svg viewBox="0 0 24 24" class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>

          <div class="mb-4">
            <label [class]="label" for="username">Username</label>
            <input id="username" [class]="field" placeholder="eg. akash.p" autocomplete="username" appAutofocus
              name="username" [(ngModel)]="username" />
          </div>

          <div class="mb-6">
            <label [class]="label" for="password">Password</label>
            <div class="relative">
              <input id="password" [class]="field + ' pr-11'" [type]="show ? 'text' : 'password'" placeholder="Enter your password"
                autocomplete="current-password" name="password" [(ngModel)]="password" />
              <button type="button" class="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded text-slate transition hover:text-navy"
                [attr.aria-label]="show ? 'Hide password' : 'Show password'" (click)="show = !show">
                <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
                  @if (show) { <path d="m3 3 18 18" /> }
                </svg>
              </button>
            </div>
          </div>

          <button [class]="primary" [disabled]="busy || !username || !password">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
          <!-- after Sign in, so Tab goes Username -> Password -> Sign in -->
          <button type="button" [class]="link + ' mt-5 self-start'" (click)="go('forgot')">Forgot password?</button>
        </form>
      }
      @case ('otp') {
        <form class="flex flex-col" (ngSubmit)="submitOtp()">
          <header class="mb-6">
            <h2 [class]="heading">Verify your identity</h2>
            <p [class]="sub">Enter the 6-digit code sent to your registered email address.</p>
          </header>
          <input [class]="field + ' mb-6 text-center text-lg tracking-[0.6em]'" inputmode="numeric" maxlength="6"
            autocomplete="one-time-code" appAutofocus placeholder="••••••" aria-label="One-time password"
            name="otp" [ngModel]="otp" (ngModelChange)="otp = $event.replace(digitsOnly, '')" />
          <button [class]="primary" [disabled]="busy || otp.length !== 6">{{ busy ? 'Verifying…' : 'Verify and continue' }}</button>
          <button type="button" [class]="link + ' mt-5 self-center'" (click)="go('credentials')">Back to sign in</button>
        </form>
      }
      @case ('forgot') {
        <form class="flex flex-col" (ngSubmit)="submitForgot()">
          <header class="mb-6">
            <h2 [class]="heading">Reset your password</h2>
            <p [class]="sub">We will email you a link to set a new password.</p>
          </header>
          <div class="mb-7">
            <label [class]="label" for="email">Email address</label>
            <input id="email" [class]="field" type="email" placeholder="you&#64;harbourandhills.com" autocomplete="email" appAutofocus
              name="email" [(ngModel)]="email" />
          </div>
          <button [class]="primary" [disabled]="busy || !email">{{ busy ? 'Submitting…' : 'Send reset link' }}</button>
          <button type="button" [class]="link + ' mt-5 self-center'" (click)="go('credentials')">Back to sign in</button>
        </form>
      }
      @case ('forgot-sent') {
        <div class="flex flex-col text-center">
          <span class="mx-auto mb-5 grid size-11 place-items-center rounded-full bg-teal/10 text-[#00857d]">
            <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="m3.5 7.5 8.5 6 8.5-6" /></svg>
          </span>
          <h2 [class]="heading">Check your email</h2>
          <p [class]="sub">If an account exists for {{ email }}, you will receive reset instructions shortly.</p>
          <button type="button" [class]="link + ' mt-7 self-center'" (click)="go('credentials')">Back to sign in</button>
        </div>
      }
    }

    @if (error) {
      <p role="alert" class="mt-5 rounded border border-red-200 bg-red-50 px-3 py-2.5 text-center text-xs text-red-700">{{ error }}</p>
    }
  `,
})
export class LoginFormComponent {
  @Input({ required: true }) department!: Department;
  @Output() departmentChange = new EventEmitter<Department>();

  private router = inject(Router);
  readonly departments = DEPARTMENTS;
  readonly field = field;
  readonly primary = primary;
  readonly link = link;
  readonly label = label;
  readonly heading = heading;
  readonly sub = sub;
  readonly digitsOnly = /\D/g;

  step: Step = 'credentials';
  username = '';
  password = '';
  otp = '';
  email = '';
  challengeId = '';
  show = false;
  busy = false;
  error = '';

  go(s: Step) {
    this.error = '';
    this.step = s;
  }

  private async run(fn: () => Promise<void>) {
    this.busy = true;
    this.error = '';
    try {
      await fn();
    } catch (e) {
      this.error = e instanceof ApiError ? e.message : 'Something went wrong. Please try again.';
    } finally {
      this.busy = false;
    }
  }

  submitCredentials() {
    this.run(async () => {
      const res = await login({ department: this.department, username: this.username, password: this.password });
      this.challengeId = res.challengeId;
      this.go('otp');
    });
  }

  submitOtp() {
    this.run(async () => {
      await verifyOtp({ challengeId: this.challengeId, otp: this.otp });
      // ponytail: every department lands on the BD dashboard until other portals are ported
      this.router.navigateByUrl('/bd/dashboard');
    });
  }

  submitForgot() {
    this.run(async () => {
      await forgotPassword({ email: this.email });
      this.go('forgot-sent');
    });
  }
}
