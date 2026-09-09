"use client";

import $ from "jquery";
import "select2";
import { useEffect, useMemo, useRef } from "react";

export interface Select2Option {
  active: boolean;
  id: number;
  label: string;
}

interface Select2FieldProps {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  disabled?: boolean;
  id: string;
  onBlur?: () => void;
  onChange: (value: number) => void;
  options: Select2Option[];
  placeholder: string;
  value: number;
}

export function Select2Field({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
  disabled = false,
  id,
  onBlur,
  onChange,
  options,
  placeholder,
  value,
}: Readonly<Select2FieldProps>) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const changeRef = useRef(onChange);
  const blurRef = useRef(onBlur);
  const optionSignature = useMemo(
    () => options.map((option) => `${option.id}:${option.active}:${option.label}`).join("|"),
    [options],
  );

  useEffect(() => { changeRef.current = onChange; }, [onChange]);
  useEffect(() => { blurRef.current = onBlur; }, [onBlur]);

  useEffect(() => {
    const element = selectRef.current;
    if (!element) return;
    const select = $(element);
    const modal = element.closest<HTMLElement>(".crud-modal");
    select.select2({
      allowClear: true,
      dropdownParent: modal ? $(modal) : undefined,
      language: {
        noResults: () => "No se encontraron coincidencias",
        searching: () => "Buscando…",
      },
      placeholder,
      width: "100%",
    });
    select.on("change.ami-select2", () => {
      const selected = select.val();
      changeRef.current(typeof selected === "string" && selected ? Number(selected) : 0);
    });
    select.on("select2:close.ami-select2", () => blurRef.current?.());

    return () => {
      select.off(".ami-select2");
      if (select.hasClass("select2-hidden-accessible")) select.select2("destroy");
    };
  }, [optionSignature, placeholder]);

  useEffect(() => {
    const element = selectRef.current;
    if (!element) return;
    const select = $(element);
    if (!select.hasClass("select2-hidden-accessible")) return;
    select.val(value > 0 ? String(value) : "").trigger("change.select2");
  }, [value]);

  return (
    <select
      ref={selectRef}
      id={id}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      aria-required={ariaRequired}
      disabled={disabled}
      value={value || ""}
      onChange={() => undefined}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id} disabled={!option.active}>
          {option.label}{option.active ? "" : " (inactivo)"}
        </option>
      ))}
    </select>
  );
}
