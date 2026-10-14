import { NgTemplateOutlet } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { createClient, getStates, type ClientKind, type NewClient } from '../api/clients';
import { getCountries } from '../lib/countries';
import { PANEL, SelectComponent, type Option } from './ui';

type Addr = NewClient['corporateAddress'];
type Which = 'corporateAddress' | 'correspondenceAddress';
type TextKey = 'mobile' | 'phoneAreaCode' | 'phone' | 'faxAreaCode' | 'fax' | 'referredBy' | 'referralPartner' | 'website' | 'email';
const EMPTY_ADDR: Addr = { floor: '', blockUnit: '', buildingName: '', street: '', state: '' };

const INITIAL: NewClient = {
  kind: 'nbfi', companyName: '',
  corporateAddress: EMPTY_ADDR, correspondenceSameAsCorporate: false, correspondenceAddress: EMPTY_ADDR,
  mobile: '', phoneAreaCode: '', phone: '', country: '', faxAreaCode: '', fax: '',
  referredBy: '', referralPartner: '', website: '', email: '',
};

type Errors = Partial<Record<string, string>>;

function validate(f: NewClient): Errors {
  const e: Errors = {};
  const req = (key: string, v: string, label: string) => { if (!v.trim()) e[key] = `${label} is required`; };
  req('companyName', f.companyName, 'Company name');
  req('corp.floor', f.corporateAddress.floor, 'Floor');
  req('corp.blockUnit', f.corporateAddress.blockUnit, 'Block/Unit');
  req('corp.buildingName', f.corporateAddress.buildingName, 'Building name');
  req('corp.street', f.corporateAddress.street, 'Street no. & name');
  req('corp.state', f.corporateAddress.state, 'State');
  req('mobile', f.mobile, 'Mobile no.');
  req('country', f.country, 'Country');
  req('email', f.email, 'Email');
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e['email'] = 'Enter a valid email address';
  if (f.mobile && !/^\+?[\d\s-]{6,20}$/.test(f.mobile)) e['mobile'] = 'Enter a valid mobile number';
  return e;
}

const control = 'h-10 w-full rounded border bg-white px-3 text-sm text-night outline-none transition placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-mist disabled:text-slate';
const big = '[&_select]:h-10 [&_select]:text-sm';
const grid = 'grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-4';
const section = 'border-t border-slate/20 pt-6 first:border-t-0 first:pt-0';
const sectionTitle = 'mb-4 text-[15px] font-semibold text-navy';
const label = 'text-xs font-medium text-night/70';

const ADDR_FIELDS: [keyof Addr, string][] = [['floor', 'Floor'], ['blockUnit', 'Block/Unit'], ['buildingName', 'Building Name'], ['street', 'Street No. & Name']];
const OTHER_FIELDS: { k: TextKey; label: string; required?: boolean; type?: string; inputmode?: string }[] = [
  { k: 'mobile', label: 'Mobile No.', required: true, type: 'tel', inputmode: 'tel' },
  { k: 'phoneAreaCode', label: 'Phone Area Code', inputmode: 'tel' },
  { k: 'phone', label: 'Phone No.', type: 'tel', inputmode: 'tel' },
];
const OTHER_FIELDS_2: typeof OTHER_FIELDS = [
  { k: 'faxAreaCode', label: 'Fax Area Code', inputmode: 'tel' },
  { k: 'fax', label: 'Fax No.', type: 'tel', inputmode: 'tel' },
  { k: 'referredBy', label: 'Referred By' },
  { k: 'referralPartner', label: 'Referral Partner' },
  { k: 'website', label: 'Website', type: 'url', inputmode: 'url' },
  { k: 'email', label: 'Email', required: true, type: 'email', inputmode: 'email' },
];

