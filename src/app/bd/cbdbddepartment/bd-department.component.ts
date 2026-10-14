import { Component } from '@angular/core';
import { DepartmentListComponent } from '../../shared/department-list.component';

@Component({
  selector: 'app-bd-department',
  standalone: true,
  imports: [DepartmentListComponent],
  template: `<app-department-list dept="bd" title="BD Department" />`,
})
export class BdDepartmentComponent {}
