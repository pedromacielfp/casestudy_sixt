import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";

/**
 * Jost - an open geometric sans in the Futura / Neue Plak family, the closest
 * Google-hosted match to Sixt's corporate typeface. Exposed as a CSS variable
 * and composed into --font-sans / --font-heading in globals.css.
 */
const jost = Jost({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jost",
});

export const metadata: Metadata = {
  title: "Sixt CRM Dashboard",
  description:
    "One-time to repeat customer conversion for Sixt US leisure rentals.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={jost.variable}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
