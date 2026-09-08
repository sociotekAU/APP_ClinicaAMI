"use client";

import { ExternalLink, LoaderCircle, X } from "lucide-react";
import {
  type FormEventHandler,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type ModalSize = "sm" | "md" | "lg" | "media";

interface ModalProps {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  title: string;
}

export function Modal({
  children,
  description,
  footer,
  open,
  onClose,
  size = "md",
  title,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => setMounted(true), []);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const focusFirst = () => dialogRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
    const frame = window.requestAnimationFrame(focusFirst);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [open]);

  if (!mounted || !open) return null;

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={closeFromBackdrop}>
      <div
        className={`crud-modal crud-modal-${size}`}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header className="crud-modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar modal"><X aria-hidden="true" /></button>
        </header>
        <div className="crud-modal-body">{children}</div>
        {footer && <footer className="crud-modal-footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

interface FormModalProps extends Omit<ModalProps, "footer"> {
  cancelLabel?: string;
  isSubmitting?: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitLabel: string;
}

export function FormModal({
  cancelLabel = "Cancelar",
  children,
  isSubmitting = false,
  onClose,
  onSubmit,
  submitLabel,
  ...modalProps
}: FormModalProps) {
  const formId = useId();
  return (
    <Modal
      {...modalProps}
      onClose={onClose}
      footer={(
        <>
          <button className="button button-secondary" type="button" onClick={onClose} disabled={isSubmitting}>{cancelLabel}</button>
          <button className="button button-primary" type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle className="spin" aria-hidden="true" />}
            {isSubmitting ? "Guardando…" : submitLabel}
          </button>
        </>
      )}
    >
      <form className="crud-form" id={formId} onSubmit={onSubmit} noValidate>{children}</form>
    </Modal>
  );
}

export function DetailModal(props: ModalProps) {
  return <Modal {...props} size={props.size ?? "md"} />;
}

interface MediaPreviewModalProps extends Omit<ModalProps, "children" | "size"> {
  alt?: string;
  kind: "document" | "image";
  url: string;
}

export function MediaPreviewModal({ alt = "Vista previa", kind, url, ...modalProps }: MediaPreviewModalProps) {
  const safeUrl = url.startsWith("/") || /^(https?:|blob:)/i.test(url);
  return (
    <Modal
      {...modalProps}
      size="media"
      footer={safeUrl
        ? <a className="button button-secondary" href={url} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" /> Abrir en otra pestaña</a>
        : undefined}
    >
      {!safeUrl
        ? <p>No es posible mostrar este archivo porque su dirección no es segura.</p>
        : kind === "image"
          ? <img className="media-preview-image" src={url} alt={alt} />
          : <iframe className="media-preview-document" src={url} title={alt} />}
    </Modal>
  );
}