// Shared add-client form. Pass `kind` to lock the institution type (hides the picker).
@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [NgTemplateOutlet, SelectComponent],
  template: `
    <form (submit)="onSubmit($event)" novalidate>
      <h1 class="mb-5 text-xl font-semibold text-navy">{{ title }}</h1>

      <div [class]="panel + ' flex flex-col gap-6'">
        @if (!kind) {
          <section [class]="section">
            <h2 [class]="sectionTitle">Institution</h2>
            <div [class]="grid">
              <label class="flex flex-col gap-1.5">
                <span [class]="labelCls">Please select the institution<span class="text-red-600"> *</span></span>
                <app-select [class]="big" label="Institution" [value]="form.kind" (valueChange)="form.kind = $event" [options]="institutions" />
              </label>
            </div>
          </section>
        }

        <section [class]="section">
          <h2 [class]="sectionTitle">Add New Client</h2>
          <div [class]="grid">
            <div class="sm:col-span-2">
              <ng-container *ngTemplateOutlet="textField; context: { key: 'companyName', label: 'Company Name', required: true, value: form.companyName, set: setCompany }" />
            </div>
          </div>
        </section>

        <section [class]="section">
          <h2 [class]="sectionTitle">Client Corporate / Correspondence Address</h2>
          <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate">Corporate address</h3>
          <ng-container *ngTemplateOutlet="address; context: { which: 'corporateAddress', value: form.corporateAddress, required: true, disabled: false }" />

          <div class="mb-3 mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-slate">Correspondence address</h3>
            <label class="flex items-center gap-2 text-sm text-night">
              <input type="checkbox" class="size-4 accent-navy" [checked]="form.correspondenceSameAsCorporate"
                (change)="form.correspondenceSameAsCorporate = $any($event.target).checked" />
              Same as corporate address
            </label>
          </div>
          <ng-container *ngTemplateOutlet="address; context: { which: 'correspondenceAddress', value: corr(), required: false, disabled: form.correspondenceSameAsCorporate }" />
        </section>

        <section [class]="section">
          <h2 [class]="sectionTitle">Other Details</h2>
          <div [class]="grid">
            @for (f of otherFields; track f.k) { <ng-container *ngTemplateOutlet="otherField; context: { $implicit: f }" /> }
            <label class="flex flex-col gap-1.5">
              <span [class]="labelCls">Country<span class="text-red-600"> *</span></span>
              <app-select [class]="big" label="Country" [value]="form.country" [invalid]="!!errors['country']"
                (valueChange)="form.country = $event" [options]="countries" />
              @if (errors['country']) { <span class="text-xs text-red-600">{{ errors['country'] }}</span> }
            </label>
            @for (f of otherFields2; track f.k) { <ng-container *ngTemplateOutlet="otherField; context: { $implicit: f }" /> }
          </div>
        </section>

        <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
          @if (saveError) { <p role="alert" class="mr-auto text-sm text-red-600">{{ saveError }}</p> }
          @if (submitted && hasErrors) { <p role="alert" class="mr-auto text-sm text-red-600">Please fix the highlighted fields.</p> }
          <button type="button" (click)="router.navigateByUrl(listHref())"
            class="h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist">Cancel</button>
          <button [disabled]="saving" class="h-10 rounded bg-navy px-6 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-50">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </form>

    <ng-template #textField let-key="key" let-label="label" let-required="required" let-value="value" let-set="set" let-type="type" let-inputmode="inputmode" let-disabled="disabled">
      <label class="flex flex-col gap-1.5">
        <span [class]="labelCls">{{ label }}@if (required) {<span class="text-red-600"> *</span>}</span>
        <input [class]="cls(key)" [type]="type ?? 'text'" [attr.inputmode]="inputmode" [value]="value" [disabled]="!!disabled"
          [attr.aria-invalid]="!!errors[key]" (input)="set($any($event.target).value)" />
        @if (errors[key]) { <span class="text-xs text-red-600">{{ errors[key] }}</span> }
      </label>
    </ng-template>

    <ng-template #otherField let-f>
      <ng-container *ngTemplateOutlet="textField; context: { key: f.k, label: f.label, required: f.required, type: f.type, inputmode: f.inputmode, value: $any(form)[f.k], set: setter(f.k) }" />
    </ng-template>

    <ng-template #address let-which="which" let-value="value" let-required="required" let-disabled="disabled">
      <div [class]="grid">
        @for (a of addrFields; track a[0]) {
          <ng-container *ngTemplateOutlet="textField; context: { key: prefix(which) + '.' + a[0], label: a[1], required, disabled, value: value[a[0]], set: addrSetter(which, a[0]) }" />
        }
        <label class="flex flex-col gap-1.5">
          <span [class]="labelCls">State@if (required) {<span class="text-red-600"> *</span>}</span>
          <app-select [class]="big" label="State" [value]="value.state" [disabled]="disabled" [invalid]="!!errors[prefix(which) + '.state']"
            (valueChange)="addrSetter(which, 'state')($event)" [options]="stateOpts" />
          @if (errors[prefix(which) + '.state']) { <span class="text-xs text-red-600">{{ errors[prefix(which) + '.state'] }}</span> }
        </label>
      </div>
    </ng-template>
  `,
})
export class ClientFormComponent implements OnInit {
  @Input({ required: true }) title!: string;
  @Input() kind?: ClientKind;

