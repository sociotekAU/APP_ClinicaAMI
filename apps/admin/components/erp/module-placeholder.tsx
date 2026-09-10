"use client";

import { ArrowLeft, Check, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { AdministrationWorkspace } from "../administration/administration-workspace";
import { AuditViewer } from "../audit/audit-viewer";
import { BillingWorkspace } from "../billing/billing-workspace";
import { AgendaWorkspace } from "../care/agenda-workspace";
import { ClinicalRecordsWorkspace } from "../care/clinical-records-workspace";
import { PatientsManager } from "../care/patients-manager";
import { ClinicalOperationsWorkspace } from "../clinical-operations/clinical-operations-workspace";
import { ConsentsManager } from "../clinical-documents/consents-manager";
import { StudyFilesManager } from "../clinical-documents/study-files-manager";
import { InventoryWorkspace } from "../inventory/inventory-workspace";
import { LaboratoryWorkspace } from "../laboratory/laboratory-workspace";
import { WebContentWorkspace } from "../web-content/web-content-workspace";
import { PermissionManagement } from "./permission-management";
import { getModuleIcon, useErpContext } from "./erp-shell";

export function ModulePlaceholder({ moduleCode }: Readonly<{ moduleCode: string }>) {
  const context = useErpContext();
  const item = context.navigation.find((entry) => entry.module === moduleCode);
  const permission = context.permissions.find((entry) => entry.module === moduleCode);

  if (moduleCode === "permisos") return <PermissionManagement />;

  if (!item || !permission?.canRead) {
    return (
      <section className="module-access-denied" aria-labelledby="denied-title">
        <span><LockKeyhole aria-hidden="true" /></span>
        <p className="eyebrow">Código 403 · AUTH_FORBIDDEN</p>
        <h2 id="denied-title">Módulo no autorizado</h2>
        <p>Este módulo no está habilitado para el rol {context.user.role.name}.</p>
        <Link className="button button-primary" href="/panel"><ArrowLeft aria-hidden="true" /> Volver al inicio</Link>
      </section>
    );
  }

  const Icon = getModuleIcon(item.module);
  const isImplemented = ["seguridad", "pacientes", "agenda", "expediente_general", "expediente_psicologia", "recetas", "laboratorio", "facturacion", "inventario", "archivos_estudios", "consentimientos", "auditoria", "contenido_web"].includes(item.module);
  return (
    <div className="module-page-stack">
      <div className={`module-page${isImplemented ? " module-page-administration" : ""}`}>
        <section className="module-intro">
          <span className="module-intro-icon"><Icon aria-hidden="true" /></span>
          <div>
            <p className="eyebrow">{item.section}</p>
            <h2>{item.label}</h2>
            <p>{item.description}</p>
          </div>
        </section>

        {!isImplemented && <section className="module-readiness" aria-labelledby="readiness-title">
          <div>
            <p className="eyebrow">Base de autorización lista</p>
            <h2 id="readiness-title">Permisos efectivos del rol</h2>
            <p>El contenido funcional de este módulo se incorporará en los pasos de CRUD posteriores.</p>
          </div>
          <ul>
            <li className={permission.canRead ? "is-granted" : ""}>
              {permission.canRead ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
              Lectura
            </li>
            <li className={permission.canWrite ? "is-granted" : ""}>
              {permission.canWrite ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
              Escritura
            </li>
            <li className={permission.canDelete ? "is-granted" : ""}>
              {permission.canDelete ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
              Eliminación
            </li>
          </ul>
        </section>}
      </div>
      {item.module === "seguridad" && <AdministrationWorkspace canWrite={permission.canWrite} />}
      {item.module === "pacientes" && <section className="administration-workspace"><PatientsManager canWrite={permission.canWrite} /></section>}
      {item.module === "agenda" && <AgendaWorkspace canWrite={permission.canWrite} />}
      {item.module === "expediente_general" && <ClinicalRecordsWorkspace canWrite={permission.canWrite} type="general" />}
      {item.module === "expediente_psicologia" && <ClinicalRecordsWorkspace canWrite={permission.canWrite} type="psychology" />}
      {item.module === "recetas" && <ClinicalOperationsWorkspace canWrite={permission.canWrite} />}
      {item.module === "laboratorio" && <LaboratoryWorkspace canWrite={permission.canWrite} />}
      {item.module === "facturacion" && <BillingWorkspace canWrite={permission.canWrite} />}
      {item.module === "inventario" && <InventoryWorkspace canWrite={permission.canWrite} />}
      {item.module === "archivos_estudios" && <section className="administration-workspace"><StudyFilesManager canWrite={permission.canWrite} /></section>}
      {item.module === "consentimientos" && <section className="administration-workspace"><ConsentsManager canWrite={permission.canWrite} /></section>}
      {item.module === "auditoria" && <AuditViewer />}
      {item.module === "contenido_web" && <WebContentWorkspace canWrite={permission.canWrite} />}
    </div>
  );
}
