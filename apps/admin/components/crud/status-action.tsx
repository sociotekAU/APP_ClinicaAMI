"use client";

import { LoaderCircle, Power } from "lucide-react";
import { confirmStatusChange } from "../../lib/alerts";

interface StatusActionProps {
  active: boolean;
  disabled?: boolean;
  entityLabel: string;
  onChange: (nextActive: boolean) => Promise<void> | void;
  pending?: boolean;
}

export function StatusAction({ active, disabled = false, entityLabel, onChange, pending = false }: StatusActionProps) {
  async function handleClick() {
    const nextActive = !active;
    if (!(await confirmStatusChange(entityLabel, nextActive))) return;
    await onChange(nextActive);
  }

  return (
    <button
      className="status-action-button"
      type="button"
      disabled={disabled || pending}
      onClick={handleClick}
    >
      {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Power aria-hidden="true" />}
      {active ? "Desactivar" : "Activar"}
    </button>
  );
}
