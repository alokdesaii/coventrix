// Corporate Statistics API contract. Mocked — live endpoints are :50/api/Corporate/* (noted per function).
import type { DateRange } from "@/components/ui";

const delay = () => new Promise((r) => setTimeout(r, 300));
const CLIENTS = ["CLIENT A", "CLIENT B", "CLIENT C", "CLIENT D", "CLIENT E"];

/** topClients */
export async function getTopClientsByProfit(_r: DateRange) {
  await delay();
  return [84_200, 61_500, 47_900, 32_100, 18_750].map((balance, i) => ({ client: CLIENTS[i], balance }));
}

/** topClientsByPayments */
export async function getTopClientsByPayments(_r: DateRange) {
  await delay();
  return [312, 245, 198, 120, 64].map((payments, i) => ({ client: CLIENTS[i], payments }));
}

/** topClientsByQueries — live columns read "Bank Name / Cost of Bank" */
export async function getTopClientsByQueries(_r: DateRange) {
  await delay();
  return [18, 11, 7].map((queries, i) => ({ client: CLIENTS[i], queries }));
}

/** activeInactive */
export async function getActiveInactive(_r: DateRange) {
  await delay();
  return { active: 22, inactive: 998 };
}

/** clientsPerIndustry */
export async function getClientsPerIndustry(_r: DateRange) {
  await delay();
  return ["Accessories", "Adhesives", "Advertising", "Agriculture", "Apparel", "Automotive", "Chemicals", "Construction",
    "Electronics", "Food & Beverage", "Furniture", "Logistics", "Machinery", "Packaging", "Pharmaceuticals", "Textiles"]
    .map((industry, i) => ({ industry, count: ((i * 37) % 120) + 3 }));
}

/** clientsPerCountry — "" = country not recorded */
export async function getClientsPerCountry(_r: DateRange) {
  await delay();
  return ["", "Australia", "Bangladesh", "Canada", "China", "Hong Kong", "India", "Indonesia", "Malaysia", "Philippines",
    "Singapore", "Turkey", "United Arab Emirates", "United Kingdom", "United States", "Vietnam"]
    .map((country, i) => ({ country, count: ((i * 23) % 60) + 1 }));
}
