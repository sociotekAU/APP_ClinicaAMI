"use client";

import type { PublicWebGalleryItem } from "@ami/contracts";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import styles from "../../app/(public)/home.module.css";

export function Reveal({
  children,
  className = "",
  delay = 0,
}: Readonly<{ children: ReactNode; className?: string; delay?: number }>) {
  const root = useRef<HTMLDivElement>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const element = root.current;
    if (!element) return;

    setEnhanced(true);
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries[0]?.isIntersecting ?? false),
      { rootMargin: "-7% 0px -7%", threshold: 0.08 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const revealStyle = { "--reveal-delay": `${delay}ms` } as CSSProperties;
  return (
    <div
      className={`${styles.reveal} ${enhanced ? `${styles.revealEnhanced} ${visible ? styles.revealVisible : styles.revealHidden}` : ""} ${className}`}
      ref={root}
      style={revealStyle}
    >
      {children}
    </div>
  );
}

function nextIndex(current: number, direction: number, length: number): number {
  return (current + direction + length) % length;
}

export function PublicGalleryCarousel({ items }: Readonly<{ items: PublicWebGalleryItem[] }>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const activeItem = items[activeIndex];

  useEffect(() => {
    if (items.length < 2 || paused || lightboxOpen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => nextIndex(current, 1, items.length));
    }, 5_500);
    return () => window.clearInterval(timer);
  }, [items.length, lightboxOpen, paused]);

  if (!activeItem) return null;

  function move(direction: number) {
    setActiveIndex((current) => nextIndex(current, direction, items.length));
  }

  function openLightbox(index: number) {
    setActiveIndex(index);
    setLightboxOpen(true);
    dialog.current?.showModal();
  }

  function handleKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    }
  }

  return (
    <div
      className={styles.carousel}
      role="region"
      aria-roledescription="carrusel"
      aria-label="Galería de Clínica A.M.I."
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onFocusCapture={() => setPaused(true)}
      onKeyDown={handleKeyboard}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={styles.carouselViewport}>
        {items.map((item, index) => (
          <button
            className={`${styles.carouselSlide} ${index === activeIndex ? styles.carouselSlideActive : ""}`}
            type="button"
            key={item.id}
            onClick={() => openLightbox(index)}
            tabIndex={index === activeIndex ? 0 : -1}
            aria-hidden={index !== activeIndex}
            aria-label={`Ampliar ${item.title}`}
          >
            <img
              src={item.imageUrl}
              alt={item.description || item.title}
              width="1600"
              height="1000"
              loading={index === 0 ? "eager" : "lazy"}
            />
            <span className={styles.carouselExpand}><Expand aria-hidden="true" /> Ampliar</span>
          </button>
        ))}

        {items.length > 1 && (
          <>
            <button className={`${styles.carouselArrow} ${styles.carouselArrowPrevious}`} type="button" onClick={() => move(-1)} aria-label="Ver imagen anterior">
              <ChevronLeft aria-hidden="true" />
            </button>
            <button className={`${styles.carouselArrow} ${styles.carouselArrowNext}`} type="button" onClick={() => move(1)} aria-label="Ver imagen siguiente">
              <ChevronRight aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <div className={styles.carouselFooter}>
        <div className={styles.carouselCaption} aria-live="polite">
          <span>{String(activeIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
          <div>
            <strong>{activeItem.title}</strong>
            {activeItem.description && <p>{activeItem.description}</p>}
          </div>
        </div>
        {items.length > 1 && (
          <div className={styles.carouselDots} aria-label="Seleccionar imagen">
            {items.map((item, index) => (
              <button
                className={index === activeIndex ? styles.carouselDotActive : undefined}
                type="button"
                key={item.id}
                onClick={() => setActiveIndex(index)}
                aria-label={`Ver imagen ${index + 1}: ${item.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <dialog
        className={styles.lightbox}
        ref={dialog}
        onClose={() => setLightboxOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className={styles.lightboxPanel}>
          <button className={styles.lightboxClose} type="button" onClick={() => dialog.current?.close()} aria-label="Cerrar imagen ampliada">
            <X aria-hidden="true" />
          </button>
          <img src={activeItem.imageUrl} alt={activeItem.description || activeItem.title} width="1800" height="1200" />
          {items.length > 1 && (
            <>
              <button className={`${styles.lightboxArrow} ${styles.lightboxArrowPrevious}`} type="button" onClick={() => move(-1)} aria-label="Ver imagen anterior">
                <ChevronLeft aria-hidden="true" />
              </button>
              <button className={`${styles.lightboxArrow} ${styles.lightboxArrowNext}`} type="button" onClick={() => move(1)} aria-label="Ver imagen siguiente">
                <ChevronRight aria-hidden="true" />
              </button>
            </>
          )}
          <div className={styles.lightboxCaption}>
            <strong>{activeItem.title}</strong>
            {activeItem.description && <p>{activeItem.description}</p>}
          </div>
        </div>
      </dialog>
    </div>
  );
}
