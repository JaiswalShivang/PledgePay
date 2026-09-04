import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-medium rounded-[12px] font-body transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#F2F3F7] text-[#16161A]",
        neutral: "bg-[#F2F3F7] text-[#16161A]",
        active: "bg-[#3D5AFE] text-white",
        primary: "bg-[#3D5AFE] text-white",
        verifying: "bg-[#3D5AFE] text-white",
        stake: "bg-[#FF6B35] text-white",
        pending: "bg-[#FF6B35] text-white",
        verified: "bg-[#00C896] text-white",
        completed: "bg-[#00C896] text-white",
        charity: "bg-[#FF3D71] text-white",
        impact: "bg-[#FF3D71] text-white",
        failed: "bg-[#FF3D71] text-white",
        outline: "bg-transparent border border-[#F2F3F7] text-[#16161A]",
      },
      size: {
        sm: "text-[14px] px-2.5 py-0.5",
        md: "text-[14px] px-3 py-1",
        lg: "text-[16px] px-4 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
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
    <span
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
