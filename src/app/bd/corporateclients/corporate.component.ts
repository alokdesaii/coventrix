import { Component } from '@angular/core';
import { ClientListComponent } from '../../shared/client-list.component';

@Component({
  selector: 'app-corporate',
  standalone: true,
  imports: [ClientListComponent],
  template: `<app-client-list kind="corporate" title="Corporate" searchLabel="A/C or Name" />`,
})
export class CorporateComponent {}
