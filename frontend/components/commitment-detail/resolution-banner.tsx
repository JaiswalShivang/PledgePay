"use client";

import { Trophy, Heart } from "lucide-react";
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

  if (isSuccess) {
    return (
      <div className="p-6 rounded-[8px] bg-[#F0FDF4] border border-[#BBF7D0] space-y-4">
        <div className="flex items-center gap-2 text-[#166534]">
          <Trophy className="h-5 w-5" />
          <span className="font-semibold text-sm">Commitment Completed & 100% Refunded</span>
        </div>

        <p className="text-xs text-[#166534] leading-relaxed">
          You achieved your goal of {commitment.target_count} {commitment.unit}! Your stake of ₹{amountINR.toLocaleString("en-IN")} was processed and a verified celebratory impact grant of ₹{amountINR.toLocaleString("en-IN")} was recorded for {commitment.charity?.name}.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-[6px] bg-white border border-[#BBF7D0]">
            <div className="text-[#71717A]">Verified Milestones</div>
            <div className="font-bold font-numeric text-[#166534] mt-0.5">
              {statusData?.progress?.verified || commitment.target_count} / {commitment.target_count} {commitment.unit}
            </div>
          </div>

          <div className="p-3 rounded-[6px] bg-white border border-[#BBF7D0]">
            <div className="text-[#71717A]">Beneficiary Cause</div>
            <div className="font-semibold text-[#18181B] truncate mt-0.5">
              {commitment.charity?.name}
            </div>
          </div>

          <div className="p-3 rounded-[6px] bg-white border border-[#BBF7D0]">
            <div className="text-[#71717A]">RazorpayX Payout ID</div>
            <div className="font-numeric text-[#71717A] truncate mt-0.5">
              {donation?.razorpayx_payout_id || "pout_verified_success"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] space-y-4">
      <div className="flex items-center gap-2 text-[#C2410C]">
        <Heart className="h-5 w-5" />
        <span className="font-semibold text-sm">Resolved — Charitable Safety Net Dispatched</span>
      </div>

      <p className="text-xs text-[#9A3412] leading-relaxed">
        Your deadline has concluded. As agreed upfront, your ₹{amountINR.toLocaleString("en-IN")} stake has been transferred directly to <strong className="text-[#18181B]">{commitment.charity?.name}</strong> to fund their ongoing mission.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
        <div className="p-3 rounded-[6px] bg-white border border-[#FED7AA]">
          <div className="text-[#71717A]">Final Progress</div>
          <div className="font-bold font-numeric text-[#18181B] mt-0.5">
            {statusData?.progress?.verified || 0} / {commitment.target_count} {commitment.unit}
          </div>
        </div>

        <div className="p-3 rounded-[6px] bg-white border border-[#FED7AA]">
          <div className="text-[#71717A]">Charity Donated</div>
          <div className="font-semibold text-[#18181B] truncate mt-0.5">
            {commitment.charity?.name}
          </div>
        </div>

        <div className="p-3 rounded-[6px] bg-white border border-[#FED7AA]">
          <div className="text-[#71717A]">Receipt Reference</div>
          <div className="font-numeric text-[#71717A] truncate mt-0.5">
            {donation?.razorpayx_payout_id || "pout_impact_settled"}
          </div>
        </div>
      </div>
    </div>
  );
}
