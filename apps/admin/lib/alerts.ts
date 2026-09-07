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
