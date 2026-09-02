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
    default: "bg-[#10B981]",
    on_track: "bg-[#10B981]",
    at_risk: "bg-[#F59E0B]",
    behind: "bg-[#EF4444]",
    completed: "bg-[#10B981]",
    failed: "bg-[#E07A5F]",
  };

  const heightClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={cn("w-full space-y-1.5", className)} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs text-[#94A3B8]">
          <span className="font-medium text-[#F1F5F9]">{label}</span>
          {showValue && (
            <span className="font-numeric font-semibold text-[#F1F5F9]">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full bg-[#070A0F] border border-[#1C273A] overflow-hidden p-[1px]",
          heightClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            statusColors[status]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {subLabel && (
        <div className="text-[11px] text-[#64748B] font-numeric">{subLabel}</div>
      )}
    </div>
  );
}
