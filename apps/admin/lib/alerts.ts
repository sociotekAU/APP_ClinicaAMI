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
