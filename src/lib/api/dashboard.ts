// BD dashboard ("FI Statistics") API contract. Mocked — backend team: swap bodies for fetch() calls.

export type Period = "30d" | "60d" | "90d";
export type Granularity = "month" | "day";

export type BankRow = { bank: string; value: number };

export type WidgetId =
  | "outgoing-payments"
  | "payments-volume"
  | "cost"
  | "payments-count"
  | "total-payments"
  | "bank-cost";

export type WidgetQuery = { period?: Period; granularity?: Granularity };

const MOCK: BankRow[] = [
  { bank: "BANK A", value: 150 },
  { bank: "BANK B", value: 120 },
  { bank: "BANK C", value: 100 },
];

export async function getWidget(_id: WidgetId, _q: WidgetQuery = {}): Promise<BankRow[]> {
  await new Promise((r) => setTimeout(r, 300));
  return MOCK;
}
