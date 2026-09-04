import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors select-none rounded-[12px] font-body disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
  {
    variants: {
      variant: {
        primary:
          "bg-[#3D5AFE] text-white hover:bg-[#3249cb] focus-visible:ring-[#3D5AFE]",
        escrow:
          "bg-[#FF6B35] text-white hover:bg-[#e05622] focus-visible:ring-[#FF6B35]",
        stake:
          "bg-[#FF6B35] text-white hover:bg-[#e05622] focus-visible:ring-[#FF6B35]",
        verified:
          "bg-[#00C896] text-white hover:bg-[#00af83] focus-visible:ring-[#00C896]",
        charity:
          "bg-[#FF3D71] text-white hover:bg-[#e6295d] focus-visible:ring-[#FF3D71]",
        impact:
          "bg-[#FF3D71] text-white hover:bg-[#e6295d] focus-visible:ring-[#FF3D71]",
        secondary:
          "bg-[#F2F3F7] text-[#16161A] hover:bg-[#e5e7ee] focus-visible:ring-[#16161A]",
        outline:
          "bg-white text-[#16161A] border border-[#F2F3F7] hover:bg-[#F2F3F7] focus-visible:ring-[#3D5AFE]",
        ghost:
          "bg-transparent text-[#16161A] hover:bg-[#F2F3F7] focus-visible:ring-[#3D5AFE]",
        "ghost-dark":
          "bg-transparent text-white hover:bg-white/10 focus-visible:ring-white",
        destructive:
          "bg-[#FF3D71] text-white hover:bg-[#e6295d] focus-visible:ring-[#FF3D71]",
        link:
          "bg-transparent text-[#3D5AFE] hover:underline p-0 h-auto rounded-none focus-visible:ring-[#3D5AFE]",
      },
      size: {
        sm: "h-8 px-3 text-[14px] gap-1.5",
        md: "h-10 px-4 text-[14px] gap-2",
        lg: "h-12 px-6 text-[16px] gap-2.5",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
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
