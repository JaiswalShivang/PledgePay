"use client";

import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Zap, Trophy } from "lucide-react";
import { Commitment, ProgressCalculation, VerificationResult } from "@/lib/api-client";

interface ProgressVerificationPanelProps {
  commitment: Commitment;
  progressData: ProgressCalculation;
  verificationData?: VerificationResult | null;
  isVerifyingAI?: boolean;
  onVerifyAI?: () => Promise<void>;
}

export function ProgressVerificationPanel({ commitment, progressData: progress }: ProgressVerificationPanelProps) {
  const isActive = commitment.status === "ACTIVE";
  const pct = Math.min(100, Math.round(progress.progress_pct ?? 0));

  const paceVariant =
    commitment.status === "COMPLETED" ? "verified" :
      commitment.status === "FAILED" ? "charity" :
        progress.status === "ON_TRACK" ? "verified" : "stake";

  return (
    <div className="rounded-[12px] bg-white border border-[#F2F3F7] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#F2F3F7]">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-[12px] bg-[#3D5AFE] text-white flex items-center justify-center">
            {isActive ? <Zap className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
          </div>
          <h3 className="text-subhead text-[#16161A]">
            Verification Engine
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <Badge variant="active" size="sm">
              Live Polling
            </Badge>
          )}
          <Badge variant="neutral" size="sm">
            {commitment.evidence_type === "codeforces_submissions" ? "Codeforces" : "GitHub"}
          </Badge>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[32px] font-bold leading-none font-display text-[#16161A]">
              {progress.verified}
            </span>
            <span className="text-[20px] font-medium text-[#16161A]/60 ml-2 font-display">
              / {progress.target} {commitment.unit}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[20px] font-bold font-display text-[#00C896]">
              {pct}%
            </span>
          </div>
        </div>

        <ProgressBar value={pct} variant={paceVariant} size="md" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-[12px] bg-[#F2F3F7] space-y-1">
            <span className="text-[14px] text-[#16161A]/60 font-body">Current Pace</span>
            <div className="text-[16px] font-bold font-display text-[#16161A]">
              {progress.daily_pace_actual} / day
            </div>
          </div>
          <div className="p-4 rounded-[12px] bg-[#F2F3F7] space-y-1">
            <span className="text-[14px] text-[#16161A]/60 font-body">Required Pace</span>
            <div className="text-[16px] font-bold font-display text-[#16161A]">
              {progress.daily_pace_required} / day
            </div>
          </div>
          <div className="p-4 rounded-[12px] bg-[#F2F3F7] space-y-1">
            <span className="text-[14px] text-[#16161A]/60 font-body">Days Remaining</span>
            <div className="text-[16px] font-bold font-display text-[#16161A]">
              {progress.days_remaining}d
            </div>
          </div>
          <div className="p-4 rounded-[12px] bg-[#F2F3F7] space-y-1">
            <span className="text-[14px] text-[#16161A]/60 font-body">Trajectory</span>
            <div className="text-[16px] font-bold font-display text-[#00C896]">
              {progress.status === "ON_TRACK" ? "On Track" : progress.status === "AT_RISK" ? "At Risk" : "Behind"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