  readonly router = inject(Router);
  readonly panel = PANEL;
  readonly big = big;
  readonly grid = grid;
  readonly section = section;
  readonly sectionTitle = sectionTitle;
  readonly labelCls = label;
  readonly addrFields = ADDR_FIELDS;
  readonly otherFields = OTHER_FIELDS;
  readonly otherFields2 = OTHER_FIELDS_2;
  readonly institutions: Option<ClientKind>[] = [{ value: 'nbfi', label: 'NBFI' }, { value: 'fi', label: 'FI' }];
  readonly countries: Option[] = [{ value: '', label: 'Select country' }, ...getCountries().map((c) => ({ value: c.code, label: c.name }))];

  form: NewClient = { ...INITIAL };
  submitted = false;
  saving = false;
  saveError = '';
  stateOpts: Option[] = [{ value: '', label: 'Select state' }];

  async ngOnInit() {
    if (this.kind) this.form.kind = this.kind;
    const states = await getStates();
    this.stateOpts = [{ value: '', label: 'Select state' }, ...states.map((s) => ({ value: s, label: s }))];
  }

  // Errors show (and update live) once the user has tried to submit.
  get errors(): Errors { return this.submitted ? validate(this.form) : {}; }
  get hasErrors() { return Object.keys(this.errors).length > 0; }

  cls = (key: string) => `${control} ${this.errors[key] ? 'border-red-400' : 'border-slate/40'}`;
  prefix = (which: Which) => (which === 'corporateAddress' ? 'corp' : 'corr');
  corr = () => (this.form.correspondenceSameAsCorporate ? this.form.corporateAddress : this.form.correspondenceAddress);
  listHref = () => (this.form.kind === 'corporate' ? '/bd/web/corporateclients/corporate' : `/bd/web/financialinstitute/${this.form.kind}`);

  setCompany = (v: string) => { this.form.companyName = v; };
  setter = (k: TextKey) => (v: string) => { this.form[k] = v; };
  addrSetter = (which: Which, k: keyof Addr) => (v: string) => { this.form[which] = { ...this.form[which], [k]: v }; };

  async onSubmit(e: Event) {
    e.preventDefault();
    this.submitted = true;
    if (this.hasErrors) {
      // Wait for change detection to render the error markers.
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
      return;
    }
    this.saving = true;
    this.saveError = '';
    try {
      await createClient({ ...this.form, correspondenceAddress: this.corr() });
      this.router.navigateByUrl(this.listHref());
    } catch {
      this.saveError = 'Could not save the client. Please try again.';
      this.saving = false;
    }
  }
}
