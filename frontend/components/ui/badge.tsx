import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#F1F3F5] text-[#52525B] border border-[#E4E7EB]",
        active:
          "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]",
        completed:
          "bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]",
        failed:
          "bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]",
        pending:
          "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]",
        impact:
          "bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]",
        info:
          "bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px] rounded-[4px]",
        md: "px-2.5 py-0.5 text-xs rounded-[6px]",
        lg: "px-3 py-1 text-sm rounded-[6px]",
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
