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

const field =
  'h-11 w-full rounded-lg border border-white/20 bg-white/10 px-3.5 text-sm text-white outline-none transition placeholder:text-label/40 hover:border-white/35 focus:border-teal focus:bg-white/15 focus:ring-2 focus:ring-teal/30';
const primary =
  'h-11 w-full rounded-lg bg-teal text-sm font-semibold text-ink transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-40';
const link = 'text-xs font-medium text-label/70 underline-offset-4 transition hover:text-white hover:underline';
const label = 'mb-1.5 block text-xs font-medium text-label/70';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [FormsModule, AutofocusDirective],
  template: `
    @switch (step) {
      @case ('credentials') {
        <form class="flex flex-col gap-4" (ngSubmit)="submitCredentials()">
          <div>
            <h2 class="text-2xl font-semibold">Sign in</h2>
            <p class="mt-1 text-xs text-label/60">Welcome back. Choose your department to continue.</p>
          </div>

          <div>
            <label [class]="label" for="department">Department</label>
            <!-- appearance-none + our own chevron: the native arrow sits flush against the border -->
            <div class="relative">
              <select id="department" name="department" [class]="field + ' cursor-pointer appearance-none pr-10'"
                [ngModel]="department" (ngModelChange)="departmentChange.emit($event)">
                @for (d of departments; track d.id) {
                  <option [value]="d.id" class="bg-navy text-white">{{ d.label }}</option>
                }
              </select>
              <svg viewBox="0 0 24 24" class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-label/60"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>

          <div>
            <label [class]="label" for="username">Username</label>
            <input id="username" [class]="field" placeholder="Enter your username" autocomplete="username" appAutofocus
              name="username" [(ngModel)]="username" />
          </div>

          <div>
            <label [class]="label" for="password">Password</label>
            <div class="relative">
              <input id="password" [class]="field + ' pr-11'" [type]="show ? 'text' : 'password'" placeholder="Enter your password"
                autocomplete="current-password" name="password" [(ngModel)]="password" />
              <button type="button" class="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-label/60 transition hover:text-white"
                [attr.aria-label]="show ? 'Hide password' : 'Show password'" (click)="show = !show">
                <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
                  @if (show) { <path d="m3 3 18 18" /> }
                </svg>
              </button>
            </div>
            <!-- after the input, so Tab from Username lands on Password, not on this link -->
            <button type="button" [class]="link + ' mt-2 block ml-auto'" (click)="go('forgot')">Forgot password?</button>
          </div>

          <button [class]="primary" [disabled]="busy || !username || !password">{{ busy ? 'Signing in…' : 'Login' }}</button>
        </form>
      }
      @case ('otp') {
        <form class="flex flex-col gap-4" (ngSubmit)="submitOtp()">
          <div>
            <h2 class="text-2xl font-semibold">Verify OTP</h2>
            <p class="mt-1 text-xs leading-relaxed text-label/60">Please enter the OTP received on your registered email address.</p>
          </div>
          <input [class]="field + ' text-center text-lg tracking-[0.6em]'" inputmode="numeric" maxlength="6"
            autocomplete="one-time-code" appAutofocus placeholder="••••••" aria-label="One-time password"
            name="otp" [ngModel]="otp" (ngModelChange)="otp = $event.replace(digitsOnly, '')" />
          <button [class]="primary" [disabled]="busy || otp.length !== 6">{{ busy ? 'Verifying…' : 'Verify' }}</button>
          <button type="button" [class]="link + ' self-center'" (click)="go('credentials')">Back to Login</button>
        </form>
      }
      @case ('forgot') {
        <form class="flex flex-col gap-4" (ngSubmit)="submitForgot()">
          <div>
            <h2 class="text-2xl font-semibold">Reset password</h2>
            <p class="mt-1 text-xs leading-relaxed text-label/60">We will email you a link to set a new password.</p>
          </div>
          <div>
            <label [class]="label" for="email">Email address</label>
            <input id="email" [class]="field" type="email" placeholder="you&#64;harbourandhills.com" autocomplete="email" appAutofocus
              name="email" [(ngModel)]="email" />
          </div>
          <button [class]="primary" [disabled]="busy || !email">{{ busy ? 'Submitting…' : 'Submit' }}</button>
          <button type="button" [class]="link + ' self-center'" (click)="go('credentials')">Back to Login</button>
        </form>
      }
      @case ('forgot-sent') {
        <div class="flex flex-col gap-4 text-center">
          <h2 class="text-2xl font-semibold">Check your email</h2>
          <p class="text-xs leading-relaxed text-label/60">
            If an account exists for {{ email }}, you will receive reset instructions shortly.
          </p>
          <button type="button" [class]="link" (click)="go('credentials')">Back to Login</button>
        </div>
      }
    }

    @if (error) {
      <p role="alert" class="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200">{{ error }}</p>
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
