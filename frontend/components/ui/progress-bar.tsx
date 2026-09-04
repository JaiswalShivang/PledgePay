import * as React from "react";
import { cn } from "@/lib/utils";

type ProgressStatus = "on_track" | "at_risk" | "behind" | "completed" | "failed" | "verifying";

interface ProgressBarProps {
  value: number; // 0–100
  status?: ProgressStatus;
  size?: "xs" | "sm" | "md";
  showValue?: boolean;
  className?: string;
  /** If true, plays the verify-scan shimmer on active states */
  animated?: boolean;
}

const TRACK_COLORS: Record<ProgressStatus, string> = {
  on_track:  "bg-[#D1FAE5]",
  at_risk:   "bg-[#FEF3C7]",
  behind:    "bg-[#FED7AA]",
  completed: "bg-[#D1FAE5]",
  failed:    "bg-[#FED7AA]",
  verifying: "bg-[#DBEAFE]",
};

const FILL_COLORS: Record<ProgressStatus, string> = {
  on_track:  "bg-[#0A6640]",
  at_risk:   "bg-[#B45309]",
  behind:    "bg-[#C44B0A]",
  completed: "bg-[#0A6640]",
  failed:    "bg-[#C44B0A]",
  verifying: "bg-[#1E4FD8]",
};

const SIZE_STYLES = {
  xs: "h-1",
  sm: "h-1.5",
  md: "h-2",
};

export function ProgressBar({
  value,
  status = "on_track",
  size = "sm",
  showValue = false,
  className,
  animated = false,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const isActive = status === "on_track" || status === "verifying";

  return (
    <div className={cn("w-full space-y-1", className)}>
      {showValue && (
        <div className="flex justify-end">
          <span
            className="font-data text-[11px]"
            style={{ color: status === "failed" ? "#C44B0A" : status === "completed" ? "#0A6640" : "#4B5263" }}
          >
            {Math.round(clamped)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full overflow-hidden",
          SIZE_STYLES[size],
          TRACK_COLORS[status]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            animated && isActive ? "animate-verify-scan" : FILL_COLORS[status]
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
