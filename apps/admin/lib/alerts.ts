import Swal from "sweetalert2";

const alert = Swal.mixin({
  buttonsStyling: false,
  customClass: {
    popup: "ami-alert",
    title: "ami-alert-title",
    htmlContainer: "ami-alert-copy",
    confirmButton: "button button-primary",
    cancelButton: "button button-secondary",
    actions: "ami-alert-actions",
  },
});

export function showSuccess(title: string, message: string) {
  return alert.fire({ icon: "success", title, text: message, confirmButtonText: "Continuar" });
}

export function showError(title: string, message: string) {
  return alert.fire({ icon: "error", title, text: message, confirmButtonText: "Entendido" });
}

export async function confirmLogout(): Promise<boolean> {
  const result = await alert.fire({
    icon: "question",
    title: "¿Cerrar sesión?",
    text: "Tendrá que ingresar sus credenciales para volver al sistema.",
    showCancelButton: true,
    confirmButtonText: "Sí, cerrar sesión",
    cancelButtonText: "Cancelar",
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export async function confirmStatusChange(entityLabel: string, nextActive: boolean): Promise<boolean> {
  const action = nextActive ? "activar" : "desactivar";
  const result = await alert.fire({
    icon: "warning",
    title: `¿${nextActive ? "Activar" : "Desactivar"} registro?`,
    text: `Se va a ${action} ${entityLabel}. El historial permanecerá disponible.`,
    showCancelButton: true,
    confirmButtonText: `Sí, ${action}`,
    cancelButtonText: "Cancelar",
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export async function confirmDiscardChanges(): Promise<boolean> {
  const result = await alert.fire({
    icon: "question",
    title: "¿Descartar cambios?",
    text: "Los datos que todavía no se guardaron se perderán.",
    showCancelButton: true,
    confirmButtonText: "Sí, descartar",
    cancelButtonText: "Continuar editando",
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export async function confirmAppointmentStatus(statusLabel: string): Promise<boolean> {
  const result = await alert.fire({
    icon: "warning",
    title: "¿Cambiar estado de la cita?",
    text: `La cita se marcará como ${statusLabel}. Los estados finales no podrán revertirse.`,
    showCancelButton: true,
    confirmButtonText: "Sí, cambiar estado",
    cancelButtonText: "Cancelar",
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export async function requestAnnulmentReason(): Promise<string | null> {
  const result = await alert.fire({
    icon: "warning",
    title: "¿Anular esta receta?",
    text: "La receta se conservará como historial y no podrá reactivarse.",
    input: "textarea",
    inputLabel: "Motivo de anulación",
    inputPlaceholder: "Explique brevemente el motivo…",
    inputAttributes: { maxlength: "2000" },
    inputValidator: (value) => value.trim().length < 5 ? "Escriba al menos 5 caracteres." : undefined,
    showCancelButton: true,
    confirmButtonText: "Sí, anular receta",
    cancelButtonText: "Cancelar",
    reverseButtons: true,
  });
  return result.isConfirmed ? String(result.value).trim() : null;
}

export async function confirmLabCompletion(): Promise<boolean> {
  const result = await alert.fire({
    icon: "warning",
    title: "¿Finalizar la orden?",
    text: "Los resultados quedarán bloqueados y la orden no podrá reabrirse.",
    showCancelButton: true,
    confirmButtonText: "Sí, finalizar",
    cancelButtonText: "Cancelar",
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export async function requestPermissionPin(): Promise<string | null> {
  const result = await alert.fire({
    icon: "warning",
    title: "Autorizar cambios de permisos",
    text: "Ingrese la clave numérica administrativa de 6 dígitos. El cambio quedará registrado en auditoría.",
    input: "password",
    inputLabel: "Clave numérica",
    inputPlaceholder: "••••••",
    inputAttributes: {
      autocomplete: "off",
      inputmode: "numeric",
      maxlength: "6",
      pattern: "[0-9]{6}",
    },
    inputValidator: (value) => /^\d{6}$/.test(value) ? undefined : "Ingrese exactamente 6 dígitos.",
    showCancelButton: true,
    confirmButtonText: "Validar y guardar",
    cancelButtonText: "Cancelar",
    reverseButtons: true,
  });
  return result.isConfirmed ? String(result.value) : null;
}
