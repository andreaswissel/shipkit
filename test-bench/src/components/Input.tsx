"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      id,
      style,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2)}`;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#ededed",
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          style={{
            padding: "10px 14px",
            fontSize: "16px",
            borderRadius: "8px",
            border: `1px solid ${error ? "#ef4444" : "#333"}`,
            backgroundColor: "#0a0a0a",
            color: "#ededed",
            outline: "none",
            transition: "border-color 0.2s ease",
            ...style,
          }}
          {...props}
        />
        {(error || helperText) && (
          <span
            style={{
              fontSize: "12px",
              color: error ? "#ef4444" : "#888",
            }}
          >
            {error || helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
