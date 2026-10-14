// Financial institution client lists. Mocked — live NBFI list is
// :50/api/FinacialInstitutions/getallClientsfinbfi. Backend team: swap listClients() for fetch().

export const STATUSES = [
  "Activated", "Activation Required", "In Progress", "Aging", "Dormant", "Rejected",
  "Suspended", "Closed", "Stop", "Open Lead", "Close Lead", "Converted",
] as const;
export type Status = (typeof STATUSES)[number];

export const WAY_TYPES = ["One Way", "Two Way"] as const;
export type WayType = (typeof WAY_TYPES)[number];

export const WAY_SIDES = ["External To HH", "External To Company", "Company To External"] as const;
export type WaySide = (typeof WAY_SIDES)[number];

export type ClientKind = "nbfi" | "fi" | "corporate";

export type Client = {
  id: string;
  name: string;
  accountNumber: string;
  country: string;
  incorporationDate: string; // ISO yyyy-mm-dd
  wayType: WayType;
  waySide: WaySide;
  status: Status;
};

export type ClientQuery = { name?: string; // matches name or account number
  status?: Status | ""; wayType?: WayType | ""; waySide?: WaySide | ""; page: number; pageSize: number };
export type Page<T> = { items: T[]; total: number };

// ponytail: fake deterministic data, no real client names.
const COUNTRIES = ["Hong Kong", "Singapore", "United Arab Emirates", "Kyrgyzstan", "United Kingdom", "Kuwait", "Philippines", "Canada"];
const WORDS = ["Apex", "Harbor", "Summit", "Meridian", "Crescent", "Pioneer", "Atlas", "Orion", "Vertex", "Zenith", "Nova", "Delta", "Union"];
const SUFFIX: Record<ClientKind, string[]> = {
  nbfi: ["Exchange", "Payments Ltd", "Remittance LLC", "Financial Services", "Money Transfer Co."],
  fi: ["Exchange", "Payments Ltd", "Remittance LLC", "Financial Services", "Money Transfer Co."],
  corporate: ["Trading Limited", "General Trading L.L.C", "Industries Ltd", "Logistics Limited", "Holdings Pte. Ltd."],
};
const PICK_STATUS: Status[] = ["Activated", "Activated", "Closed", "Dormant", "Activation Required", "Rejected", "In Progress"];

function mock(kind: ClientKind): Client[] {
  return Array.from({ length: { nbfi: 98, fi: 36, corporate: 446 }[kind] }, (_, i) => ({
    id: `${kind}-${i + 1}`,
    name: `${WORDS[i % WORDS.length]} ${WORDS[(i * 7 + 3) % WORDS.length]} ${SUFFIX[kind][i % SUFFIX[kind].length]}`.toUpperCase(),
    accountNumber: `${{ nbfi: "102", fi: "105", corporate: "102" }[kind]}-${String(300 + ((i * 37) % 600)).padStart(3, "0")}-001-${{ nbfi: "01", fi: "02", corporate: "03" }[kind]}-00-${String(i + 1).padStart(4, "0")}-00000`,
    country: COUNTRIES[(i * 3) % COUNTRIES.length],
    incorporationDate: new Date(Date.UTC(1980 + ((i * 7) % 44), (i * 5) % 12, 1 + ((i * 11) % 28))).toISOString().slice(0, 10),
    wayType: WAY_TYPES[i % 4 === 0 ? 1 : 0],
    waySide: WAY_SIDES[i % 3 === 0 ? 1 : i % 3 === 1 ? 0 : 2],
    status: PICK_STATUS[(i * 5) % PICK_STATUS.length],
  })).sort((a, b) => a.name.localeCompare(b.name));
}

const DATA: Record<ClientKind, Client[]> = { nbfi: mock("nbfi"), fi: mock("fi"), corporate: mock("corporate") };

