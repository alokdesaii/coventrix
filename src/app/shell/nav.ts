// BD portal sidebar, mirrored from the live menu (served by /api/menus/getuserwisemenumapping).
export type NavIcon = "home" | "bank" | "briefcase" | "report" | "users" | "chart" | "flow" | "calendar" | "target" | "dot";
export type NavItem = { label: string; icon: NavIcon; href?: string; children?: { label: string; href: string; disabled?: boolean }[] };

const B = "/bd/web";

export const BD_NAV: NavItem[] = [
  { label: "Dashboard", icon: "home", href: "/bd/dashboard" },
  {
    label: "Financial Institutions", icon: "bank", children: [
      { label: "FI Statistics", href: `${B}/financialinstitute/fistatistics` },
      { label: "NBFI", href: `${B}/financialinstitute/nbfi` },
      { label: "FI", href: `${B}/financialinstitute/fi` },
      { label: "Add New", href: `${B}/financialinstitute/addnewbank` },
      { label: "Status", href: `${B}/financialinstitute/clientstatus` },
    ],
  },
  {
    label: "Corporate Clients", icon: "briefcase", children: [
      { label: "Corporate Statistics", href: `${B}/corporateclients/corporatestatistics` },
      { label: "Corporate", href: `${B}/corporateclients/corporate` },
      { label: "Add New", href: `${B}/corporateclients/addnewcorporateclient` },
      { label: "Status", href: `${B}/corporateclients/corporateclientatus` },
    ],
  },
  {
    label: "Reports", icon: "report", children: [
      { label: "Consolidated Payments", href: `${B}/gross-profit-reports/consolidatedpayments` },
      { label: "Transactionwise Report", href: `${B}/gross-profit-reports/transactionwisereport` },
    ],
  },
  { label: "Monthly Management", icon: "chart", href: `${B}/monthlymanagement/monthlymanagement` },
  { label: "Payment Flow", icon: "flow", href: `${B}/paymentflows/paymentflows` },
  {
    label: "CBD BD Departments", icon: "users", children: [
      { label: "CBD Department", href: `${B}/cbdbddepartment/cbddepartment` },
      { label: "BD Department", href: `${B}/cbdbddepartment/bddepartment` },
    ],
  },
  {
    label: "MBO", icon: "target", children: [
      { label: "My MBO", href: `${B}/mbo/my` },
      { label: "My Escalations", href: `${B}/mbo/escalations` },
      { label: "My Results", href: `${B}/mbo/results`, disabled: true },
      { label: "Team MBO", href: `${B}/mbo/team` },
      { label: "Assign MBO Targets", href: `${B}/mbo/assign` },
      { label: "MBO Review", href: `${B}/mbo/review`, disabled: true },
    ],
  },
  // Admin set-up: show to the MBO Panel only once the menu API exists.
  {
    label: "MBO Setup", icon: "report", children: [
      { label: "MBO Tasks", href: `${B}/mbo/tasks` },
      { label: "Rating Guides", href: `${B}/mbo/rating-guides` },
      { label: "Framework Examples", href: `${B}/mbo/framework-examples` },
    ],
  },
  { label: "Appointment", icon: "calendar", href: `${B}/appointment/calendar` },
];

// Pages reached from a list (not in the menu): path segment -> breadcrumb title.
export const DETAIL_TITLES: Record<string, string> = {
  viewclientprofile: "View Client Profile",
  viewclientpaymentreports: "Client Payment Reports",
  objective: "Objective Details",
  progress: "Update Progress & Evidence",
  escalations: "My Escalations",
  "escalations/new": "Raise Escalation",
  "tasks/new": "Add MBO Task",
  tasks: "Edit MBO Task",
  "rating-guides/edit": "Rating Guide",
  "framework-examples/edit": "Framework Example",
};
