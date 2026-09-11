"use client";

import type { PublicWebPromotion } from "@ami/contracts";
import { ArrowRight, BadgePercent, CalendarDays, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { formatPublicationDate, safePublicationMediaUrl } from "../../lib/publication-presentation";
import styles from "../../app/(public)/anuncios/announcements.module.css";

type DelayedCardStyle = CSSProperties & { "--card-delay": string };

export function PublicPromotions({ promotions }: Readonly<{ promotions: PublicWebPromotion[] }>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [activePromotion, setActivePromotion] = useState<PublicWebPromotion | null>(null);

  useEffect(() => {
    const element = dialog.current;
    if (activePromotion && element && !element.open) element.showModal();
  }, [activePromotion]);

  function closeModal() {
    dialog.current?.close();
  }

  const activeImageUrl = safePublicationMediaUrl(activePromotion?.imageUrl ?? null);

  return (
    <>
      <div className={styles.promotionList}>
        {promotions.map((promotion, index) => {
          const imageUrl = safePublicationMediaUrl(promotion.imageUrl);
          const cardStyle: DelayedCardStyle = { "--card-delay": `${Math.min(index, 6) * 70}ms` };
          return (
            <button
              className={styles.promotionCard}
              type="button"
              style={cardStyle}
              key={promotion.id}
              onClick={() => setActivePromotion(promotion)}
              aria-label={`Ver información completa de ${promotion.title}`}
            >
              <span className={styles.promotionMedia}>
                {imageUrl
                  ? <img src={imageUrl} alt="" width="1000" height="620" loading={index === 0 ? "eager" : "lazy"} decoding="async" />
                  : <span className={styles.promotionPlaceholder} aria-hidden="true"><BadgePercent /></span>}
              </span>
              <span className={styles.promotionContent}>
                <span className={styles.promotionLabel}><BadgePercent aria-hidden="true" /> Activa y vigente</span>
                <span className={styles.promotionTitle}>{promotion.title}</span>
                {promotion.description && <span className={styles.promotionDescription}>{promotion.description}</span>}
                <span className={styles.promotionCardFooter}>
                  <span className={styles.promotionDate}>
                    <CalendarDays aria-hidden="true" />
                    Hasta el <time dateTime={promotion.endDate}>{formatPublicationDate(promotion.endDate)}</time>
                  </span>
                  <span className={styles.promotionOpen}>Ver información <ArrowRight aria-hidden="true" /></span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <dialog
        className={styles.promotionDialog}
        ref={dialog}
        aria-labelledby={activePromotion ? `promotion-modal-title-${activePromotion.id}` : undefined}
        aria-describedby={activePromotion?.description ? `promotion-modal-description-${activePromotion.id}` : undefined}
        onClose={() => setActivePromotion(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        {activePromotion && (
          <article className={styles.promotionModal}>
            <button className={styles.modalClose} type="button" onClick={closeModal} aria-label="Cerrar promoción">
              <X aria-hidden="true" />
            </button>
            {activeImageUrl && (
              <div className={styles.promotionModalImage}>
                <img src={activeImageUrl} alt={activePromotion.title} width="1400" height="900" decoding="async" />
              </div>
            )}
            <div className={styles.promotionModalContent}>
              <span className={styles.promotionLabel}><BadgePercent aria-hidden="true" /> Activa y vigente</span>
              <h2 id={`promotion-modal-title-${activePromotion.id}`}>{activePromotion.title}</h2>
              {activePromotion.description && (
                <p id={`promotion-modal-description-${activePromotion.id}`}>{activePromotion.description}</p>
              )}
              <dl className={styles.promotionPeriod}>
                <div>
                  <dt>Fecha de inicio</dt>
                  <dd><time dateTime={activePromotion.startDate}>{formatPublicationDate(activePromotion.startDate)}</time></dd>
                </div>
                <div>
                  <dt>Fecha de finalización</dt>
                  <dd><time dateTime={activePromotion.endDate}>{formatPublicationDate(activePromotion.endDate)}</time></dd>
                </div>
              </dl>
            </div>
          </article>
        )}
      </dialog>
    </>
  );
}
