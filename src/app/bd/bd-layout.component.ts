import { Component } from '@angular/core';
import { AppShellComponent } from '../shell/app-shell.component';
import { BD_NAV } from '../shell/nav';

@Component({
  selector: 'app-bd-layout',
  standalone: true,
  imports: [AppShellComponent],
  template: `<app-shell [nav]="nav" />`,
})
export class BdLayoutComponent {
  readonly nav = BD_NAV;
}
