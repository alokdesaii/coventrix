import { LeadStatusList } from "@/components/lead-status-list";

// ponytail: route keeps the live portal's spelling ("corporateclientatus") so URLs match.
export default function CorporateClientStatusPage() {
  return <LeadStatusList kind="corporate" title="Corporate Clients Status" />;
}
