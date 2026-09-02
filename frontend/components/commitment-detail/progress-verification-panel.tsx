"use client";

import { Badge, ProgressBar, Button } from "@/components/ui";
import { RefreshCw } from "lucide-react";
import { ProgressCalculation, VerificationResult, Commitment } from "@/lib/api-client";

interface ProgressVerificationPanelProps {
  commitment: Commitment;
  progressData: ProgressCalculation;
  verificationData?: VerificationResult | null;
  isVerifyingAI: boolean;
  onVerifyAI: () => void;
}

export function ProgressVerificationPanel({
  commitment,
  progressData,
  verificationData,
  isVerifyingAI,
  onVerifyAI,
}: ProgressVerificationPanelProps) {
  const getPaceBadge = (status: "ON_TRACK" | "AT_RISK" | "BEHIND") => {
    switch (status) {
      case "ON_TRACK":
        return <Badge variant="active" size="sm">On Track</Badge>;
      case "AT_RISK":
        return <Badge variant="pending" size="sm">At Risk</Badge>;
      case "BEHIND":
        return <Badge variant="failed" size="sm">Behind Pace</Badge>;
    }
  };

  const paceStatus = progressData.status === "ON_TRACK" ? "on_track" : progressData.status === "AT_RISK" ? "at_risk" : "behind";

  return (
    <div className="p-5 rounded-[8px] bg-white border border-[#E4E7EB] space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EB]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#18181B]">Progress & Verification</h2>
            {getPaceBadge(progressData.status)}
          </div>
          <p className="text-xs text-[#52525B] mt-0.5">
            {progressData.verified} of {progressData.target} {commitment.unit} verified by deterministic rule evaluation.
          </p>
        </div>

        <Button
          onClick={onVerifyAI}
          variant="secondary"
          size="sm"
          isLoading={isVerifyingAI}
          leftIcon={<RefreshCw className="h-3.5 w-3.5 text-[#52525B]" />}
        >
          {isVerifyingAI ? "Evaluating..." : "Run AI Audit"}
        </Button>
      </div>

      {/* Progress Track */}
      <div className="space-y-1">
        <ProgressBar
          value={progressData.progress_pct}
          status={paceStatus}
          size="md"
          showValue={true}
          label="Milestone Progress"
        />
      </div>

      {/* 4 Metric Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-3 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB]">
          <div className="text-[#71717A]">Verified Count</div>
          <div className="text-base font-bold font-numeric text-[#047857] mt-0.5">
            {progressData.verified} <span className="text-xs font-normal text-[#71717A]">/ {progressData.target}</span>
          </div>
        </div>

        <div className="p-3 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB]">
          <div className="text-[#71717A]">Days Remaining</div>
          <div className="text-base font-bold font-numeric text-[#18181B] mt-0.5">
            {progressData.days_remaining}d
          </div>
        </div>

        <div className="p-3 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB]">
          <div className="text-[#71717A]">Actual Pace</div>
          <div className="text-base font-bold font-numeric text-[#18181B] mt-0.5">
            {progressData.daily_pace_actual} <span className="text-xs font-normal text-[#71717A]">/day</span>
          </div>
        </div>

        <div className="p-3 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB]">
          <div className="text-[#71717A]">Required Pace</div>
          <div className="text-base font-bold font-numeric text-[#18181B] mt-0.5">
            {progressData.daily_pace_required} <span className="text-xs font-normal text-[#71717A]">/day</span>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {verificationData?.ai_summary?.summary && (
        <div className="p-3 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB] text-xs text-[#52525B]">
          <strong className="text-[#18181B]">AI Assessment: </strong>
          <span>{verificationData.ai_summary.summary}</span>
        </div>
      )}
    </div>
  );
}
