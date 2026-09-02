import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-[8px] bg-white border border-[#D1D5DB] p-3 text-sm text-[#18181B] placeholder:text-[#9CA3AF] transition-colors focus-visible:outline-none focus-visible:border-[#047857] focus-visible:ring-1 focus-visible:ring-[#047857] disabled:cursor-not-allowed disabled:bg-[#F8F9FA] disabled:opacity-75 resize-y",
            error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500",
            className
          )}
          ref={ref}
          disabled={disabled}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
