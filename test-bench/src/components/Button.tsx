"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    const baseStyles: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "8px",
      fontWeight: 500,
      cursor: disabled || loading ? "not-allowed" : "pointer",
      opacity: disabled || loading ? 0.6 : 1,
      transition: "all 0.2s ease",
      border: "none",
      outline: "none",
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: "#3b82f6",
        color: "#fff",
      },
      secondary: {
        backgroundColor: "#333",
        color: "#fff",
      },
      outline: {
        backgroundColor: "transparent",
        color: "#3b82f6",
        border: "1px solid #3b82f6",
      },
      ghost: {
        backgroundColor: "transparent",
        color: "#888",
      },
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { padding: "6px 12px", fontSize: "14px" },
      md: { padding: "10px 20px", fontSize: "16px" },
      lg: { padding: "14px 28px", fontSize: "18px" },
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={{
          ...baseStyles,
          ...variantStyles[variant],
          ...sizeStyles[size],
          ...style,
        }}
        className={className}
        {...props}
      >
        {loading && (
          <span
            style={{
              width: "16px",
              height: "16px",
              border: "2px solid currentColor",
              borderTopColor: "transparent",
              borderRadius: "50%",
              marginRight: "8px",
              animation: "spin 1s linear infinite",
            }}
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
