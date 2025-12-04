import React from "react";

interface CardProps {
  title: string;
  children: React.ReactNode;
}

/**
 * A card component for displaying content in a container.
 */
export function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
