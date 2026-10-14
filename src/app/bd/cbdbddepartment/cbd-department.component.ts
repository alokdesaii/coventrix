import { Component } from '@angular/core';
import { DepartmentListComponent } from '../../shared/department-list.component';

@Component({
  selector: 'app-cbd-department',
  standalone: true,
  imports: [DepartmentListComponent],
  template: `<app-department-list dept="cbd" title="CBD Department" />`,
})
export class CbdDepartmentComponent {}
