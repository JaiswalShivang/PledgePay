import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PledgePay — Proof-of-Commitment Escrow",
  description:
    "Lock stakes into escrow commitments verified by GitHub activity and Groq AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-[#18181B]">
        <Providers>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <footer className="border-t border-[#E4E7EB] bg-[#FFFFFF] py-6 text-center text-xs text-[#71717A]">
            PledgePay &copy; 2026 &bull; Proof-of-Commitment Escrow Protocol
          </footer>
        </Providers>
      </body>
    </html>
  );
}