function filter(kind: ClientKind, q: Omit<ClientQuery, "page" | "pageSize">) {
  const name = q.name?.trim().toLowerCase();
  return DATA[kind].filter((c) =>
    (!name || c.name.toLowerCase().includes(name) || c.accountNumber.includes(name)) &&
    (!q.status || c.status === q.status) &&
    (!q.wayType || c.wayType === q.wayType) &&
    (!q.waySide || c.waySide === q.waySide));
}

export async function listClients(kind: ClientKind, q: ClientQuery): Promise<Page<Client>> {
  await new Promise((r) => setTimeout(r, 300));
  const all = filter(kind, q);
  return { items: all.slice((q.page - 1) * q.pageSize, q.page * q.pageSize), total: all.length };
}

/** All rows matching the filters, for export. */
export async function exportClients(kind: ClientKind, q: Omit<ClientQuery, "page" | "pageSize">): Promise<Client[]> {
  await new Promise((r) => setTimeout(r, 300));
  return filter(kind, q);
}

// --- Client profile (live: getleadclient) ---

export type Address = { floor: string; blockUnit: string; buildingName: string; street: string; state: string; country: string };
export type Contact = {
  referredBy: string; referralPartner: string; mobile: string; phoneAreaCode: string; phone: string;
  faxAreaCode: string; fax: string; website: string; email: string;
};
export type ClientProfile = {
  id: string;
  clientName: string;
  companyName: string;
  country: string;
  incorporationDate: string;
  registrationNumber: string;
  partners: number;
  corporateAddress: Address;
  correspondenceAddress: Address | null;
  contacts: Contact[];
};

export async function getClientProfile(id: string): Promise<ClientProfile | null> {
  await new Promise((r) => setTimeout(r, 300));
  const c = Object.values(DATA).flat().find((x) => x.id === id);
  if (!c) return null;
  const slug = c.name.toLowerCase().replace(/[^a-z]+/g, "");
  return {
    id: c.id,
    clientName: c.name,
    companyName: c.name,
    country: c.country,
    incorporationDate: c.incorporationDate,
    registrationNumber: `BR-${c.accountNumber.slice(4, 7)}${c.accountNumber.slice(-10, -6)}`,
    partners: 2,
    corporateAddress: { floor: "12/F", blockUnit: "Unit 1203", buildingName: "Harbour Centre", street: "25 Harbour Road", state: "", country: c.country },
    correspondenceAddress: null,
    contacts: Array.from({ length: 3 }, (_, i) => ({
      referredBy: i === 0 ? "Direct" : "",
      referralPartner: "",
      mobile: `+852 9${i}12 34${i}6`,
      phoneAreaCode: "+852",
      phone: `2${i}34 5678`,
      faxAreaCode: "",
      fax: "",
      website: i === 0 ? `www.${slug.slice(0, 12)}.com` : "",
      email: `${["ops", "compliance", "finance"][i]}@${slug.slice(0, 12)}.com`,
    })),
  };
}

// --- Add new client (live: addnewbank form) ---

export type NewClient = {
  kind: ClientKind;
  companyName: string;
  corporateAddress: Omit<Address, "country">;
  correspondenceSameAsCorporate: boolean;
  correspondenceAddress: Omit<Address, "country">;
  mobile: string; phoneAreaCode: string; phone: string;
  country: string; // ISO code
  faxAreaCode: string; fax: string;
  referredBy: string; referralPartner: string; website: string; email: string;
};

/** States for the address dropdowns. The live portal currently returns Indian states only. */
export async function getStates(): Promise<string[]> {
  await new Promise((r) => setTimeout(r, 200));
  return ["Hong Kong Island", "Kowloon", "New Territories"];
}

export async function createClient(_c: NewClient): Promise<{ id: string }> {
  await new Promise((r) => setTimeout(r, 600));
  return { id: `${_c.kind}-new` };
}

// --- Lead status (live: getleadclient for FI, getcorporateleadclient for corporate) ---

export const LEAD_OUTCOMES = ["Close Lead", "Converted"] as const;
export type LeadOutcome = (typeof LEAD_OUTCOMES)[number];
export type Lead = Pick<Client, "id" | "name" | "accountNumber" | "country" | "incorporationDate" | "status"> & { createdBy: string };

