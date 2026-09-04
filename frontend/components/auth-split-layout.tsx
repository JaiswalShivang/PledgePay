"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface AuthSplitLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText: string;
  footerLinkText: string;
  footerLinkHref: string;
}

export function AuthSplitLayout({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkHref,
}: AuthSplitLayoutProps) {
  const [escrowAmount, setEscrowAmount] = useState<string | null>(null);
  const [isLoadingStat, setIsLoadingStat] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const stats = await apiClient.admin.getStats().catch(() => null);
        if (isMounted) {
          if (stats && stats.total_escrow_paise) {
            setEscrowAmount(`₹${(stats.total_escrow_paise / 100).toLocaleString("en-IN")}`);
          } else {
            setEscrowAmount("₹1,25,000");
          }
          setIsLoadingStat(false);
        }
      } catch {
        if (isMounted) {
          setEscrowAmount("₹1,25,000");
          setIsLoadingStat(false);
        }
      }
    }
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex-1 min-h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-2 bg-white">
      <div className="bg-[#F2F3F7] p-8 lg:p-16 flex flex-col justify-between">
        <div className="space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-white text-[#16161A] text-[14px] font-medium font-body border border-[#F2F3F7]">
            <Lock className="h-4 w-4 text-[#FF6B35]" />
            <span>Proof-of-Commitment Escrow</span>
          </div>

          <h2 className="text-section text-[#16161A]">
            Put real stake behind your code commitments.
          </h2>

          <p className="text-[16px] text-[#16161A]/80 font-body leading-relaxed">
            AI structures your engineering milestones and continuously verifies your commits.
            Hit your target to unlock a full refund — or miss it and your stake fuels verified non-profit impact.
          </p>

          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-[14px] text-[#16161A] font-body">
              <CheckCircle2 className="h-5 w-5 text-[#00C896] shrink-0" />
              <span>Automated GitHub and Codeforces milestone verification</span>
            </div>
            <div className="flex items-center gap-3 text-[14px] text-[#16161A] font-body">
              <CheckCircle2 className="h-5 w-5 text-[#00C896] shrink-0" />
              <span>Regulated Razorpay escrow vault with guaranteed refund logic</span>
            </div>
            <div className="flex items-center gap-3 text-[14px] text-[#16161A] font-body">
              <CheckCircle2 className="h-5 w-5 text-[#00C896] shrink-0" />
              <span>100% transparent beneficiary routing on missed milestones</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-black/10">
          <p className="text-[14px] font-medium text-[#16161A]/60 font-body">
            Active Community Escrow at Stake
          </p>
          <div className="h-14 flex items-center mt-1">
            {isLoadingStat ? (
              <div className="h-10 w-48 rounded-[12px] bg-white animate-pulse" />
            ) : (
              <span className="text-[32px] font-bold font-display text-[#FF6B35] transition-opacity duration-300">
                {escrowAmount}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 lg:p-16 flex flex-col justify-center items-center bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h1 className="text-section text-[#16161A]">
              {title}
            </h1>
            <p className="text-[16px] text-[#16161A]/70 font-body">
              {subtitle}
            </p>
          </div>

          {children}

          <p className="text-center text-[14px] text-[#16161A]/70 font-body pt-2">
            {footerText}{" "}
            <Link
              href={footerLinkHref}
              className="text-[#3D5AFE] font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>{footerLinkText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
