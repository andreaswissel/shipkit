"use client";

import { HTMLAttributes, forwardRef, useEffect, useCallback } from "react";

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: "sm" | "md" | "lg" | "full";
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ children, open, onClose, title, size = "md", style, ...props }, ref) => {
    const handleEscape = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      },
      [onClose]
    );

    useEffect(() => {
      if (open) {
        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";
      }
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
      };
    }, [open, handleEscape]);

    if (!open) return null;

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { maxWidth: "400px" },
      md: { maxWidth: "600px" },
      lg: { maxWidth: "800px" },
      full: { maxWidth: "calc(100vw - 40px)", maxHeight: "calc(100vh - 40px)" },
    };

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          zIndex: 1000,
          padding: "20px",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          style={{
            width: "100%",
            backgroundColor: "#1a1a1a",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            ...sizeStyles[size],
            ...style,
          }}
          {...props}
        >
          {title && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #333",
              }}
            >
              <h2
                id="modal-title"
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#ededed",
                  margin: 0,
                }}
              >
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label="Close modal"
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  cursor: "pointer",
                  fontSize: "24px",
                  lineHeight: 1,
                  padding: "4px",
                }}
              >
                ×
              </button>
            </div>
          )}
          <div style={{ padding: "20px" }}>{children}</div>
        </div>
      </div>
    );
  }
);

Modal.displayName = "Modal";

export { Modal };
export type { ModalProps };
