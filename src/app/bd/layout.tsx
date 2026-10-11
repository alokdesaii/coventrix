import { AppShell } from "@/components/shell/app-shell";
import { BD_NAV } from "@/components/shell/nav";

export default function BdLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={BD_NAV}>
      {children}
    </AppShell>
  );
}
