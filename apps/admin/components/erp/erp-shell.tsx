"use client";

import type {
  ErpContext,
  ErpModuleCode,
  ErpNavigationSection,
} from "@ami/contracts";
import {
  Boxes,
  Brain,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  Files,
  FlaskConical,
  LayoutDashboard,
  KeyRound,
  LoaderCircle,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PanelsTopLeft,
  Pill,
  ReceiptText,
  ShieldCheck,
  ScrollText,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiClientError, apiRequest } from "../../lib/api-client";
import { confirmLogout, showError } from "../../lib/alerts";
import { isAdministratorRole } from "../../lib/roles";
import { DeveloperCredit } from "../developer-credit/developer-credit";

const NAVIGATION_SECTIONS: ErpNavigationSection[] = [
  "Atención",
  "Gestión clínica",
  "Operación",
  "Administración",
];
const ADMIN_PERMISSIONS_PATH = "/panel/modulos/permisos";

const MODULE_ICONS: Record<ErpModuleCode, LucideIcon> = {
  seguridad: ShieldCheck,
  pacientes: UsersRound,
  agenda: CalendarDays,
  expediente_general: ClipboardList,
  expediente_psicologia: Brain,
  recetas: Pill,
  laboratorio: FlaskConical,
  facturacion: ReceiptText,
  inventario: Boxes,
  archivos_estudios: Files,
  consentimientos: FileCheck2,
  auditoria: ScrollText,
  contenido_web: PanelsTopLeft,
};

const ErpContextState = createContext<ErpContext | null>(null);

export function useErpContext(): ErpContext {
  const context = useContext(ErpContextState);
  if (!context) throw new Error("El contexto ERP aún no está disponible.");
  return context;
}

export function getModuleIcon(module: ErpModuleCode): LucideIcon {
  return MODULE_ICONS[module];
}

