import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'login', title: 'Coventrix +', loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent) },
  {
    path: 'bd',
    loadComponent: () => import('./bd/bd-layout.component').then((m) => m.BdLayoutComponent),
    children: [
      { path: 'dashboard', title: 'Coventrix +', loadComponent: () => import('./bd/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'web/financialinstitute/fistatistics', title: 'Coventrix +', loadComponent: () => import('./bd/financialinstitute/fi-statistics.component').then((m) => m.FiStatisticsComponent) },
      { path: 'web/financialinstitute/nbfi', title: 'Coventrix +', loadComponent: () => import('./bd/financialinstitute/nbfi.component').then((m) => m.NbfiComponent) },
      { path: 'web/financialinstitute/viewclientprofile/:id', title: 'Coventrix +', loadComponent: () => import('./bd/financialinstitute/view-client-profile.component').then((m) => m.ViewClientProfileComponent) },
      { path: 'web/financialinstitute/fi', title: 'Coventrix +', loadComponent: () => import('./bd/financialinstitute/fi.component').then((m) => m.FiComponent) },
      { path: 'web/financialinstitute/addnewbank', title: 'Coventrix +', loadComponent: () => import('./bd/financialinstitute/add-new.component').then((m) => m.FiAddNewComponent) },
      { path: 'web/financialinstitute/clientstatus', title: 'Coventrix +', loadComponent: () => import('./bd/financialinstitute/client-status.component').then((m) => m.ClientStatusComponent) },
      { path: 'web/corporateclients/corporatestatistics', title: 'Coventrix +', loadComponent: () => import('./bd/corporateclients/corporate-statistics.component').then((m) => m.CorporateStatisticsComponent) },
      { path: 'web/corporateclients/corporate', title: 'Coventrix +', loadComponent: () => import('./bd/corporateclients/corporate.component').then((m) => m.CorporateComponent) },
      { path: 'web/corporateclients/addnewcorporateclient', title: 'Coventrix +', loadComponent: () => import('./bd/corporateclients/add-new.component').then((m) => m.CorporateAddNewComponent) },
      { path: 'web/corporateclients/corporateclientatus', title: 'Coventrix +', loadComponent: () => import('./bd/corporateclients/client-status.component').then((m) => m.CorporateClientStatusComponent) },
      { path: 'web/gross-profit-reports/consolidatedpayments', title: 'Coventrix +', loadComponent: () => import('./bd/reports/consolidated-payments.component').then((m) => m.ConsolidatedPaymentsComponent) },
      { path: 'web/gross-profit-reports/transactionwisereport', title: 'Coventrix +', loadComponent: () => import('./bd/reports/transactionwise-report.component').then((m) => m.TransactionwiseReportComponent) },
      { path: 'web/monthlymanagement/monthlymanagement', title: 'Coventrix +', loadComponent: () => import('./bd/monthly/monthly-management.component').then((m) => m.MonthlyManagementComponent) },
      { path: 'web/paymentflows/paymentflows', title: 'Coventrix +', loadComponent: () => import('./bd/paymentflows/payment-flows.component').then((m) => m.PaymentFlowsComponent) },
      { path: 'web/cbdbddepartment/cbddepartment', title: 'Coventrix +', loadComponent: () => import('./bd/cbdbddepartment/cbd-department.component').then((m) => m.CbdDepartmentComponent) },
      { path: 'web/cbdbddepartment/viewclientpaymentreports/:account', title: 'Coventrix +', loadComponent: () => import('./bd/cbdbddepartment/client-payment-reports.component').then((m) => m.ClientPaymentReportsComponent) },
      { path: 'web/cbdbddepartment/bddepartment', title: 'Coventrix +', loadComponent: () => import('./bd/cbdbddepartment/bd-department.component').then((m) => m.BdDepartmentComponent) },
      { path: 'web/mbo/assign', title: 'Coventrix +', loadComponent: () => import('./bd/mbo/assign.component').then((m) => m.AssignComponent) },
      { path: 'web/mbo/my', title: 'Coventrix +', loadComponent: () => import('./bd/mbo/my-mbo.component').then((m) => m.MyMboComponent) },
      { path: 'web/mbo/objective/:id', title: 'Coventrix +', loadComponent: () => import('./bd/mbo/objective-details.component').then((m) => m.ObjectiveDetailsComponent) },
      { path: 'web/mbo/progress', title: 'Coventrix +', loadComponent: () => import('./bd/mbo/progress.component').then((m) => m.UpdateProgressComponent) },
      { path: 'web/mbo/escalations', title: 'Coventrix +', loadComponent: () => import('./bd/mbo/escalations.component').then((m) => m.EscalationsComponent) },
      { path: 'web/mbo/escalations/new', title: 'Coventrix +', loadComponent: () => import('./bd/mbo/raise-escalation.component').then((m) => m.RaiseEscalationComponent) },
      { path: 'web/mbo/team', title: 'Coventrix +', loadComponent: () => import('./bd/mbo/team.component').then((m) => m.TeamComponent) },
      { path: 'web/mbo/review', title: 'Coventrix +', loadComponent: () => import('./bd/mbo/review.component').then((m) => m.ReviewComponent) },
      { path: 'web/mbo/results', title: 'Coventrix +', loadComponent: () => import('./bd/mbo/results.component').then((m) => m.ResultsComponent) },
      // MBO Framework: dev builds only (hidden on the deployed site).
      ...(isDevMode() ? [{ path: 'web/mbo/framework', title: 'Coventrix +', loadComponent: () => import('./bd/mbo/framework.component').then((m) => m.MboFrameworkComponent) }] : []),
      { path: 'web/appointment/calendar', title: 'Coventrix +', loadComponent: () => import('./bd/appointment/appointment.component').then((m) => m.AppointmentComponent) },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
