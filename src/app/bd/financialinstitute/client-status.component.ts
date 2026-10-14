import { Component } from '@angular/core';
import { LeadStatusListComponent } from '../../shared/lead-status-list.component';

@Component({
  selector: 'app-client-status',
  standalone: true,
  imports: [LeadStatusListComponent],
  template: `<app-lead-status-list kind="fi" title="Clients Status" />`,
})
export class ClientStatusComponent {}
