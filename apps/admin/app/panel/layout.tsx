import type { ReactNode } from "react";
import { ErpShell } from "../../components/erp/erp-shell";

export default function PanelLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ErpShell>{children}</ErpShell>;
}
