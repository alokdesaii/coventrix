// FI Statistics API contract. Mocked — the live portal calls these endpoints on
// :50/api/FinacialInstitutions/* (names noted per function). Backend team: swap bodies for fetch().

export type Currency = "USD" | "HKD";
export type Granularity = "month" | "day";
export type DateRange = { from: string; to: string }; // ISO yyyy-mm-dd

const delay = () => new Promise((r) => setTimeout(r, 300));
const BANKS = ["BANK A", "BANK B", "BANK C"];

/** GET banklist */
export async function getBankList(): Promise<{ id: string; name: string }[]> {
  await delay();
  return BANKS.map((name, i) => ({ id: String(i + 1), name }));
}

/** counttopbankbypayment */
export async function getTopBanksByPaymentCount(_r: DateRange, _c: Currency) {
  await delay();
  return [150, 120, 100].map((payments, i) => ({ bank: BANKS[i], payments }));
}

/** volumeofpayments */
export async function getTopBanksByVolume(_r: DateRange, _c: Currency) {
  await delay();
  return [[1_250_000, 150], [980_000, 120], [640_000, 100]].map(([volume, payments], i) => ({ bank: BANKS[i], volume, payments }));
}

/** gettopbankbycost */
export async function getTopBanksByCost(_r: DateRange, _c: Currency) {
  await delay();
  return [[4_200, 1_250_000], [3_100, 980_000], [1_900, 640_000]].map(([cost, volume], i) => ({ bank: BANKS[i], cost, volume }));
}

/** bankquery */
export async function getBankQueries(_r: DateRange, _c: Currency) {
  await delay();
  return [12, 8, 5].map((payments, i) => ({ bank: BANKS[i], payments }));
}

/** getpaymentbydate */
export async function getPaymentsByDate(_r: DateRange, _g: Granularity) {
  await delay();
  return [["Aug", 410], ["Sep", 455], ["Oct", 370]].map(([period, payments]) => ({ period: period as string, payments: payments as number }));
}

/** bankcosts */
export async function getBankCosts(_r: DateRange, _g: Granularity, bankId: string) {
  await delay();
  if (!bankId) return [];
  return [["Aug", 1_420], ["Sep", 1_610], ["Oct", 1_170]].map(([period, amount]) => ({ period: period as string, amount: amount as number }));
}
