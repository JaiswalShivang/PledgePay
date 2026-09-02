import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#151D2C] text-[#94A3B8] border border-[#25334C]",
        active:
          "bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/30",
        completed:
          "bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/40 font-semibold",
        failed:
          "bg-red-500/10 text-red-400 border border-red-500/30",
        pending:
          "bg-[#F59E0B]/10 text-[#FBBF24] border border-[#F59E0B]/30",
        impact:
          "bg-[#E07A5F]/15 text-[#F4A261] border border-[#E07A5F]/35 font-semibold",
        info:
          "bg-blue-500/10 text-blue-400 border border-blue-500/30",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px] rounded-[5px]",
        md: "px-2.5 py-1 text-xs rounded-[6px]",
        lg: "px-3 py-1.5 text-sm rounded-[8px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

function Badge({ className, variant, size, icon, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size, className }))} {...props}>
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

export { Badge, badgeVariants };
