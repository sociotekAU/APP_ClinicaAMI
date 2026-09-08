"use client";

import { Eye, Pencil } from "lucide-react";
import { StatusAction } from "../crud/status-action";

interface RecordActionsProps {
  active: boolean;
  canWrite: boolean;
  disableStatus?: boolean;
  entityLabel: string;
  onDetail: () => void;
  onEdit: () => void;
  onStatus: (active: boolean) => Promise<void>;
  statusPending?: boolean;
}

export function RecordActions({
  active,
  canWrite,
  disableStatus,
  entityLabel,
  onDetail,
  onEdit,
  onStatus,
  statusPending,
}: RecordActionsProps) {
  return (
    <div className="record-actions">
      <button className="table-action-button" type="button" onClick={onDetail}>
        <Eye aria-hidden="true" /> Detalle
      </button>
      {canWrite && (
        <>
          <button className="table-action-button" type="button" onClick={onEdit}>
            <Pencil aria-hidden="true" /> Editar
          </button>
          <StatusAction
            active={active}
            disabled={disableStatus}
            entityLabel={entityLabel}
            onChange={onStatus}
            pending={statusPending}
          />
        </>
      )}
    </div>
  );
}
