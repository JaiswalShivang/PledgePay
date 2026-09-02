import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-[8px] p-3.5 text-xs sm:text-sm flex items-start gap-2.5 border",
  {
    variants: {
      variant: {
        default:
          "bg-white border-[#E4E7EB] text-[#18181B]",
        success:
          "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]",
        warning:
          "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]",
        destructive:
          "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]",
        impact:
          "bg-[#FFF7ED] border-[#FED7AA] text-[#9A3412]",
        info:
          "bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const iconMap = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: AlertCircle,
  impact: Heart,
  info: Info,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  hideIcon?: boolean;
}

export function Alert({
  className,
  variant = "default",
  title,
  hideIcon = false,
  children,
  ...props
}: AlertProps) {
  const IconComponent = iconMap[variant || "default"];

  return (
    <div className={cn(alertVariants({ variant, className }))} {...props}>
      {!hideIcon && (
        <IconComponent className="h-4 w-4 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 space-y-0.5">
        {title && <h5 className="font-semibold text-xs leading-tight">{title}</h5>}
        <div className="text-xs leading-normal opacity-95">{children}</div>
      </div>
    </div>
  );
}
