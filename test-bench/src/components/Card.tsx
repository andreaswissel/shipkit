"use client";

import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = "default",
      padding = "md",
      style,
      ...props
    },
    ref
  ) => {
    const baseStyles: React.CSSProperties = {
      borderRadius: "12px",
      backgroundColor: "#1a1a1a",
      overflow: "hidden",
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      default: {},
      elevated: {
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
      },
      outlined: {
        border: "1px solid #333",
        backgroundColor: "transparent",
      },
    };

    const paddingStyles: Record<string, React.CSSProperties> = {
      none: { padding: 0 },
      sm: { padding: "12px" },
      md: { padding: "20px" },
      lg: { padding: "32px" },
    };

    return (
      <div
        ref={ref}
        style={{
          ...baseStyles,
          ...variantStyles[variant],
          ...paddingStyles[padding],
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, style, ...props }, ref) => (
    <div
      ref={ref}
      style={{
        marginBottom: "16px",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = "CardHeader";

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, style, ...props }, ref) => (
    <h3
      ref={ref}
      style={{
        fontSize: "18px",
        fontWeight: 600,
        color: "#ededed",
        margin: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </h3>
  )
);

CardTitle.displayName = "CardTitle";

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, style, ...props }, ref) => (
    <div
      ref={ref}
      style={{
        color: "#888",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
);

CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
export type { CardProps, CardHeaderProps, CardTitleProps, CardContentProps };
