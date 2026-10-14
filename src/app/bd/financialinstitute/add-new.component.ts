import { Component } from '@angular/core';
import { ClientFormComponent } from '../../shared/client-form.component';

@Component({
  selector: 'app-fi-add-new',
  standalone: true,
  imports: [ClientFormComponent],
  template: `<app-client-form title="Add New" />`,
})
export class FiAddNewComponent {}
