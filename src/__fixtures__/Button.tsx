import React from "react";

interface ButtonProps {
  /** The button label */
  label: string;
  /** Click handler */
  onClick?: () => void;
  /** Button variant */
  variant?: "primary" | "secondary";
  /** Whether the button is disabled */
  disabled?: boolean;
}

export function Button({ label, onClick, variant = "primary", disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} className={variant}>
      {label}
    </button>
  );
}
