import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
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
  weight: ["400", "500", "600", "700"],
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
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-[#16161A] font-body">
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />
        <Providers>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <footer className="bg-white border-t border-[#F2F3F7] py-8 px-4 sm:px-6">
            <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-[14px] text-[#16161A]/60 font-body">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-[16px] text-[#16161A]">PledgePay</span>
                <span className="text-[#16161A]/30">&bull;</span>
                <span>Proof-of-Commitment Escrow Protocol</span>
              </div>
              <div className="flex items-center gap-2 text-[14px]">
                <span className="h-2 w-2 rounded-full bg-[#00C896] inline-block" />
                <span>Protocol Active</span>
                <span className="text-[#16161A]/30">&bull;</span>
                <span>&copy; 2026 PledgePay</span>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
