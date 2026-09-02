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
            "flex min-h-[90px] w-full rounded-[10px] bg-[#0B0F17] border border-[#25334C] p-3.5 text-sm text-[#F1F5F9] placeholder:text-[#64748B] transition-colors focus-visible:outline-none focus-visible:border-[#10B981] focus-visible:ring-1 focus-visible:ring-[#10B981] disabled:cursor-not-allowed disabled:opacity-50 resize-y",
            error && "border-red-500/60 focus-visible:border-red-500 focus-visible:ring-red-500",
            className
          )}
          ref={ref}
          disabled={disabled}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-400 font-medium">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
