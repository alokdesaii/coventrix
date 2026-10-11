// Reports API contract. Mocked — live: :50/api/grossProfitReport/* (noted per function).
import type { DateRange } from "@/components/ui";
import type { Page } from "@/lib/api/clients";

export type ConsolidatedPaymentRow = {
  clientName: string;
  clientType: "FI" | "NBFI" | "Corporate";
  clientId: string;
  dateBoarded: string; // ISO
  outwardCount: number; outwardVolume: number;
  inwardCount: number; inwardVolume: number;
  bookTransferCount: number; bookTransferVolume: number;
};

const NAMES = ["Apex", "Harbor", "Summit", "Meridian", "Crescent", "Pioneer", "Atlas", "Orion", "Vertex", "Zenith"];
const TYPES = ["FI", "NBFI", "Corporate"] as const;

const ROWS: ConsolidatedPaymentRow[] = Array.from({ length: 73 }, (_, i) => ({
  clientName: `${NAMES[i % 10]} ${NAMES[(i * 3 + 1) % 10]} ${["Ltd", "Exchange", "Trading Co."][i % 3]}`.toUpperCase(),
  clientType: TYPES[i % 3],
  clientId: `C${String(10_000 + i * 17)}`,
  dateBoarded: new Date(Date.UTC(2015 + (i % 11), (i * 5) % 12, 1 + (i % 27))).toISOString().slice(0, 10),
  outwardCount: (i * 37) % 400, outwardVolume: ((i * 7919) % 900) * 1_250,
  inwardCount: (i * 23) % 300, inwardVolume: ((i * 6271) % 700) * 1_100,
  bookTransferCount: (i * 11) % 60, bookTransferVolume: ((i * 3571) % 300) * 900,
}));

/** GetConsolidatedPaymentData */
export async function getConsolidatedPayments(_r: DateRange, page: number, pageSize: number): Promise<Page<ConsolidatedPaymentRow>> {
  await new Promise((r) => setTimeout(r, 400));
  return { items: ROWS.slice((page - 1) * pageSize, page * pageSize), total: ROWS.length };
}

/** Full result for export. */
export async function exportConsolidatedPayments(_r: DateRange): Promise<ConsolidatedPaymentRow[]> {
  await new Promise((r) => setTimeout(r, 400));
  return ROWS;
}

// --- Transactionwise P&L report ---

export type TransactionRow = {
  refNo: string;
  clientName: string;
  remitterCountry: string;
  bankCountry: string;
  type: "Outward" | "Inward" | "Book Transfer";
  bankAssigned: string;
  approverDate: string; // ISO
  payInAmount: number;
  payInCurrency: "USD" | "HKD" | "EUR";
  pl: number; // profit (+) / loss (-)
  mainClientName: string;
  beneficiaryName: string;
  beneficiaryCountry: string;
  paymentCreatedDate: string; // ISO
  bankAssignedAt: string; // ISO datetime
  clientOnboardingDate: string; // ISO
};

const COUNTRIES = ["Hong Kong", "Singapore", "United Arab Emirates", "United Kingdom", "India", "Turkey"];
const BANKS = ["BANK A", "BANK B", "BANK C"];
const iso = (y: number, m: number, d: number, h = 0) => new Date(Date.UTC(y, m, d, h)).toISOString();

const TXNS: TransactionRow[] = Array.from({ length: 128 }, (_, i) => ({
  refNo: `TRX${String(240_000 + i * 13)}`,
  clientName: ROWS[i % ROWS.length].clientName,
  remitterCountry: COUNTRIES[i % 6],
  bankCountry: COUNTRIES[(i + 2) % 6],
  type: (["Outward", "Inward", "Book Transfer"] as const)[i % 3],
  bankAssigned: BANKS[i % 3],
  approverDate: iso(2026, 9, 1 + (i % 9)).slice(0, 10),
  payInAmount: ((i * 7919) % 500 + 5) * 100,
  payInCurrency: (["USD", "HKD", "EUR"] as const)[i % 3],
  pl: ((i * 37) % 900) - 150,
  mainClientName: ROWS[(i * 7) % ROWS.length].clientName,
  beneficiaryName: `BENEFICIARY ${String.fromCharCode(65 + (i % 26))}${i}`,
  beneficiaryCountry: COUNTRIES[(i + 4) % 6],
  paymentCreatedDate: iso(2026, 9, 1 + (i % 9)).slice(0, 10),
  bankAssignedAt: iso(2026, 9, 1 + (i % 9), 9 + (i % 8)),
  clientOnboardingDate: ROWS[i % ROWS.length].dateBoarded,
}));

/** GetTransactionPLReportData */
export async function getTransactionReport(_r: DateRange, page: number, pageSize: number): Promise<Page<TransactionRow>> {
  await new Promise((r) => setTimeout(r, 400));
  return { items: TXNS.slice((page - 1) * pageSize, page * pageSize), total: TXNS.length };
}

export async function exportTransactionReport(_r: DateRange): Promise<TransactionRow[]> {
  await new Promise((r) => setTimeout(r, 400));
  return TXNS;
}
