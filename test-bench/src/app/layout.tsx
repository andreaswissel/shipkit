import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShipKit Test Bench",
  description: "Test bench for ShipKit AI-powered feature generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
