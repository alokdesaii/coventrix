import { Component } from '@angular/core';
import { ClientListComponent } from '../../shared/client-list.component';

@Component({
  selector: 'app-fi',
  standalone: true,
  imports: [ClientListComponent],
  template: `<app-client-list kind="fi" title="FI" searchLabel="A/C or Name" />`,
})
export class FiComponent {}
