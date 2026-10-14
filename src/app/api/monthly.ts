// Monthly Management Report API contract. Mocked — live: :50/api/monthlyManagement/* (LastMonthData,
// TopCurrencyTransactions, YearWiseTransaction, CorporateMonthGrossProfit, TopBankPayments, BankNotesBanksCurrencyWise).

export type Side = "corporate" | "msb";
export type EntryRow = [string, string];

/** Manually entered sections (Clients & Banks + Other Information). */
export type MonthlyEntries = {
  newClients: Record<Side, { total: string; rows: EntryRow[] }>;      // client name, account number
  accountsClosed: Record<Side, { total: string; rows: EntryRow[] }>;  // client name, account number
  rejected: Record<Side, { total: string; rows: EntryRow[] }>;        // client name, reason of rejection
  meetings: Record<Side, { rows: EntryRow[] }>;                        // client name, account number
  banksOpened: EntryRow[];                                             // accounts opened, currency
  bankTracer: EntryRow[];                                              // bank tracer, status
  notes: { marketNews: string; correspondentBanks: string; compliance: string; it: string; otherTopics: string };
};

export type MonthlyReport = {
  mbo: { targetRevenue: string; targetNetProfit: string; targetCostIncomeRatio: string };
  ytd: { revenue: number; expenses: number; netProfit: number; costIncomeRatio: number };
  lastMonth: { revenue: number; expenses: number; netProfit: number };
  topCurrencies: { currency: string; count: number }[];
  transactionsByType: { type: string; count: number }[];
  yearWiseTransactions: { month: number; year: number; count: number }[];
  yearWiseGrossProfit: { month: number; year: number; amount: number }[];
  topClientsByProfit: Record<Side, { client: string; account: string; profit: number }[]>;
  bankRankByCost: { bank: string; cost: number }[];
  bankRankByPayments: { bank: string; payments: number }[];
  bankNoteTransactions: { year: number; month: number; count: number }[];
  topCurrenciesProducts: { currency: string; count: number; lastMonthCount: number }[];
  bankNotesSoldToBank: { amount: string; totalDeals: number };
  bankNotesSoldToClients: { amount: string; totalDeals: number };
  entries: MonthlyEntries;
};

const emptySide = () => ({ total: "", rows: [] as EntryRow[] });

export const EMPTY_ENTRIES: MonthlyEntries = {
  newClients: { corporate: emptySide(), msb: emptySide() },
  accountsClosed: { corporate: emptySide(), msb: emptySide() },
  rejected: { corporate: emptySide(), msb: emptySide() },
  meetings: { corporate: { rows: [] }, msb: { rows: [] } },
  banksOpened: [],
  bankTracer: [],
  notes: { marketNews: "", correspondentBanks: "", compliance: "", it: "", otherTopics: "" },
};

const saved: Record<number, MonthlyEntries> = {};
const BANKS = ["BANK A", "BANK B", "BANK C", "BANK D", "BANK E"];

/** month: 1–12 */
export async function getMonthlyReport(month: number): Promise<MonthlyReport> {
  await new Promise((r) => setTimeout(r, 400));
  const m = (n: number) => ((n * month * 37) % 900) + 100;
  return {
    mbo: { targetRevenue: "HKD 50.43M", targetNetProfit: "HKD 10.12M", targetCostIncomeRatio: "Under 25%" },
    ytd: { revenue: 38_420_115.4, expenses: 12_681_246.12, netProfit: 25_738_869.28, costIncomeRatio: 33.01 },
    lastMonth: { revenue: m(1) * 4_100, expenses: m(2) * 1_300, netProfit: m(1) * 4_100 - m(2) * 1_300 },
    topCurrencies: ["USD", "HKD", "EUR", "GBP", "SGD"].map((currency, i) => ({ currency, count: m(i + 3) })),
    transactionsByType: ["Outward", "Inward", "Book Transfer"].map((type, i) => ({ type, count: m(i + 7) })),
    yearWiseTransactions: Array.from({ length: 10 }, (_, i) => ({ month: i + 1, year: 2026, count: 4_000 + m(i) })),
    yearWiseGrossProfit: Array.from({ length: 10 }, (_, i) => ({ month: i + 1, year: 2026, amount: 900_000 + m(i) * 1_000 })),
    topClientsByProfit: {
      corporate: ["CLIENT A", "CLIENT B", "CLIENT C"].map((client, i) => ({ client, account: `102-344-001-03-00-00${10 + i}-00000`, profit: m(i) * 120 })),
      msb: ["CLIENT D", "CLIENT E"].map((client, i) => ({ client, account: `102-784-001-01-00-00${20 + i}-00000`, profit: m(i + 4) * 90 })),
    },
    bankRankByCost: BANKS.map((bank, i) => ({ bank, cost: m(i) * 3_200 })).sort((a, b) => b.cost - a.cost),
    bankRankByPayments: BANKS.map((bank, i) => ({ bank, payments: m(i + 2) })).sort((a, b) => b.payments - a.payments),
    bankNoteTransactions: [4, 5, 6, 7, 9].map((mo, i) => ({ year: 2026, month: mo, count: m(i) * 3 })),
    topCurrenciesProducts: ["USD", "HKD", "EUR", "GBP", "SGD", "JPY"].map((currency, i) => ({ currency, count: m(i), lastMonthCount: m(i + 1) })),
    bankNotesSoldToBank: { amount: "", totalDeals: 0 },
    bankNotesSoldToClients: { amount: "", totalDeals: 0 },
    entries: structuredClone(saved[month] ?? EMPTY_ENTRIES),
  };
}

export async function saveMonthlyEntries(month: number, entries: MonthlyEntries): Promise<void> {
  await new Promise((r) => setTimeout(r, 500));
  saved[month] = structuredClone(entries);
}
