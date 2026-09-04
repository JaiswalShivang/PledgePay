import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  /** dark — for use on dark canvas surfaces (auth left panel, dark cards) */
  surface?: "light" | "dark";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightIcon, error, surface = "light", ...props }, ref) => {
    const isDark = surface === "dark";

    return (
      <div className="w-full space-y-1">
        <div className="relative flex items-center">
          {leftIcon && (
            <span
              className={cn(
                "absolute left-3 shrink-0",
                isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[#6B7485]"
              )}
            >
              {leftIcon}
            </span>
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              "w-full text-sm transition-all duration-150 outline-none",
              "rounded-[8px] py-2.5 px-3",
              "focus-visible:ring-2",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              isDark
                ? [
                    "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)]",
                    "text-white placeholder:text-[rgba(255,255,255,0.3)]",
                    "focus-visible:border-[#0A6640] focus-visible:ring-[rgba(10,102,64,0.25)]",
                    error
                      ? "border-[#F87171] focus-visible:border-[#F87171] focus-visible:ring-[rgba(248,113,113,0.25)]"
                      : "",
                  ].join(" ")
                : [
                    "bg-white border border-[#D8DBE0]",
                    "text-[#111318] placeholder:text-[#9CA3AF]",
                    "focus-visible:border-[#0A6640] focus-visible:ring-[rgba(10,102,64,0.15)]",
                    error
                      ? "border-[#F87171] focus-visible:border-[#F87171] focus-visible:ring-[rgba(248,113,113,0.2)]"
                      : "",
                  ].join(" "),
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span
              className={cn(
                "absolute right-3 shrink-0",
                isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[#6B7485]"
              )}
            >
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-[11px] text-[#DC2626] leading-tight pl-0.5">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
