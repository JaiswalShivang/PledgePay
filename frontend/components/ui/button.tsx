import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857] disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[#047857] text-white hover:bg-[#065F46] active:bg-[#064E3B]",
        secondary:
          "bg-white text-[#18181B] border border-[#E4E7EB] hover:bg-[#F1F3F5] hover:border-[#D1D5DB]",
        outline:
          "bg-transparent text-[#18181B] border border-[#E4E7EB] hover:bg-[#F8F9FA]",
        ghost:
          "bg-transparent text-[#52525B] hover:bg-[#F1F3F5] hover:text-[#18181B]",
        destructive:
          "bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] hover:bg-[#FEE2E2]",
        link:
          "text-[#047857] underline-offset-4 hover:underline p-0 h-auto bg-transparent",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-[6px] gap-1.5",
        md: "h-9 px-4 text-sm rounded-[8px] gap-2",
        lg: "h-11 px-5 text-sm rounded-[8px] gap-2",
        icon: "h-8 w-8 p-0 rounded-[6px]",
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
