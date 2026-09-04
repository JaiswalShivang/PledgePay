import * as React from "react";
import { cn } from "@/lib/utils";

interface AlertProps {
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

const ALERT_STYLES: Record<string, string> = {
  default:
    "bg-[#F5F6F8] border border-[#D8DBE0] text-[#111318]",
  destructive:
    "bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]",
  success:
    "bg-[#F0FDF4] border border-[#6EE7B7] text-[#065535]",
  warning:
    "bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E]",
  info:
    "bg-[#EFF6FF] border border-[#93C5FD] text-[#1E3A8A]",
};

const TITLE_STYLES: Record<string, string> = {
  default: "text-[#111318]",
  destructive: "text-[#991B1B]",
  success: "text-[#065535]",
  warning: "text-[#78350F]",
  info: "text-[#1E3A8A]",
};

export function Alert({ variant = "default", title, children, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "w-full rounded-[8px] p-3.5 text-sm leading-relaxed",
        ALERT_STYLES[variant],
        className
      )}
    >
      {title && (
        <p className={cn("font-semibold text-xs mb-1", TITLE_STYLES[variant])}>{title}</p>
      )}
      {children && <div className="text-xs opacity-90">{children}</div>}
    </div>
  );
}