const CREATORS = ["Alok Desai", "Priya Shah", "Daniel Wong"];
export type LeadKind = "fi" | "corporate";
const toLeads = (src: Client[]): Lead[] => src.slice(0, 14).map((c, i) => ({
  id: c.id, name: c.name, accountNumber: c.accountNumber, country: c.country, incorporationDate: c.incorporationDate,
  createdBy: CREATORS[i % CREATORS.length],
  status: i < 9 ? "Open Lead" : i < 12 ? "Close Lead" : "Converted",
}));
const LEADS: Record<LeadKind, Lead[]> = { fi: toLeads(DATA.nbfi), corporate: toLeads(DATA.corporate) };

export async function listLeads(kind: LeadKind, q: { name?: string; status?: Status | ""; page: number; pageSize: number }): Promise<Page<Lead>> {
  await new Promise((r) => setTimeout(r, 300));
  const name = q.name?.trim().toLowerCase();
  const all = LEADS[kind].filter((l) =>
    (!name || l.name.toLowerCase().includes(name) || l.accountNumber.includes(name)) && (!q.status || l.status === q.status));
  return { items: all.slice((q.page - 1) * q.pageSize, q.page * q.pageSize), total: all.length };
}

export async function updateLeadStatus(kind: LeadKind, id: string, status: LeadOutcome): Promise<void> {
  await new Promise((r) => setTimeout(r, 500));
  const lead = LEADS[kind].find((l) => l.id === id);
  if (lead) lead.status = status; // ponytail: in-memory mock so the list reflects the change
}

// --- CBD / BD department client lists (live: getallClientsfinbfi, filtered per department) ---

export type Department = "cbd" | "bd";
export type DepartmentClient = { name: string; status: Status; accountType: "FI" | "NBFI" | "Corporate"; accountNumber: string };

/** CBD covers FI/NBFI clients; BD covers corporate clients. Activated accounts only. */
export async function listDepartmentClients(dept: Department): Promise<DepartmentClient[]> {
  await new Promise((r) => setTimeout(r, 300));
  const src: [Client[], DepartmentClient["accountType"]][] =
    dept === "cbd" ? [[DATA.fi, "FI"], [DATA.nbfi, "NBFI"]] : [[DATA.corporate, "Corporate"]];
  return src
    .flatMap(([list, accountType]) => list.filter((c) => c.status === "Activated").map((c) => ({ name: c.name, status: c.status, accountType, accountNumber: c.accountNumber })))
    .slice(0, dept === "cbd" ? 20 : 37)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// --- Client payment reports (live: BDManager/assignedclientpaymentreports) ---

export const PAYMENT_TYPES = ["Incoming", "Outgoing", "Book Transfer", "FX"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];
export type ClientPaymentReport = {
  client: { name: string; accountNumber: string } | null;
  monthly: { amount: number; report: string }[];
  byCountry: { amount: number; country: string; report: string }[];
  byCurrency: { amount: number; currency: string; report: string }[];
};

export async function getClientPaymentReport(accountNumber: string, type: PaymentType, _range: { from: string; to: string }): Promise<ClientPaymentReport> {
  await new Promise((r) => setTimeout(r, 400));
  const c = Object.values(DATA).flat().find((x) => x.accountNumber === accountNumber);
  const k = PAYMENT_TYPES.indexOf(type) + 2;
  const amt = (i: number) => (((i + 1) * 7919 * k) % 900 + 50) * 1_000;
  return {
    client: c ? { name: c.name, accountNumber: c.accountNumber } : null,
    monthly: ["Jul 2026", "Aug 2026", "Sep 2026", "Oct 2026"].map((report, i) => ({ amount: amt(i), report })),
    byCountry: ["Hong Kong", "Singapore", "United Kingdom", "United States"].map((country, i) => ({ amount: amt(i + 4), country, report: "Oct 2026" })),
    byCurrency: ["USD", "HKD", "EUR"].map((currency, i) => ({ amount: amt(i + 8), currency, report: "Oct 2026" })),
  };
}
