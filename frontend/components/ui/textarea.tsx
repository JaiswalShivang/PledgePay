import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, disabled, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        <textarea
          className={cn(
            "flex min-h-[100px] w-full rounded-[12px] bg-white border border-[#D8DBE0] p-3.5 text-[14px] font-body text-[#16161A] placeholder:text-[#16161A]/40 transition-colors outline-none",
            "focus:border-[#3D5AFE] focus:ring-1 focus:ring-[#3D5AFE] disabled:cursor-not-allowed disabled:bg-[#F2F3F7] disabled:opacity-60 resize-y",
            error && "border-[#FF3D71] focus:border-[#FF3D71] focus:ring-[#FF3D71]",
            className
          )}
          ref={ref}
          disabled={disabled}
          {...props}
        />
        {error && (
          <p className="text-[14px] text-[#FF3D71] font-body">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
