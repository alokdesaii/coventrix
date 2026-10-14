import { Component, Input, OnChanges } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getClientProfile, type Address, type ClientProfile, type Contact } from '../../api/clients';
import { fmtDate } from '../../shared/client-list.component';
import { PANEL } from '../../shared/ui';

type Row = [label: string, value: string | number | undefined];

const addressRows = (a: Address | null): Row[] => [
  ['Floor', a?.floor], ['Block / Unit', a?.blockUnit], ['Building Name', a?.buildingName],
  ['Street No. and Name', a?.street], ['State', a?.state], ['Country', a?.country],
];

const contactRows = (c: Contact | undefined): Row[] => [
  ['Referred By', c?.referredBy], ['Referral Partner', c?.referralPartner], ['Mobile Number', c?.mobile],
  ['Phone Area Code', c?.phoneAreaCode], ['Phone Number', c?.phone], ['Fax Area Code', c?.faxAreaCode],
  ['Fax No', c?.fax], ['Website', c?.website], ['Email', c?.email],
];

/** Label/value rows: label column in the light label colour. */
@Component({
  selector: 'app-fields',
  standalone: true,
  host: { class: 'block flex-1 bg-[linear-gradient(to_right,#e6eef6_50%,transparent_50%)]' },
  template: `
    <dl class="divide-y divide-slate/15">
      @for (r of rows; track r[0]) {
        <div class="grid grid-cols-2 text-sm last:border-b last:border-slate/15">
          <dt class="border-r border-slate/20 bg-label px-5 py-3 font-semibold text-night">{{ r[0] }}</dt>
          <dd class="break-words px-5 py-3 text-night">{{ r[1] ?? '' }}</dd>
        </div>
      }
    </dl>
  `,
})
export class FieldsComponent {
  @Input({ required: true }) rows!: Row[];
}

@Component({
  selector: 'app-profile-card',
  standalone: true,
  host: { class: 'flex flex-col overflow-hidden rounded-md border border-slate/25 bg-white' },
  template: `
    <header class="flex min-h-14 items-center gap-3 border-b border-slate/20 px-5 py-3">
      <h2 class="mr-auto text-[15px] font-semibold text-navy">{{ title }}</h2>
      <ng-content select="[action]" />
    </header>
    <ng-content />
  `,
})
export class ProfileCardComponent {
  @Input({ required: true }) title!: string;
}

const LIST = '/bd/web/financialinstitute/nbfi';

@Component({
  selector: 'app-view-client-profile',
  standalone: true,
  imports: [RouterLink, FieldsComponent, ProfileCardComponent],
  template: `
    <div class="mb-5 flex items-center gap-3">
      <h1 class="mr-auto text-xl font-semibold text-navy">View Client Profile</h1>
      <a [routerLink]="list" (click)="back($event)"
        class="flex h-9 items-center gap-1.5 rounded border border-slate/40 bg-white px-3.5 text-sm font-medium text-navy transition hover:bg-mist">
        <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        Back
      </a>
    </div>

    @if (profile === undefined) {
      <div [class]="panel + ' grid gap-5 lg:grid-cols-2'">
        @for (i of [0, 1, 2, 3]; track i) { <div class="h-72 animate-pulse rounded-md border border-slate/25 bg-white"></div> }
      </div>
    } @else if (profile === null) {
      <div [class]="panel + ' py-16 text-center text-sm text-slate'">Client not found.</div>
    } @else {
      <div [class]="panel">
        <div class="mb-5 overflow-hidden rounded-md border border-slate/25 bg-white lg:w-[calc(50%-0.625rem)]">
          <app-fields [rows]="[['Client Name', profile.clientName]]" />
        </div>

        <div class="grid gap-5 lg:grid-cols-2">
          <app-profile-card title="Corporate Client">
            <app-fields [rows]="[
              ['Company Name', profile.companyName],
              ['Country', profile.country],
              ['Date of Incorporation', fmtDate(profile.incorporationDate)],
              ['Business Registration Number', profile.registrationNumber],
              ['Number of Partners', profile.partners],
            ]" />
          </app-profile-card>
          <app-profile-card title="Client Corporate Address"><app-fields [rows]="addressRows(profile.corporateAddress)" /></app-profile-card>
          <app-profile-card title="Client Correspondence Address"><app-fields [rows]="addressRows(profile.correspondenceAddress)" /></app-profile-card>
          <app-profile-card title="Other Details">
            @if (profile.contacts.length > 1) {
              <button action type="button" (click)="dialog.showModal()"
                class="h-8 rounded px-3 text-xs font-semibold text-teal transition hover:bg-teal/10">
                View all contacts ({{ profile.contacts.length }})
              </button>
            }
            <app-fields [rows]="contactRows(profile.contacts[0])" />
          </app-profile-card>
        </div>
      </div>
    }

    <dialog #dialog (click)="$event.target === dialog ? dialog.close() : null"
      class="m-auto w-[min(56rem,calc(100%-2rem))] rounded-md bg-white p-0 backdrop:bg-night/50">
      <header class="sticky top-0 z-10 flex items-center bg-white px-6 pb-4 pt-5">
        <h2 class="mr-auto text-xl font-semibold text-navy">View All Contact Details</h2>
        <button type="button" (click)="dialog.close()" aria-label="Close"
          class="grid size-8 place-items-center rounded-md bg-mist text-navy transition hover:bg-slate/20">
          <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </header>
      <div class="flex flex-col gap-5 px-6 pb-6">
        @for (c of profile?.contacts ?? []; track i; let i = $index) {
          <table [attr.aria-label]="'Contact ' + (i + 1)" class="w-full table-fixed border-collapse border border-slate/30 text-sm">
            <colgroup><col class="w-[18%]" /><col class="w-[32%]" /><col class="w-[18%]" /><col class="w-[32%]" /></colgroup>
            <tbody>
              @for (pair of pairs(c); track $index) {
                <tr>
                  @for (cell of pair; track $index) {
                    @if (cell) {
                      <th scope="row" class="border border-slate/30 bg-label px-4 py-3 text-left font-semibold text-night">{{ cell[0] }}</th>
                      <td class="break-words border border-slate/30 px-4 py-3 text-night">{{ cell[1] || '' }}</td>
                    } @else {
                      <td class="border border-slate/30 bg-label"></td><td class="border border-slate/30"></td>
                    }
                  }
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </dialog>
  `,
})
export class ViewClientProfileComponent implements OnChanges {
  @Input() id = ''; // bound from the :id route param (withComponentInputBinding)

  readonly panel = PANEL;
  readonly list = LIST;
  readonly fmtDate = fmtDate;
  readonly addressRows = addressRows;
  readonly contactRows = contactRows;
  profile: ClientProfile | null | undefined = undefined;

  async ngOnChanges() {
    this.profile = undefined;
    this.profile = await getClientProfile(this.id);
  }

  /** Two label/value pairs per row; a missing second pair renders as empty cells. */
  pairs(c: Contact) {
    const rows = contactRows(c);
    return Array.from({ length: Math.ceil(rows.length / 2) }, (_, r) => [rows[r * 2], rows[r * 2 + 1]] as const);
  }

  back(e: MouseEvent) {
    if (history.length > 1) {
      e.preventDefault();
      history.back();
    }
  }
}
