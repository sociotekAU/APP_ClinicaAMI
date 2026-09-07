import type { Metadata } from "next";
import { DashboardOverview } from "../../components/erp/dashboard-overview";

export const metadata: Metadata = {
  title: "Panel administrativo",
};

export default function PanelPage() {
  return <DashboardOverview />;
}
