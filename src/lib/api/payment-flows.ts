// Payment Flows API contract. Mocked — live: :50/api/paymentFlow/* (paymentCountByCountry,
// paymentsHKtoFranceAndUS, getBeneficiaries).
import type { DateRange } from "@/components/ui";

export type FlowCurrency = "" | "USD" | "HKD";
export type FlowParty = "" | "Client" | "Beneficiary" | "Correspondent Bank";
export type FlowQuery = { range: DateRange; currency: FlowCurrency; party: FlowParty };

/** iso = ISO 3166-1 numeric code (matches the map's country ids). */
export type CountryCount = { iso: string; region: string; country: string; count: number };
export type RegionCount = { regionCode: string; region: string; country: string; count: number };

const BASE: Omit<CountryCount, "count">[] = [
  { iso: "840", region: "North America", country: "United States" },
  { iso: "124", region: "North America", country: "Canada" },
  { iso: "250", region: "Europe", country: "France" },
  { iso: "826", region: "Europe", country: "United Kingdom" },
  { iso: "276", region: "Europe", country: "Germany" },
  { iso: "792", region: "Europe", country: "Turkey" },
  { iso: "784", region: "Middle East", country: "United Arab Emirates" },
  { iso: "414", region: "Middle East", country: "Kuwait" },
  { iso: "356", region: "South Asia", country: "India" },
  { iso: "050", region: "South Asia", country: "Bangladesh" },
  { iso: "156", region: "East Asia", country: "China" },
  { iso: "702", region: "Southeast Asia", country: "Singapore" },
  { iso: "608", region: "Southeast Asia", country: "Philippines" },
  { iso: "360", region: "Southeast Asia", country: "Indonesia" },
  { iso: "036", region: "Oceania", country: "Australia" },
  { iso: "417", region: "Central Asia", country: "Kyrgyzstan" },
  { iso: "051", region: "Central Asia", country: "Armenia" },
];

const seed = (q: FlowQuery) => q.currency.length * 7 + q.party.length * 3 + 1;

/** paymentCountByCountry — payments from Hong Kong, per destination country. */
export async function getPaymentCountByCountry(q: FlowQuery): Promise<CountryCount[]> {
  await new Promise((r) => setTimeout(r, 400));
  const s = seed(q);
  return BASE.map((c, i) => ({ ...c, count: ((i + 3) * 97 * s) % 1_400 + 20 })).sort((a, b) => b.count - a.count);
}

/** paymentsHKtoFranceAndUS */
export async function getPaymentsHkToFranceAndUs(q: FlowQuery): Promise<RegionCount[]> {
  await new Promise((r) => setTimeout(r, 400));
  const s = seed(q);
  return [
    { regionCode: "EU", region: "Europe", country: "France", count: (311 * s) % 900 + 40 },
    { regionCode: "NA", region: "North America", country: "United States", count: (523 * s) % 1_200 + 60 },
  ];
}
