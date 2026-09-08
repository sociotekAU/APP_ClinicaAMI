import { Check, Minus } from "lucide-react";

export function StatusBadge({ active, activeLabel = "Permitido", inactiveLabel = "Sin permiso" }: Readonly<{
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}>) {
  return (
    <span className={`status-badge ${active ? "is-active" : "is-inactive"}`}>
      {active ? <Check aria-hidden="true" /> : <Minus aria-hidden="true" />}
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
