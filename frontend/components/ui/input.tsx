import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightIcon, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3.5 text-[#16161A]/50 shrink-0 pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              "w-full text-[14px] font-body transition-colors outline-none",
              "rounded-[12px] py-2.5 px-3.5 bg-white border border-[#D8DBE0] text-[#16161A] placeholder:text-[#16161A]/40",
              "focus:border-[#3D5AFE] focus:ring-1 focus:ring-[#3D5AFE]",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-[#FF3D71] focus:border-[#FF3D71] focus:ring-[#FF3D71]",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 text-[#16161A]/50 shrink-0 pointer-events-none">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-[14px] text-[#FF3D71] font-body">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
