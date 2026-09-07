import type { Metadata } from "next";
import { SessionPanel } from "../../components/auth/session-panel";

export const metadata: Metadata = {
  title: "Panel administrativo",
};

export default function PanelPage() {
  return <SessionPanel />;
}
