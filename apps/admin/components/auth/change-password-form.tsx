"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthSession } from "@ami/contracts";
import { Check, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "../../lib/auth-schema";
import { showError, showSuccess } from "../../lib/alerts";

const requirements = [
  "12 caracteres como mínimo",
  "Una mayúscula y una minúscula",
  "Un número y un símbolo",
];

export function ChangePasswordForm() {
  const router = useRouter();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await apiRequest<AuthSession>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      await showSuccess("Contraseña actualizada", "Su cuenta ya está protegida con la nueva contraseña.");
      router.replace("/panel");
    } catch (error) {
      const message = error instanceof ApiClientError
        ? error.message
        : "No fue posible actualizar la contraseña.";
      await showError("Revise la información", message);
      if (error instanceof ApiClientError && error.status === 401) {
        router.replace("/login");
      }
    }
  });

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <PasswordInput
        id="currentPassword"
        label="Contraseña temporal"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        registration={register("currentPassword")}
      />
      <PasswordInput
        id="newPassword"
        label="Nueva contraseña"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        registration={register("newPassword")}
      />
      <ul className="password-requirements">
        {requirements.map((requirement) => <li key={requirement}><Check aria-hidden="true" />{requirement}</li>)}
      </ul>
      <PasswordInput
        id="confirmPassword"
        label="Confirmar nueva contraseña"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        registration={register("confirmPassword")}
      />
      <button className="button button-primary button-wide" type="submit" disabled={isSubmitting}>
        {isSubmitting && <LoaderCircle className="spin" aria-hidden="true" />}
        {isSubmitting ? "Actualizando…" : "Guardar y continuar"}
      </button>
    </form>
  );
}

interface PasswordInputProps {
  id: keyof ChangePasswordValues;
  label: string;
  autoComplete: string;
  error?: string;
  registration: UseFormRegisterReturn;
}

function PasswordInput({ id, label, autoComplete, error, registration }: PasswordInputProps) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...registration}
      />
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
