"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthSession } from "@ami/contracts";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { type LoginValues, loginSchema } from "../../lib/auth-schema";
import { showError } from "../../lib/alerts";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const submit = handleSubmit(async (values) => {
    try {
      const session = await apiRequest<AuthSession>(
        "/auth/login",
        { method: "POST", body: JSON.stringify(values) },
        false,
      );
      router.replace(session.user.mustChangePassword ? "/cambiar-contrasena" : "/panel");
    } catch (error) {
      const message = error instanceof ApiClientError
        ? error.message
        : "Ocurrió un error inesperado al iniciar sesión.";
      await showError("No fue posible ingresar", message);
    }
  });

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <div className="field-group">
        <label htmlFor="username">Usuario</label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          aria-invalid={Boolean(errors.username)}
          aria-describedby={errors.username ? "username-error" : undefined}
          placeholder="Ingrese su usuario"
          {...register("username")}
        />
        {errors.username && <p className="field-error" id="username-error">{errors.username.message}</p>}
      </div>

      <div className="field-group">
        <label htmlFor="password">Contraseña</label>
        <div className="password-field">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            placeholder="Ingrese su contraseña"
            {...register("password")}
          />
          <button
            type="button"
            className="icon-button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
        {errors.password && <p className="field-error" id="password-error">{errors.password.message}</p>}
      </div>

      <button className="button button-primary button-wide" type="submit" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="spin" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
        {isSubmitting ? "Validando acceso…" : "Ingresar al sistema"}
      </button>
    </form>
  );
}