export function ErpShell({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [context, setContext] = useState<ErpContext | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<ErpNavigationSection>>(
    () => new Set(NAVIGATION_SECTIONS),
  );

  useEffect(() => {
    let active = true;
    apiRequest<ErpContext>("/erp/context")
      .then((currentContext) => {
        if (!active) return;
        if (currentContext.user.mustChangePassword) {
          router.replace("/cambiar-contrasena");
          return;
        }
        setContext(currentContext);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiClientError && error.status === 403) {
          setAccessError(error.message);
          return;
        }
        router.replace("/login");
      });

    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const currentItem = useMemo(
    () => context?.navigation.find((item) => pathname === item.href),
    [context, pathname],
  );

  useEffect(() => {
    const activeSection = pathname === ADMIN_PERMISSIONS_PATH
      ? "Administración"
      : currentItem?.section;
    if (!activeSection) return;
    setOpenSections((current) => {
      if (current.has(activeSection)) return current;
      const next = new Set(current);
      next.add(activeSection);
      return next;
    });
  }, [currentItem?.section, pathname]);

  function toggleSection(section: ErpNavigationSection) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  async function logout() {
    if (!(await confirmLogout())) return;
    try {
      await apiRequest<{ loggedOut: true }>("/auth/logout", { method: "POST" }, false);
      router.replace("/login");
    } catch {
      await showError("No se pudo cerrar la sesión", "Inténtelo nuevamente en unos segundos.");
    }
  }

  if (accessError) {
    return (
      <main className="erp-state-page">
        <ShieldCheck aria-hidden="true" />
        <p className="eyebrow">Acceso no configurado</p>
        <h1>No hay módulos disponibles</h1>
        <p>{accessError}</p>
        <button className="button button-primary" type="button" onClick={logout}>Cerrar sesión</button>
      </main>
    );
  }

  if (!context) {
    return (
      <main className="session-loading">
        <LoaderCircle className="spin" aria-hidden="true" />
        <p>Validando accesos del rol…</p>
      </main>
    );
  }

  const initials = context.user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const pageTitle = currentItem?.label ?? "Resumen general";
  const isAdmin = isAdministratorRole(context.user.role.name);
  const resolvedPageTitle = pathname === ADMIN_PERMISSIONS_PATH ? "Administración de permisos" : pageTitle;

  return (
    <ErpContextState.Provider value={context}>
      <div className={`erp-shell${collapsed ? " erp-shell-collapsed" : ""}`}>
        <button
          className={`erp-mobile-overlay${mobileOpen ? " is-visible" : ""}`}
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
        />
        <aside className={`erp-sidebar${mobileOpen ? " is-open" : ""}`} aria-label="Menú del sistema">
          <div className="erp-brand">
            <Image src="/brand/logo-ami.png" alt="Clínica A.M.I." width={52} height={50} priority />
            <div className="erp-brand-copy">
              <strong>Clínica A.M.I.</strong>
              <span>Sistema ERP</span>
            </div>
            <button
              className="erp-mobile-close"
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setMobileOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <nav className="erp-nav" aria-label="Navegación principal">
            <Link className={`erp-nav-link${pathname === "/panel" ? " is-active" : ""}`} href="/panel">
              <LayoutDashboard aria-hidden="true" />
              <span>Inicio</span>
            </Link>
            {NAVIGATION_SECTIONS.map((section) => {
              const items = context.navigation.filter((item) => item.section === section);
              const showPermissionAdministration = isAdmin && section === "Administración";
              if (items.length === 0 && !showPermissionAdministration) return null;
              const sectionOpen = openSections.has(section);
              return (
                <div className="erp-nav-section" key={section}>
                  <button className="erp-nav-section-toggle" type="button" aria-expanded={sectionOpen} onClick={() => toggleSection(section)} title={collapsed ? section : undefined}><span>{section}</span><ChevronDown aria-hidden="true" /></button>
                  <div className="erp-nav-section-items" hidden={!sectionOpen}>
                    {items.map((item) => {
                      const Icon = MODULE_ICONS[item.module];
                      const active = pathname === item.href;
                      return (
                        <Link
                          className={`erp-nav-link${active ? " is-active" : ""}`}
                          href={item.href}
                          key={item.module}
                          aria-current={active ? "page" : undefined}
                          title={collapsed ? item.label : undefined}
                        >
                          <Icon aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                    {showPermissionAdministration && <Link className={`erp-nav-link${pathname === ADMIN_PERMISSIONS_PATH ? " is-active" : ""}`} href={ADMIN_PERMISSIONS_PATH} aria-current={pathname === ADMIN_PERMISSIONS_PATH ? "page" : undefined} title={collapsed ? "Administrar permisos" : undefined}><KeyRound aria-hidden="true" /><span>Administrar permisos</span></Link>}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="erp-sidebar-footer-group">
            <div className="erp-sidebar-footer">
              <ShieldCheck aria-hidden="true" />
              <div>
                <strong>Acceso por rol</strong>
                <span>{context.user.role.name}</span>
              </div>
            </div>
            <DeveloperCredit variant="sidebar" />
          </div>
        </aside>

        <div className="erp-workspace">
          <header className="erp-header">
            <div className="erp-header-leading">
              <button
                className="erp-mobile-menu"
                type="button"
                aria-label="Abrir menú"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(true)}
              >
                <Menu aria-hidden="true" />
              </button>
              <button
                className="erp-collapse-button"
                type="button"
                aria-label={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
                onClick={() => setCollapsed((value) => !value)}
              >
                {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
              </button>
              <div>
                <nav className="erp-breadcrumbs" aria-label="Ruta de navegación">
                  <Link href="/panel">Inicio</Link>
                  {currentItem && (
                    <>
                      <ChevronRight aria-hidden="true" />
                      <span aria-current="page">{currentItem.label}</span>
                    </>
                  )}
                  {pathname === ADMIN_PERMISSIONS_PATH && <><ChevronRight aria-hidden="true" /><span aria-current="page">Administración de permisos</span></>}
                </nav>
                <h1>{resolvedPageTitle}</h1>
              </div>
            </div>

            <div className="erp-profile">
              <span className="profile-avatar" aria-hidden="true">{initials}</span>
              <div>
                <strong>{context.user.name}</strong>
                <span>{context.user.role.name}</span>
              </div>
              <button className="erp-logout" type="button" onClick={logout} aria-label="Cerrar sesión">
                <LogOut aria-hidden="true" />
                <span>Salir</span>
              </button>
            </div>
          </header>

          <main className="erp-content">{children}</main>
        </div>
      </div>
    </ErpContextState.Provider>
  );
}
