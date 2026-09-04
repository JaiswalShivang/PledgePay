import * as React from "react";
import { cn } from "@/lib/utils";

type ProgressVariant = "verified" | "stake" | "charity" | "primary";

interface ProgressBarProps {
  value: number;
  variant?: ProgressVariant;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

const FILL_COLORS: Record<ProgressVariant, string> = {
  verified: "bg-[#00C896]",
  stake: "bg-[#FF6B35]",
  charity: "bg-[#FF3D71]",
  primary: "bg-[#3D5AFE]",
};

const SIZE_STYLES = {
  sm: "h-2",
  md: "h-3",
  lg: "h-4",
};

export function ProgressBar({
  value,
  variant = "verified",
  size = "md",
  showValue = false,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {showValue && (
        <div className="flex justify-between items-center text-[14px] font-body text-[#16161A]">
          <span className="font-medium text-[#16161A]/70">Progress</span>
          <span className="font-display font-bold text-[#16161A]">{Math.round(clamped)}%</span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-[12px] bg-[#F2F3F7] overflow-hidden",
          SIZE_STYLES[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-[12px] transition-all duration-300",
            FILL_COLORS[variant]
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
