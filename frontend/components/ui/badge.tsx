import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium leading-none whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        // Default / neutral
        default:
          "bg-[#ECEEF1] text-[#4B5263] border border-[#D8DBE0]",
        // Active escrow / on track — vault green
        active:
          "bg-[#D1FAE5] text-[#065535] border border-[#6EE7B7]",
        // System verifying — signal blue (with pulsing dot)
        verifying:
          "bg-[#DBEAFE] text-[#1E3A8A] border border-[#93C5FD]",
        // Completed / settled / refunded — vault green solid
        completed:
          "bg-[#0A6640] text-white border border-[#0A6640]",
        // At risk / warning — amber
        pending:
          "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]",
        // Failed / donated to charity — ember
        failed:
          "bg-[#FFF7ED] text-[#9A3412] border border-[#FDBA74]",
        // Impact donated — ember solid
        impact:
          "bg-[#C44B0A] text-white border border-[#C44B0A]",
        // Ghost — transparent, used on dark surfaces
        ghost:
          "bg-transparent text-[rgba(255,255,255,0.7)] border border-[rgba(255,255,255,0.2)]",
      },
      size: {
        sm: "text-[10px] px-1.5 py-0.5 rounded-[4px]",
        md: "text-xs px-2 py-1 rounded-[5px]",
        lg: "text-sm px-2.5 py-1.5 rounded-[6px]",
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
  dot?: boolean; // shows a pulsing dot before the text
}

function Badge({ className, variant, size, icon, dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0 animate-dot-pulse",
            variant === "verifying" ? "bg-[#1E4FD8]" :
            variant === "active"    ? "bg-[#0A6640]" :
            variant === "pending"   ? "bg-[#B45309]" :
            "bg-current"
          )}
        />
      )}
      {!dot && icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
