import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  subLabel?: string;
  showValue?: boolean;
  status?: "default" | "on_track" | "at_risk" | "behind" | "completed" | "failed";
  size?: "sm" | "md" | "lg";
}

export function ProgressBar({
  value,
  max = 100,
  label,
  subLabel,
  showValue = true,
  status = "default",
  size = "md",
  className,
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const statusColors = {
    default: "bg-[#047857]",
    on_track: "bg-[#047857]",
    at_risk: "bg-[#D97706]",
    behind: "bg-[#DC2626]",
    completed: "bg-[#047857]",
    failed: "bg-[#DC2626]",
  };

  const heightClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className={cn("w-full space-y-1", className)} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs text-[#52525B]">
          <span className="font-medium text-[#18181B]">{label}</span>
          {showValue && (
            <span className="font-numeric font-medium text-[#18181B]">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full bg-[#E5E7EB] overflow-hidden",
          heightClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            statusColors[status]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {subLabel && (
        <div className="text-[11px] text-[#71717A] font-numeric">{subLabel}</div>
      )}
    </div>
  );
}
