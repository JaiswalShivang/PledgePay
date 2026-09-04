"use client";

import { useEffect, useRef } from "react";
import { Trophy, Heart, CheckCircle2 } from "lucide-react";
import { Commitment, ResolutionResult } from "@/lib/api-client";

interface ResolutionBannerProps {
  commitment: Commitment;
  statusData?: ResolutionResult;
}

export function ResolutionBanner({ commitment, statusData }: ResolutionBannerProps) {
  const isSuccess =
    commitment.status === "COMPLETED" || statusData?.donation?.outcome === "SUCCESS";
  const donation = statusData?.donation || commitment.donation;
  const amountINR = commitment.amount_paise / 100;
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    el.classList.add("animate-settle-pulse");
  }, []);

  if (isSuccess) {
    return (
      <div
        ref={bannerRef}
        className="w-full rounded-[12px] bg-[#00C896] text-white overflow-hidden border border-[#00C896]"
      >
        <div className="flex items-center gap-4 px-6 py-6">
          <div className="h-12 w-12 rounded-[12px] bg-white/20 flex items-center justify-center shrink-0">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div className="space-y-1">
            <h2 className="text-subhead text-white">
              Commitment Complete — Stake Refunded
            </h2>
            <p className="text-[14px] text-white/90 font-body">
              You achieved your goal of {commitment.target_count} {commitment.unit}. 100% principal refunded.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/20">
          {[
            {
              label: "Verified Milestones",
              value: `${statusData?.progress?.verified ?? commitment.target_count} / ${commitment.target_count} ${commitment.unit}`,
            },
            {
              label: "Beneficiary Cause",
              value: commitment.charity?.name ?? "—",
            },
            {
              label: "Refund Status",
              value: `₹${amountINR.toLocaleString("en-IN")} refunded`,
              icon: <CheckCircle2 className="h-4 w-4 mr-1 inline text-white" />,
            },
          ].map((stat) => (
            <div key={stat.label} className="px-6 py-4 bg-[#00C896]">
              <div className="text-[14px] font-medium text-white/70 font-body uppercase">
                {stat.label}
              </div>
              <div className="text-[16px] font-bold text-white font-display mt-0.5">
                {stat.icon}{stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={bannerRef}
      className="w-full rounded-[12px] bg-[#FF3D71] text-white overflow-hidden border border-[#FF3D71]"
    >
      <div className="flex items-center gap-4 px-6 py-6">
        <div className="h-12 w-12 rounded-[12px] bg-white/20 flex items-center justify-center shrink-0">
          <Heart className="h-6 w-6 text-white" />
        </div>
        <div className="space-y-1">
          <h2 className="text-subhead text-white">
            Resolved — Charitable Impact Dispatched
          </h2>
          <p className="text-[14px] text-white/90 font-body">
            Your ₹{amountINR.toLocaleString("en-IN")} stake has been transferred to{" "}
            <strong>{commitment.charity?.name}</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/20">
        {[
          {
            label: "Final Progress",
            value: `${statusData?.progress?.verified ?? 0} / ${commitment.target_count} ${commitment.unit}`,
          },
          {
            label: "Charity Recipient",
            value: commitment.charity?.name ?? "—",
          },
          {
            label: "Receipt Reference",
            value: donation?.razorpayx_payout_id ?? "pout_impact_settled",
          },
        ].map((stat) => (
          <div key={stat.label} className="px-6 py-4 bg-[#FF3D71]">
            <div className="text-[14px] font-medium text-white/70 font-body uppercase">
              {stat.label}
            </div>
            <div className="text-[16px] font-bold text-white font-display mt-0.5 truncate">
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
