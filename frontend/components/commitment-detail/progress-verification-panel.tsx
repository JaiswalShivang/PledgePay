"use client";

import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Zap, GitCommit, Trophy } from "lucide-react";
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

  const paceStatus: "on_track" | "at_risk" | "behind" | "completed" | "failed" =
    commitment.status === "COMPLETED" ? "completed" :
    commitment.status === "FAILED"    ? "failed" :
    progress.status === "ON_TRACK"    ? "on_track" :
    progress.status === "AT_RISK"     ? "at_risk" : "behind";

  const isVerifying = paceStatus === "on_track";

  return (
    <div
      className="rounded-[12px] overflow-hidden"
      style={{ backgroundColor: "#FFFFFF", border: "1px solid #E8EAED" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid #E8EAED" }}
      >
        <div className="flex items-center gap-2">
          {isActive ? (
            <span
              className="h-6 w-6 rounded-[6px] flex items-center justify-center"
              style={{ backgroundColor: "rgba(30,79,216,0.1)" }}
            >
              <Zap className="h-3.5 w-3.5 text-[#1E4FD8]" />
            </span>
          ) : (
            <span
              className="h-6 w-6 rounded-[6px] flex items-center justify-center"
              style={{ backgroundColor: "rgba(10,102,64,0.1)" }}
            >
              <Trophy className="h-3.5 w-3.5 text-[#0A6640]" />
            </span>
          )}
          <h3
            className="text-sm font-semibold text-[#111318]"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
          >
            Verification Engine
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <Badge variant="verifying" size="sm" dot>
              Live Polling
            </Badge>
          )}
          <Badge
            variant={
              commitment.evidence_type === "codeforces_submissions" ? "pending" : "verifying"
            }
            size="sm"
          >
            {commitment.evidence_type === "codeforces_submissions" ? "Codeforces" :
             commitment.evidence_type === "github_commits" ? "GitHub Commits" :
             commitment.evidence_type === "github_prs" ? "GitHub PRs" :
             commitment.evidence_type}
          </Badge>
        </div>
      </div>

      {/* Progress body */}
      <div className="px-5 py-5 space-y-5">
        {/* Big progress number */}
        <div className="flex items-end justify-between">
          <div>
            <span
              className="text-4xl font-bold leading-none"
              style={{
                fontFamily: "var(--font-data, 'JetBrains Mono', monospace)",
                color: paceStatus === "failed" ? "#C44B0A" : paceStatus === "completed" ? "#0A6640" : "#111318",
              }}
            >
              {progress.verified}
            </span>
            <span
              className="text-base font-medium ml-1.5"
              style={{ color: "#6B7485", fontFamily: "var(--font-data)" }}
            >
              / {progress.target} {commitment.unit}
            </span>
          </div>
          <div
            className="text-2xl font-bold font-data"
            style={{
              color: paceStatus === "failed" ? "#C44B0A" : paceStatus === "completed" ? "#0A6640" : "#1E4FD8",
              fontFamily: "var(--font-data)",
            }}
          >
            {pct}%
          </div>
        </div>

        <ProgressBar
          value={pct}
          status={paceStatus}
          size="md"
          animated={isActive && isVerifying}
        />

        {/* Meta row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
          <div className="space-y-0.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-[#6B7485]">Daily Target</div>
            <div className="text-sm font-semibold font-data text-[#111318]">
              {progress.daily_pace_required ?? "—"} / day
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-[#6B7485]">Days Remaining</div>
            <div className="text-sm font-semibold font-data text-[#111318]">
              {commitment.status === "ACTIVE" ? `${progress.days_remaining}d` : "—"}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-[#6B7485]">Pace</div>
            <div
              className="text-sm font-semibold"
              style={{
                color: paceStatus === "on_track" ? "#0A6640" : paceStatus === "at_risk" ? "#B45309" : "#C44B0A",
                fontFamily: "var(--font-display)",
              }}
            >
              {paceStatus === "on_track" ? "On Track" : paceStatus === "at_risk" ? "At Risk" : paceStatus === "behind" ? "Behind" : "—"}
            </div>
          </div>
        </div>

        {/* GitHub repo pill */}
        {commitment.github_repo && (
          <div
            className="flex items-center gap-1.5 text-xs rounded-[6px] px-3 py-2"
            style={{
              backgroundColor: "rgba(30,79,216,0.06)",
              border: "1px solid rgba(30,79,216,0.15)",
              color: "#1E4FD8",
              fontFamily: "var(--font-data)",
            }}
          >
            <GitCommit className="h-3.5 w-3.5 shrink-0" />
            {commitment.github_repo}
          </div>
        )}
      </div>
    </div>
  );
}
