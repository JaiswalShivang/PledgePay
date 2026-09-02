import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[#10B981] text-[#0B0F17] font-semibold hover:bg-[#059669] active:bg-[#047857]",
        impact:
          "bg-[#E07A5F] text-[#0B0F17] font-semibold hover:bg-[#C9664D] active:bg-[#B2533B]",
        secondary:
          "bg-[#151D2C] text-[#F1F5F9] border border-[#25334C] hover:bg-[#1B2538] hover:border-[#334466]",
        outline:
          "bg-transparent text-[#F1F5F9] border border-[#25334C] hover:bg-[#151D2C]",
        ghost:
          "bg-transparent text-[#94A3B8] hover:bg-[#151D2C] hover:text-[#F1F5F9]",
        destructive:
          "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 active:bg-red-500/30",
        link:
          "text-[#10B981] underline-offset-4 hover:underline p-0 h-auto bg-transparent",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-[6px] gap-1.5",
        md: "h-10 px-4 text-sm rounded-[10px] gap-2",
        lg: "h-12 px-6 text-base rounded-[10px] gap-2.5",
        icon: "h-9 w-9 p-0 rounded-[10px]",
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
