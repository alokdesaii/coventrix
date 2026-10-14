import { Component } from '@angular/core';
import type { Department } from '../api/auth';
import { LogoComponent } from '../shared/logo.component';
import { LoginFormComponent } from './login-form.component';

const DEPARTMENTS: { id: Department; label: string; img: string }[] = [
  { id: 'bd-cbd', label: 'BD/CBD', img: 'img-block-bd.png' },
  { id: 'it', label: 'IT', img: 'img-block-it.png' },
  { id: 'marketing', label: 'Marketing', img: 'img-block-marketing.png' },
  { id: 'legal', label: 'Legal', img: 'img-block-legal.png' },
  { id: 'customer-service', label: 'Customer Service', img: 'img-block-cs.png' },
  { id: 'payment', label: 'Payment', img: 'img-block-payments.png' },
  { id: 'compliance', label: 'Compliance', img: 'img-block-compliance.png' },
];

const BADGES = ['digicert', 'iso-certified', 'secured-platform', 'password-security', 'transaction-alerts', '3-eye'];
const POWERED_BY = ['qor3-plus-white', 'edge-plus', 'conentrix', 'digiqor-plus', 'ficoy-plus', 'xirni', 'h-intelligence', 'prolink-plus'];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [LogoComponent, LoginFormComponent],
  template: `
    <main class="min-h-dvh bg-[radial-gradient(ellipse_at_top_left,#00bfb340,transparent_55%),linear-gradient(160deg,#023e63,#012a45_60%,#000c14)] text-white">
      <div class="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:py-14">
        <header class="flex justify-center">
          <app-logo tone="light" svgClass="h-10 w-auto sm:h-12" />
        </header>

        <section aria-label="Select your department" class="grid grid-cols-2 gap-4 md:grid-cols-4">
          @for (d of departments; track d.id) {
            <div class="relative aspect-[5/6] overflow-hidden rounded-md ring-2 transition"
              [class]="active === d.id ? 'ring-teal' : 'ring-white/80 hover:ring-teal'">
              <img [src]="'assets/login/' + d.img" alt=""
                class="absolute inset-0 h-full w-full object-cover transition duration-300"
                [class.scale-105]="active === d.id" [class.blur-sm]="active === d.id" />
              @if (active === d.id) {
                <div class="absolute inset-0 bg-navy/85 backdrop-blur-sm">
                  <app-login-form [department]="d.id" (back)="active = null" />
                </div>
              } @else {
                <button type="button" (click)="active = d.id"
                  class="absolute inset-x-3 bottom-3 h-10 rounded-md bg-white text-sm font-semibold text-navy shadow-md transition hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal">
                  {{ d.label }}
                </button>
              }
            </div>
          }
        </section>

        <section class="grid gap-8 border-t border-white/20 pt-8 md:grid-cols-12">
          <div class="md:col-span-5">
            <h2 class="mb-3 text-sm font-semibold">Security Information</h2>
            <ul class="list-disc space-y-2 pl-4 text-xs leading-relaxed text-slate marker:text-teal">
              <li>Before logging in, please ensure that the URL address on the address bar of your internet browser starts with <a class="text-teal hover:underline" [href]="site">{{ site }}</a>.</li>
              <li>Never share your PIN, OTP, User ID, or Password with anyone. Sharing these details can lead to unauthorized access to your account.</li>
              <li>Do not enter login or other sensitive information in any pop up window.</li>
              <li>Contact us at <a class="text-teal hover:underline" href="mailto:tech.support&#64;harbourandhills.com">tech.support&#64;harbourandhills.com</a> for any issue related to login.</li>
              <li>The URL is inaccessible in sanctioned/embargoed countries.</li>
            </ul>
          </div>
          <div class="md:col-span-7">
            <h2 class="mb-3 text-sm font-semibold">Digital Security</h2>
            <ul class="list-disc pl-4 text-xs leading-relaxed text-slate marker:text-teal">
              <li>Before logging in, please ensure that the URL address on the address bar of your internet browser starts with <a class="text-teal hover:underline" [href]="site">{{ site }}</a>.</li>
            </ul>
            <ul class="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
              @for (b of badges; track b) {
                <li class="flex h-14 items-center justify-center">
                  <img [src]="'assets/login/' + b + '.svg'" [alt]="b.replaceAll('-', ' ')" class="max-h-full max-w-full" />
                </li>
              }
            </ul>
          </div>
        </section>

        <footer class="border-t border-white/20 pt-8 text-center">
          <p class="mb-4 text-xs font-medium uppercase tracking-widest text-slate">Powered by</p>
          <ul class="flex flex-wrap items-center justify-center gap-3">
            @for (p of poweredBy; track p) {
              <li><img [src]="'assets/login/' + p + '.svg'" [alt]="p.replaceAll('-', ' ')" class="h-6 w-auto" /></li>
            }
          </ul>
          <p class="mt-8 text-xs text-slate">© {{ year }} Harbour and Hills Financial Services Limited</p>
        </footer>
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
  active: Department | null = null;
}
