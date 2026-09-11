"use client";

import type { AnnouncementPosition, PublicWebAnnouncement } from "@ami/contracts";
import { ArrowLeft, ArrowRight, BadgePercent, CalendarDays, HeartPulse, Info, Megaphone, ShieldAlert, X, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { formatPublicationDate, safePublicationColor, safePublicationMediaUrl } from "../../lib/publication-presentation";
import styles from "./public-announcement-popups.module.css";

type PopupStyle = CSSProperties & {
  "--popup-bg": string;
  "--popup-fg": string;
};

const POSITION_CLASSES: Record<AnnouncementPosition, string> = {
  inferior_derecha: styles.bottomRight ?? "",
  inferior_izquierda: styles.bottomLeft ?? "",
  superior_derecha: styles.topRight ?? "",
  superior_izquierda: styles.topLeft ?? "",
  centro: styles.center ?? "",
};

function announcementIcon(value: string | null): LucideIcon {
  const icon = value?.trim().toLocaleLowerCase("es") ?? "";
  if (icon.includes("heart") || icon.includes("salud")) return HeartPulse;
  if (icon.includes("alert") || icon.includes("warning")) return ShieldAlert;
  if (icon.includes("calendar") || icon.includes("fecha")) return CalendarDays;
  if (icon.includes("info")) return Info;
  return Megaphone;
}

export function PublicAnnouncementPopups({ announcements }: Readonly<{ announcements: PublicWebAnnouncement[] }>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const announcement = announcements[activeIndex];

  useEffect(() => {
    const element = dialog.current;
    if (announcements.length > 0 && element && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, [announcements.length]);

  if (!announcement) return null;

  const Icon = announcementIcon(announcement.style.icon);
  const imageUrl = safePublicationMediaUrl(announcement.imageUrl);
  const popupStyle: PopupStyle = {
    "--popup-bg": safePublicationColor(announcement.style.backgroundColor, "#0b4c81"),
    "--popup-fg": safePublicationColor(announcement.style.textColor, "#ffffff"),
  };
  const titleId = `announcement-popup-title-${announcement.id}`;
  const descriptionId = announcement.description ? `announcement-popup-description-${announcement.id}` : undefined;

  return (
    <dialog
      className={`${styles.popupDialog} ${POSITION_CLASSES[announcement.style.position]}`}
      ref={dialog}
      style={popupStyle}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <article className={styles.popupPanel} key={announcement.id}>
        <button className={styles.closeButton} type="button" onClick={() => dialog.current?.close()} aria-label="Cerrar anuncio">
          <X aria-hidden="true" />
        </button>

        {imageUrl && (
          <div className={styles.popupImage}>
            <img src={imageUrl} alt={announcement.title} width="1200" height="720" decoding="async" />
          </div>
        )}

        <div className={styles.popupContent}>
          <div className={styles.popupMeta}>
            <span><Icon aria-hidden="true" /> {announcement.style.name}</span>
            <span className={styles.activeBadge}>Activo y vigente</span>
          </div>
          <h2 id={titleId}>{announcement.title}</h2>
          {announcement.description && <p id={descriptionId}>{announcement.description}</p>}
          <div className={styles.popupDates}>
            <CalendarDays aria-hidden="true" />
            <span>
              Del <time dateTime={announcement.startDate}>{formatPublicationDate(announcement.startDate)}</time>
              {" al "}
              <time dateTime={announcement.endDate}>{formatPublicationDate(announcement.endDate)}</time>
            </span>
          </div>
          {announcement.promotion && (
            <div className={styles.linkedPromotion}>
              <BadgePercent aria-hidden="true" /> Promoción relacionada: <strong>{announcement.promotion.title}</strong>
            </div>
          )}

          {announcements.length > 1 && (
            <div className={styles.popupNavigation}>
              <span>{activeIndex + 1} de {announcements.length}</span>
              <div>
                <button type="button" onClick={() => setActiveIndex((current) => (current - 1 + announcements.length) % announcements.length)} aria-label="Ver anuncio anterior">
                  <ArrowLeft aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setActiveIndex((current) => (current + 1) % announcements.length)} aria-label="Ver anuncio siguiente">
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </article>
    </dialog>
  );
}
