import { Component } from '@angular/core';
import { LeadStatusListComponent } from '../../shared/lead-status-list.component';

// ponytail: route keeps the live portal's spelling ("corporateclientatus") so URLs match.
@Component({
  selector: 'app-corporate-client-status',
  standalone: true,
  imports: [LeadStatusListComponent],
  template: `<app-lead-status-list kind="corporate" title="Corporate Clients Status" />`,
})
export class CorporateClientStatusComponent {}
