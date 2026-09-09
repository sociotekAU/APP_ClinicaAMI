"use client";

import type {
  ErpModuleCode,
  PermissionOptions,
  RolePermission,
  RolePermissionConfiguration,
  RolePermissionsUpdateInput,
} from "@ami/contracts";
import { KeyRound, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, requestPermissionPin, showError, showSuccess } from "../../lib/alerts";
import { isAdministratorRole } from "../../lib/roles";
import { useErpContext } from "./erp-shell";

function signature(permissions: RolePermission[]): string {
  return JSON.stringify(permissions);
}

export function PermissionManagement() {
  const context = useErpContext();
  const isAdmin = isAdministratorRole(context.user.role.name);
  const [options, setOptions] = useState<PermissionOptions | null>(null);
  const [roleId, setRoleId] = useState(0);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [original, setOriginal] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const moduleLabels = useMemo(() => new Map(options?.modules.map((module) => [module.code, module.label]) ?? []), [options]);
  const dirty = signature(permissions) !== signature(original);

  useEffect(() => {
    if (!isAdmin) return;
    apiRequest<PermissionOptions>("/erp/permissions/options").then((result) => {
      setOptions(result);
      const preferredRole = result.roles.find((role) => role.active)?.id ?? result.roles[0]?.id ?? 0;
      setRoleId(preferredRole);
    }).catch((reason: unknown) => {
      const error = reason instanceof ApiClientError ? reason : null;
      void showError("No se cargaron los roles", error?.message ?? "Intente nuevamente.");
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || roleId < 1) return;
    const controller = new AbortController();
    setLoading(true);
    apiRequest<RolePermissionConfiguration>(`/erp/permissions/roles/${roleId}`, { signal: controller.signal })
      .then((result) => {
        setPermissions(result.permissions);
        setOriginal(result.permissions);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const error = reason instanceof ApiClientError ? reason : null;
        void showError("No se cargaron los permisos", error?.message ?? "Intente nuevamente.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [isAdmin, roleId]);

  function update(module: ErpModuleCode, capability: "canRead" | "canWrite" | "canDelete", checked: boolean) {
    setPermissions((current) => current.map((permission) => {
      if (permission.module !== module) return permission;
      if (capability === "canRead" && !checked) {
        return { ...permission, canRead: false, canWrite: false, canDelete: false };
      }
      if ((capability === "canWrite" || capability === "canDelete") && checked) {
        return { ...permission, canRead: true, [capability]: true };
      }
      return { ...permission, [capability]: checked };
    }));
  }

  async function save() {
    if (!dirty || roleId < 1) return;
    const validationPin = await requestPermissionPin();
    if (!validationPin) return;
    setSaving(true);
    try {
      const result = await apiRequest<RolePermissionConfiguration>(`/erp/permissions/roles/${roleId}`, {
        method: "PATCH",
        body: JSON.stringify({ permissions, validationPin } satisfies RolePermissionsUpdateInput),
      });
      setPermissions(result.permissions);
      setOriginal(result.permissions);
      void showSuccess("Permisos actualizados", `La configuración del rol ${result.role.label} quedó guardada y auditada.`);
    } catch (reason) {
      const error = reason instanceof ApiClientError ? reason : null;
      void showError("No se guardaron los permisos", error?.message ?? "Intente nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(nextRoleId: number) {
    if (nextRoleId === roleId) return;
    if (dirty && !(await confirmDiscardChanges())) return;
    setRoleId(nextRoleId);
  }

  if (!isAdmin) {
    return <section className="module-access-denied"><span><KeyRound aria-hidden="true" /></span><p className="eyebrow">Código 403 · AUTH_ADMIN_REQUIRED</p><h2>Administración exclusiva</h2><p>Solo un usuario con rol Administrador puede crear o modificar permisos.</p><Link className="button button-primary" href="/panel">Volver al inicio</Link></section>;
  }

  return <section className="permission-editor" aria-labelledby="permission-editor-title">
    <header className="administration-heading"><div><p className="eyebrow">Administración protegida</p><h2 id="permission-editor-title">Permisos por tipo de usuario</h2><p>Seleccione un rol, configure sus capacidades y autorice el cambio con la clave numérica administrativa.</p></div><span className="access-level-write"><ShieldCheck aria-hidden="true" /> Solo administradores</span></header>
    <div className="permission-editor-toolbar"><label htmlFor="permission-role"><span>Rol</span><select id="permission-role" value={roleId} onChange={(event) => { void changeRole(Number(event.target.value)); }}>{options?.roles.map((role) => <option key={role.id} value={role.id}>{role.label}{role.active ? "" : " (inactivo)"}</option>)}</select></label><button className="button button-primary" type="button" disabled={!dirty || saving || loading} onClick={() => { void save(); }}>{saving ? <LoaderCircle className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Guardar cambios</button></div>
    {loading ? <div className="permission-editor-loading"><LoaderCircle className="spin" aria-hidden="true" /> Cargando permisos…</div> : <div className="permission-editor-table"><table><thead><tr><th>Módulo</th><th>Lectura</th><th>Escritura</th><th>Eliminación</th></tr></thead><tbody>{permissions.map((permission) => <tr key={permission.module}><td><strong>{moduleLabels.get(permission.module) ?? permission.module}</strong><span>{permission.module}</span></td>{(["canRead", "canWrite", "canDelete"] as const).map((capability) => <td key={capability}><label><input type="checkbox" checked={permission[capability]} onChange={(event) => update(permission.module, capability, event.target.checked)} /><span className="sr-only">{capability} en {moduleLabels.get(permission.module) ?? permission.module}</span></label></td>)}</tr>)}</tbody></table></div>}
    <p className="permission-editor-note"><KeyRound aria-hidden="true" /> La clave nunca se almacena en la auditoría. Escritura y eliminación activan también la lectura del módulo.</p>
  </section>;
}
