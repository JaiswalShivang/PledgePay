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

  // One-shot settle-pulse animation on mount — the emotional payoff moment
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const cls = isSuccess ? "animate-settle-success" : "animate-settle-impact";
    el.classList.add(cls);
    const timer = setTimeout(() => el.classList.remove(cls), 800);
    return () => clearTimeout(timer);
  }, [isSuccess]);

  if (isSuccess) {
    return (
      <div
        ref={bannerRef}
        className="w-full rounded-[14px] overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0A6640 0%, #065535 50%, #0A6640 100%)",
          boxShadow: "0 4px 24px rgba(10,102,64,0.3)",
        }}
      >
        {/* Top bar */}
        <div className="flex items-center gap-3 px-6 py-5">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2
              className="text-base font-bold text-white"
              style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
            >
              Commitment Complete — Stake Refunded
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              You achieved your goal of {commitment.target_count} {commitment.unit}. Well done.
            </p>
          </div>
        </div>

        {/* Stat row */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-px"
          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
        >
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
              icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1 inline" />,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="px-6 py-4"
              style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
            >
              <div className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                {stat.label}
              </div>
              <div
                className="text-sm font-semibold text-white"
                style={{ fontFamily: "var(--font-data)" }}
              >
                {stat.icon}{stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Failed / donated
  return (
    <div
      ref={bannerRef}
      className="w-full rounded-[14px] overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #C44B0A 0%, #A33D08 50%, #C44B0A 100%)",
        boxShadow: "0 4px 24px rgba(196,75,10,0.3)",
      }}
    >
      <div className="flex items-center gap-3 px-6 py-5">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <Heart className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2
            className="text-base font-bold text-white"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
          >
            Resolved — Charitable Impact Dispatched
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>
            Your ₹{amountINR.toLocaleString("en-IN")} stake has been transferred to{" "}
            <strong className="text-white">{commitment.charity?.name}</strong>.
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-px"
        style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
      >
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
          <div
            key={stat.label}
            className="px-6 py-4"
            style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
          >
            <div className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              {stat.label}
            </div>
            <div
              className="text-sm font-semibold text-white truncate"
              style={{ fontFamily: "var(--font-data)" }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
