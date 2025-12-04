"use client";

import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, id, style, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2)}`;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {label && (
          <label
            htmlFor={textareaId}
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#ededed",
            }}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          style={{
            padding: "10px 14px",
            fontSize: "16px",
            borderRadius: "8px",
            border: `1px solid ${error ? "#ef4444" : "#333"}`,
            backgroundColor: "#0a0a0a",
            color: "#ededed",
            outline: "none",
            resize: "vertical",
            minHeight: "100px",
            fontFamily: "inherit",
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

Textarea.displayName = "Textarea";

export { Textarea };
export type { TextareaProps };
