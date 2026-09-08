import { cloneElement, type ReactElement, type ReactNode } from "react";

interface FormControlProps {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  id?: string;
}

interface FormFieldProps {
  children: ReactElement<FormControlProps>;
  error?: string;
  help?: string;
  htmlFor: string;
  label: string;
  required?: boolean;
}

export function FormField({ children, error, help, htmlFor, label, required = false }: FormFieldProps) {
  const descriptionId = error ? `${htmlFor}-error` : help ? `${htmlFor}-help` : undefined;
  const control = cloneElement(children, {
    id: children.props.id ?? htmlFor,
    "aria-describedby": descriptionId,
    "aria-invalid": Boolean(error),
    "aria-required": required,
  });

  return (
    <div className="crud-field">
      <label htmlFor={htmlFor}>
        {label}
        {required && <span className="crud-field-required" aria-hidden="true"> *</span>}
      </label>
      {control}
      {error
        ? <p className="crud-field-error" id={`${htmlFor}-error`} role="alert">{error}</p>
        : help
          ? <p className="crud-field-help" id={`${htmlFor}-help`}>{help}</p>
          : null}
    </div>
  );
}

export function FormSection({ children, title }: Readonly<{ children: ReactNode; title: string }>) {
  return (
    <fieldset className="crud-form-section">
      <legend>{title}</legend>
      <div>{children}</div>
    </fieldset>
  );
}
