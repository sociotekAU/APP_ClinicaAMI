import type {
  ErpModuleCode,
  ErpNavigationItem,
  PermissionAction,
} from "@ami/contracts";

export const PERMISSION_METADATA_KEY = "ami:required-permissions";

export interface RequiredPermission {
  action: PermissionAction;
  module: ErpModuleCode;
}

export const PERMISSION_FIELD: Record<PermissionAction, "puede_leer" | "puede_escribir" | "puede_borrar"> = {
  read: "puede_leer",
  write: "puede_escribir",
  delete: "puede_borrar",
};

export const ERP_MODULE_CODES: readonly ErpModuleCode[] = [
  "seguridad",
  "pacientes",
  "agenda",
  "expediente_general",
  "expediente_psicologia",
  "recetas",
  "laboratorio",
  "facturacion",
  "inventario",
  "archivos_estudios",
  "consentimientos",
];

export const ERP_MODULES = new Set<ErpModuleCode>(ERP_MODULE_CODES);

export const ERP_NAVIGATION: readonly ErpNavigationItem[] = [
  {
    module: "pacientes",
    label: "Pacientes",
    description: "Directorio y datos generales de pacientes.",
    href: "/panel/modulos/pacientes",
    section: "Atención",
  },
  {
    module: "agenda",
    label: "Agenda",
    description: "Citas y coordinación de la atención.",
    href: "/panel/modulos/agenda",
    section: "Atención",
  },
  {
    module: "expediente_general",
    label: "Expediente clínico",
    description: "Consultas, evolución y signos vitales.",
    href: "/panel/modulos/expediente_general",
    section: "Gestión clínica",
  },
  {
    module: "expediente_psicologia",
    label: "Expediente psicológico",
    description: "Área reservada para psicología.",
    href: "/panel/modulos/expediente_psicologia",
    section: "Gestión clínica",
  },
  {
    module: "recetas",
    label: "Recetas",
    description: "Prescripciones y medicamentos indicados.",
    href: "/panel/modulos/recetas",
    section: "Gestión clínica",
  },
  {
    module: "laboratorio",
    label: "Laboratorio",
    description: "Órdenes, pruebas y resultados.",
    href: "/panel/modulos/laboratorio",
    section: "Gestión clínica",
  },
  {
    module: "archivos_estudios",
    label: "Archivos y estudios",
    description: "Documentos y estudios asociados al expediente.",
    href: "/panel/modulos/archivos_estudios",
    section: "Gestión clínica",
  },
  {
    module: "consentimientos",
    label: "Consentimientos",
    description: "Seguimiento de documentos informados.",
    href: "/panel/modulos/consentimientos",
    section: "Gestión clínica",
  },
  {
    module: "facturacion",
    label: "Facturación",
    description: "Cobros y comprobantes de atención.",
    href: "/panel/modulos/facturacion",
    section: "Operación",
  },
  {
    module: "inventario",
    label: "Inventario",
    description: "Existencias, insumos y movimientos.",
    href: "/panel/modulos/inventario",
    section: "Operación",
  },
  {
    module: "seguridad",
    label: "Usuarios y seguridad",
    description: "Usuarios, roles y accesos del sistema.",
    href: "/panel/modulos/seguridad",
    section: "Administración",
  },
];

export function isErpModuleCode(value: string): value is ErpModuleCode {
  return ERP_MODULES.has(value as ErpModuleCode);
}
