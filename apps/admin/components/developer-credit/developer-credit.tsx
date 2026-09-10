"use client";

import Link from "next/link";
import { Code2, ExternalLink, Sparkles } from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
  useState,
} from "react";

import { Modal } from "../crud/modal";

import {
  LONG_PRESS_DURATION_MS,
  movedBeyondLongPressTolerance,
} from "./developer-credit-interaction";
import {
  SOCIOTEC_CREDIT,
  type DeveloperCreditConfig,
} from "./developer-credit.config";
import styles from "./developer-credit.module.css";

type DeveloperCreditProps = {
  config?: DeveloperCreditConfig;
  variant: "easter-egg" | "sidebar";
};

export function DeveloperCredit({
  config = SOCIOTEC_CREDIT,
  variant,
}: DeveloperCreditProps) {
  const [open, setOpen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressOrigin = useRef({ x: 0, y: 0 });
  const touchInteraction = useRef(false);
  const suppressNextClick = useRef(false);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setPressing(false);
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse") return;

    touchInteraction.current = true;
    suppressNextClick.current = false;
    pressOrigin.current = { x: event.clientX, y: event.clientY };
    setPressing(true);

    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      suppressNextClick.current = true;
      setPressing(false);
      setOpen(true);
    }, LONG_PRESS_DURATION_MS);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (
      pressing &&
      movedBeyondLongPressTolerance(pressOrigin.current, {
        x: event.clientX,
        y: event.clientY,
      })
    ) {
      cancelLongPress();
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (touchInteraction.current) {
      touchInteraction.current = false;
      event.preventDefault();
      if (suppressNextClick.current) {
        suppressNextClick.current = false;
      }
      return;
    }

    setOpen(true);
  };

  if (variant === "sidebar") {
    return (
      <Link
        className={styles.sidebarCredit}
        href={config.route}
        title={`Desarrollado por ${config.brandName}`}
      >
        <span className={styles.sidebarMark} aria-hidden="true">
          <Code2 size={16} strokeWidth={2.2} />
        </span>
        <span className={styles.sidebarCopy}>
          <small>Desarrollado por</small>
          <strong>{config.brandName}</strong>
        </span>
        <ExternalLink
          className={styles.sidebarExternalIcon}
          size={14}
          aria-hidden="true"
        />
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.easterEggTrigger} ${pressing ? styles.pressing : ""}`}
        aria-label={`Información del desarrollador ${config.brandName}`}
        aria-describedby="developer-credit-touch-hint"
        title={`Desarrollado por ${config.brandName}`}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onContextMenu={(event) => {
          if (pressing || touchInteraction.current) event.preventDefault();
        }}
      >
        <Sparkles size={15} aria-hidden="true" />
        <span className={styles.easterEggText}>Créditos</span>
        <span className={styles.progressRing} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
          </svg>
        </span>
      </button>

      <span id="developer-credit-touch-hint" className={styles.srOnly}>
        En una pantalla táctil, mantenga presionado durante un segundo para abrir.
      </span>

      <Modal
        open={open}
        title="Un detalle de quienes construyeron este sistema"
        description="Gracias por permitirnos acompañar el crecimiento de Clínica AMI."
        onClose={() => setOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => setOpen(false)}
            >
              Cerrar
            </button>
            <Link className="button button-primary" href={config.route}>
              Conocer a {config.brandName}
            </Link>
          </>
        }
      >
        <div className={styles.revealCard}>
          <div className={styles.revealLogo}>
            {logoFailed ? (
              <span aria-label={config.brandName}>SO</span>
            ) : (
              <img
                src={config.logoUrl}
                alt={`Logotipo de ${config.brandName}`}
                onError={() => setLogoFailed(true)}
              />
            )}
          </div>
          <div>
            <span className={styles.revealEyebrow}>Desarrollado por</span>
            <strong>{config.brandName}</strong>
            <p>
              Soluciones web y software a la medida para convertir ideas en
              herramientas que sí acompañan el trabajo diario.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
