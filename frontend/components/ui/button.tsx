import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center font-medium transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50 select-none",
    "font-body",
  ].join(" "),
  {
    variants: {
      variant: {
        escrow:
          "bg-[#0A6640] text-white hover:bg-[#085535] active:bg-[#064426] focus-visible:ring-[#0A6640]",
        primary:
          "bg-[#0A6640] text-white hover:bg-[#085535] active:bg-[#064426] focus-visible:ring-[#0A6640]",
        verifying:
          "bg-[#1E4FD8] text-white hover:bg-[#1842B8] active:bg-[#1438A0] focus-visible:ring-[#1E4FD8]",
        impact:
          "bg-[#C44B0A] text-white hover:bg-[#A33D08] active:bg-[#8A3307] focus-visible:ring-[#C44B0A]",
        secondary:
          "bg-white text-[#111318] border border-[#D8DBE0] hover:bg-[#F5F6F8] hover:border-[#B0B7C3] focus-visible:ring-[#0A6640]",
        outline:
          "bg-transparent text-[#111318] border border-[#D8DBE0] hover:bg-[#F5F6F8] focus-visible:ring-[#0A6640]",
        ghost:
          "bg-transparent text-[#4B5263] hover:bg-[#ECEEF1] hover:text-[#111318] focus-visible:ring-[#0A6640]",
        "ghost-dark":
          "bg-transparent text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white focus-visible:ring-white",
        destructive:
          "bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] hover:bg-[#FEE2E2] focus-visible:ring-[#B91C1C]",
        link:
          "text-[#0A6640] underline-offset-4 hover:underline p-0 h-auto bg-transparent focus-visible:ring-[#0A6640]",
      },
      size: {
        xs: "h-6 px-2 text-[11px] rounded-[4px] gap-1",
        sm: "h-8 px-3 text-xs rounded-[6px] gap-1.5",
        md: "h-9 px-4 text-sm rounded-[8px] gap-2",
        lg: "h-11 px-5 text-sm rounded-[10px] gap-2",
        xl: "h-13 px-7 text-base rounded-[10px] gap-2.5",
        icon: "h-8 w-8 p-0 rounded-[6px]",
        "icon-sm": "h-7 w-7 p-0 rounded-[6px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon ? (
          <span className="shrink-0">{rightIcon}</span>
        ) : null}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
