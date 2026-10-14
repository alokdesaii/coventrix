import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiError, forgotPassword, login, verifyOtp, type Department } from '../api/auth';

type Step = 'credentials' | 'otp' | 'forgot' | 'forgot-sent';

const input =
  'h-10 w-full rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-slate outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30';
const primary =
  'h-10 w-full rounded-md bg-teal text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const link = 'text-xs font-medium text-white/80 underline-offset-4 hover:text-white hover:underline';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex h-full flex-col justify-center gap-4 p-5">
      @switch (step) {
        @case ('credentials') {
          <form class="flex flex-col gap-3" (ngSubmit)="submitCredentials()">
            <h3 class="mb-1 text-center text-xl font-semibold text-white">Login</h3>
            <input [class]="input" placeholder="Username" autocomplete="username" autofocus
              name="username" [(ngModel)]="username" aria-label="Username" />
            <input [class]="input" type="password" placeholder="Password" autocomplete="current-password"
              name="password" [(ngModel)]="password" aria-label="Password" />
            <button type="button" [class]="link + ' -mt-1 self-end'" (click)="go('forgot')">Forgot password?</button>
            <button [class]="primary" [disabled]="busy || !username || !password">{{ busy ? 'Signing in…' : 'Login' }}</button>
          </form>
        }
        @case ('otp') {
          <form class="flex flex-col gap-3" (ngSubmit)="submitOtp()">
            <h3 class="text-center text-xl font-semibold text-white">Verify OTP</h3>
            <p class="text-center text-xs leading-relaxed text-white/70">
              Please enter the OTP received on your registered email address.
            </p>
            <input [class]="input + ' text-center tracking-[0.5em]'" inputmode="numeric" maxlength="6"
              autocomplete="one-time-code" autofocus placeholder="••••••" aria-label="One-time password"
              name="otp" [ngModel]="otp" (ngModelChange)="otp = $event.replace(digitsOnly, '')" />
            <button [class]="primary" [disabled]="busy || otp.length !== 6">{{ busy ? 'Verifying…' : 'Verify' }}</button>
          </form>
        }
        @case ('forgot') {
          <form class="flex flex-col gap-3" (ngSubmit)="submitForgot()">
            <h3 class="text-center text-xl font-semibold text-white">Reset password</h3>
            <input [class]="input" type="email" placeholder="Email address" autocomplete="email" autofocus
              name="email" [(ngModel)]="email" aria-label="Email address" />
            <button [class]="primary" [disabled]="busy || !email">{{ busy ? 'Submitting…' : 'Submit' }}</button>
            <button type="button" [class]="link + ' self-center'" (click)="go('credentials')">Back to Login</button>
          </form>
        }
        @case ('forgot-sent') {
          <div class="flex flex-col gap-3 text-center">
            <h3 class="text-xl font-semibold text-white">Check your email</h3>
            <p class="text-xs leading-relaxed text-white/70">
              If an account exists for {{ email }}, you will receive reset instructions shortly.
            </p>
            <button type="button" [class]="link" (click)="go('credentials')">Back to Login</button>
          </div>
        }
      }

      @if (error) {
        <p role="alert" class="text-center text-xs text-red-300">{{ error }}</p>
      }

      @if (step !== 'forgot' && step !== 'forgot-sent') {
        <button type="button" [class]="link + ' self-center'" (click)="back.emit()">Back</button>
      }
    </div>
  `,
})
export class LoginFormComponent {
  @Input({ required: true }) department!: Department;
  @Output() back = new EventEmitter<void>();

  private router = inject(Router);
  readonly input = input;
  readonly primary = primary;
  readonly link = link;
  readonly digitsOnly = /\D/g;

  step: Step = 'credentials';
  username = '';
  password = '';
  otp = '';
  email = '';
  challengeId = '';
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
