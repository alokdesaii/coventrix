import { Component } from '@angular/core';
import { ClientFormComponent } from '../../shared/client-form.component';

@Component({
  selector: 'app-corporate-add-new',
  standalone: true,
  imports: [ClientFormComponent],
  template: `<app-client-form title="Corporate" kind="corporate" />`,
})
export class CorporateAddNewComponent {}
