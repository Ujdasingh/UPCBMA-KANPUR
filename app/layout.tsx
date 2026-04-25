import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://upcbma.com"),
  title: {
    default: "UPCBMA — Uttar Pradesh Corrugated Box Manufacturers' Association",
    template: "%s — UPCBMA",
  },
  description:
    "The state body for corrugated box manufacturers across Uttar Pradesh, with regional chapters in Kanpur, Lucknow, Agra, Meerut, Ghaziabad, and Varanasi.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
