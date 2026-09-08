"use client";

import type {
  AdministrationOptions,
  StatusInput,
  UserCreateInput,
  UserListItem,
  UserUpdateInput,
} from "@ami/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmDiscardChanges, showError, showSuccess } from "../../lib/alerts";
import { DetailModal, FormModal } from "../crud/modal";
import { FormField, FormSection } from "../crud/form-field";
import { StatusBadge } from "../crud/status-badge";
import { useErpContext } from "../erp/erp-shell";
import { applyApiFormErrors } from "./form-api-error";
import { formatDate, formatDateTime } from "./formatters";
import { RecordActions } from "./record-actions";
import { ResourcePanel } from "./resource-panel";
import { useResourceList } from "./use-resource-list";

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/;
const schema = z.object({
  username: z.string().trim().min(3, "Escriba al menos 3 caracteres.").max(80).regex(/^[a-zA-Z0-9._-]+$/, "Use letras, números, punto, guion o guion bajo."),
  name: z.string().trim().min(2, "Escriba al menos 2 caracteres.").max(150),
  email: z.string().trim().refine((value) => !value || z.email().safeParse(value).success, "Ingrese un correo válido."),
  roleId: z.number().int().positive("Seleccione un rol."),
  professionalId: z.number().int().nonnegative(),
  temporaryPassword: z.string().refine(
    (value) => !value || PASSWORD_POLICY.test(value),
    "Use 12 caracteres con mayúscula, minúscula, número y símbolo.",
  ),
});
type UserForm = z.infer<typeof schema>;
const DEFAULTS: UserForm = {
  username: "",
  name: "",
  email: "",
  roleId: 0,
  professionalId: 0,
  temporaryPassword: "",
};

