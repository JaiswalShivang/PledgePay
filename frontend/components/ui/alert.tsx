import * as React from "react";
import { cn } from "@/lib/utils";

interface AlertProps {
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

const ALERT_STYLES: Record<string, string> = {
  default: "bg-[#F2F3F7] text-[#16161A] border border-[#F2F3F7]",
  destructive: "bg-white text-[#16161A] border-2 border-[#FF3D71]",
  success: "bg-white text-[#16161A] border-2 border-[#00C896]",
  warning: "bg-white text-[#16161A] border-2 border-[#FF6B35]",
  info: "bg-white text-[#16161A] border-2 border-[#3D5AFE]",
};

const TITLE_COLORS: Record<string, string> = {
  default: "text-[#16161A]",
  destructive: "text-[#FF3D71]",
  success: "text-[#00C896]",
  warning: "text-[#FF6B35]",
  info: "text-[#3D5AFE]",
};

export function Alert({ variant = "default", title, children, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "w-full rounded-[12px] p-4 text-[14px] font-body",
        ALERT_STYLES[variant],
        className
      )}
    >
      {title && (
        <p className={cn("font-display font-bold text-[16px] mb-1", TITLE_COLORS[variant])}>
          {title}
        </p>
      )}
      {children && <div className="text-[14px] text-[#16161A]/80">{children}</div>}
    </div>
  );
}
