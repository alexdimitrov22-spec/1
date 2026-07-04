import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Revio — Rent electronics from verified people nearby",
    template: "%s · Revio",
  },
  description:
    "Rent cameras, consoles, drones and more from verified people nearby. Escrow payments, identity checks, and before/after condition on the record.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-muted font-sans text-ink">{children}</body>
    </html>
  );
}