export function UsersManager({ canWrite }: Readonly<{ canWrite: boolean }>) {
  const context = useErpContext();
  const [roleFilter, setRoleFilter] = useState("");
  const extraQuery = useMemo(
    () => ({ roleId: roleFilter ? Number(roleFilter) : undefined }),
    [roleFilter],
  );
  const list = useResourceList<UserListItem>({
    endpoint: "/administration/users",
    defaultSort: "username",
    extraQuery,
  });
  const [options, setOptions] = useState<AdministrationOptions | null>(null);
  const [detail, setDetail] = useState<UserListItem | null>(null);
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusPending, setStatusPending] = useState<number | null>(null);
  const form = useForm<UserForm>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  useEffect(() => {
    apiRequest<AdministrationOptions>("/administration/options")
      .then(setOptions)
      .catch((reason: unknown) => {
        const error = reason instanceof ApiClientError ? reason : null;
        void showError("No se cargaron las opciones", error?.message ?? "Intente nuevamente.");
      });
  }, []);

  function openCreate() {
    setEditing(null);
    form.reset(DEFAULTS);
    setFormOpen(true);
  }

  function openEdit(row: UserListItem) {
    setEditing(row);
    form.reset({
      username: row.username,
      name: row.name,
      email: row.email ?? "",
      roleId: row.role.id,
      professionalId: row.professional?.id ?? 0,
      temporaryPassword: "",
    });
    setFormOpen(true);
  }

  async function closeForm() {
    if (form.formState.isDirty && !(await confirmDiscardChanges())) return;
    setFormOpen(false);
  }

  const save = form.handleSubmit(async (values) => {
    if (!editing && !values.temporaryPassword) {
      form.setError("temporaryPassword", { message: "Defina una contraseña temporal.", type: "manual" });
      return;
    }
    const common = {
      name: values.name,
      ...(values.email ? { email: values.email } : {}),
      roleId: values.roleId,
      professionalId: values.professionalId || null,
    } satisfies UserUpdateInput;
    const payload: UserCreateInput | UserUpdateInput = editing
      ? common
      : {
          ...common,
          username: values.username,
          temporaryPassword: values.temporaryPassword,
        };
    try {
      await apiRequest<UserListItem>(
        editing ? `/administration/users/${editing.id}` : "/administration/users",
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      setFormOpen(false);
      list.reload();
      void showSuccess(
        editing ? "Usuario actualizado" : "Usuario creado",
        editing
          ? "Los datos y accesos asociados quedaron actualizados."
          : "El usuario deberá cambiar la contraseña temporal en su primer ingreso.",
      );
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se guardó el usuario", `${error.message}${error.requestId ? ` Referencia ${error.requestId}.` : ""}`);
    }
  });

  async function setStatus(row: UserListItem, active: boolean) {
    setStatusPending(row.id);
    try {
      await apiRequest<UserListItem>(`/administration/users/${row.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active } satisfies StatusInput),
      });
      list.reload();
      void showSuccess(active ? "Usuario activado" : "Usuario desactivado", "El historial de acciones permanece disponible.");
    } catch (reason) {
      const error = applyApiFormErrors(reason, form.setError);
      void showError("No se cambió el estado", error.message);
    } finally {
      setStatusPending(null);
    }
  }

  const columns: ColumnDef<UserListItem>[] = [
    {
      id: "username",
      accessorKey: "username",
      header: "Usuario",
      cell: ({ row }) => (
        <div className="table-module-cell">
          <strong>{row.original.username}</strong>
          <span>{row.original.name}</span>
        </div>
      ),
    },
    {
      id: "role",
      accessorFn: (row) => row.role.name,
      header: "Rol",
    },
    {
      id: "professional",
      header: "Profesional",
      enableSorting: false,
      cell: ({ row }) => row.original.professional?.name ?? "Sin vincular",
    },
    {
      id: "lastAccess",
      accessorKey: "lastAccess",
      header: "Último acceso",
      cell: ({ row }) => formatDateTime(row.original.lastAccess),
    },
    {
      id: "status",
      header: "Estado",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge active={row.original.active} activeLabel="Activo" inactiveLabel="Inactivo" />,
    },
    {
      id: "actions",
      header: "Acciones",
      enableSorting: false,
      cell: ({ row }) => (
        <RecordActions
          active={row.original.active}
          canWrite={canWrite}
          disableStatus={row.original.id === context.user.id && row.original.active}
          entityLabel={`al usuario ${row.original.username}`}
          onDetail={() => setDetail(row.original)}
          onEdit={() => openEdit(row.original)}
          onStatus={(active) => setStatus(row.original, active)}
          statusPending={statusPending === row.original.id}
        />
      ),
    },
  ];

  return (
    <>
      <ResourcePanel
        canWrite={canWrite}
        columns={columns}
        description="Cuentas del ERP, roles y vínculos opcionales con profesionales."
        emptyTitle="No hay usuarios"
        emptyDescription="Cambie los filtros o cree la primera cuenta."
        extraFilters={(
          <label>
            <span className="sr-only">Filtrar por rol</span>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">Todos los roles</option>
              {options?.roles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        )}
        getRowId={(row) => String(row.id)}
        list={list}
        onCreate={openCreate}
        searchPlaceholder="Usuario, nombre, correo o rol"
        title="Usuarios"
      />

      <FormModal
        open={formOpen}
        onClose={() => { void closeForm(); }}
        onSubmit={save}
        isSubmitting={form.formState.isSubmitting}
        submitLabel={editing ? "Guardar cambios" : "Crear usuario"}
        title={editing ? "Editar usuario" : "Nuevo usuario"}
        description={editing ? "El nombre de usuario no puede modificarse." : "La contraseña será temporal y deberá cambiarse en el primer ingreso."}
        size="lg"
      >
        <FormSection title="Cuenta">
          <div className="crud-form-grid">
            <FormField htmlFor="user-username" label="Nombre de usuario" required error={form.formState.errors.username?.message}>
              <input {...form.register("username")} disabled={Boolean(editing)} autoComplete="off" />
            </FormField>
            <FormField htmlFor="user-name" label="Nombre completo" required error={form.formState.errors.name?.message}>
              <input {...form.register("name")} autoComplete="name" />
            </FormField>
            <FormField htmlFor="user-email" label="Correo" error={form.formState.errors.email?.message}>
              <input {...form.register("email")} type="email" autoComplete="email" />
            </FormField>
            <FormField htmlFor="user-role" label="Rol" required error={form.formState.errors.roleId?.message}>
              <select {...form.register("roleId", { valueAsNumber: true })}>
                <option value={0}>Seleccione un rol</option>
                {options?.roles.map((option) => (
                  <option key={option.id} value={option.id} disabled={!option.active && option.id !== editing?.role.id}>
                    {option.label}{option.active ? "" : " (inactivo)"}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField htmlFor="user-professional" label="Profesional vinculado" help="Opcional; cada profesional solo puede vincularse a una cuenta." error={form.formState.errors.professionalId?.message}>
              <select {...form.register("professionalId", { valueAsNumber: true })}>
                <option value={0}>Sin profesional vinculado</option>
                {options?.professionals.map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                    disabled={!option.active || (option.linkedUserId !== null && option.linkedUserId !== editing?.id)}
                  >
                    {option.label}{option.linkedUserId && option.linkedUserId !== editing?.id ? " (ya vinculado)" : ""}
                  </option>
                ))}
              </select>
            </FormField>
            {!editing && (
              <FormField htmlFor="user-password" label="Contraseña temporal" required help="Mínimo 12 caracteres: mayúscula, minúscula, número y símbolo." error={form.formState.errors.temporaryPassword?.message}>
                <input {...form.register("temporaryPassword")} type="password" autoComplete="new-password" />
              </FormField>
            )}
          </div>
        </FormSection>
      </FormModal>

      <DetailModal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Detalle del usuario"
        footer={<button className="button button-primary" type="button" onClick={() => setDetail(null)}>Cerrar</button>}
      >
        {detail && (
          <dl className="permission-detail-list">
            <div><dt>Usuario</dt><dd>{detail.username}</dd></div>
            <div><dt>Nombre</dt><dd>{detail.name}</dd></div>
            <div><dt>Correo</dt><dd>{detail.email || "Sin correo"}</dd></div>
            <div><dt>Rol</dt><dd>{detail.role.name}</dd></div>
            <div><dt>Profesional</dt><dd>{detail.professional?.name || "Sin vincular"}</dd></div>
            <div><dt>Cambio pendiente</dt><dd>{detail.mustChangePassword ? "Sí" : "No"}</dd></div>
            <div><dt>Último acceso</dt><dd>{formatDateTime(detail.lastAccess)}</dd></div>
            <div><dt>Creación</dt><dd>{formatDate(detail.createdAt)}</dd></div>
            <div><dt>Estado</dt><dd><StatusBadge active={detail.active} activeLabel="Activo" inactiveLabel="Inactivo" /></dd></div>
          </dl>
        )}
      </DetailModal>
    </>
  );
}
