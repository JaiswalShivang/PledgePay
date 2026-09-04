import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PledgePay — Proof-of-Commitment Escrow",
  description:
    "Stake real money on your code goals. Verified by GitHub activity and AI. Missed? Your pledge funds a verified charity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{
          backgroundColor: "var(--canvas-fog)",
          color: "var(--ink-primary)",
          fontFamily: "var(--font-body), Inter, sans-serif",
        }}
      >
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />
        <Providers>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <footer
            style={{
              borderTop: "1px solid var(--border-subtle)",
              backgroundColor: "var(--canvas-dark)",
              color: "var(--ink-inverse-muted)",
              padding: "20px 16px",
              textAlign: "center",
              fontSize: "12px",
              fontFamily: "var(--font-data)",
            }}
          >
            PledgePay &copy; 2026 &bull; Proof-of-Commitment Escrow Protocol
          </footer>
        </Providers>
      </body>
    </html>
  );
}
