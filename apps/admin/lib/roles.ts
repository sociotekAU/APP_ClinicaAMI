export function isAdministratorRole(roleName: string): boolean {
  const normalized = roleName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return normalized === "admin" || normalized.includes("administrador");
}
