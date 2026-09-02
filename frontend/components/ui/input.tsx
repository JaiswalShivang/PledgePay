import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightIcon, error, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[#71717A]">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-9 w-full rounded-[8px] bg-white border border-[#D1D5DB] px-3 py-1.5 text-sm text-[#18181B] placeholder:text-[#9CA3AF] transition-colors focus-visible:outline-none focus-visible:border-[#047857] focus-visible:ring-1 focus-visible:ring-[#047857] disabled:cursor-not-allowed disabled:bg-[#F8F9FA] disabled:opacity-75",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500",
              className
            )}
            ref={ref}
            disabled={disabled}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center text-[#71717A]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
