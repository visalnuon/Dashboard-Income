import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type BaseProps = {
  label: string;
  error?: string;
  wide?: boolean;
};

export function TextField({
  label,
  error,
  wide,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={wide ? "wide" : undefined}>
      {label}
      <input {...props} className={error ? "invalid" : undefined} />
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

export function SelectField({
  label,
  error,
  wide,
  children,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={wide ? "wide" : undefined}>
      {label}
      <select {...props} className={error ? "invalid" : undefined}>
        {children}
      </select>
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

export function TextAreaField({
  label,
  error,
  wide,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={wide ? "wide" : undefined}>
      {label}
      <textarea {...props} className={error ? "invalid" : undefined} />
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
