import { Component } from '@angular/core';
import { ClientListComponent } from '../../shared/client-list.component';

@Component({
  selector: 'app-nbfi',
  standalone: true,
  imports: [ClientListComponent],
  template: `<app-client-list kind="nbfi" title="NBFI" />`,
})
export class NbfiComponent {}
