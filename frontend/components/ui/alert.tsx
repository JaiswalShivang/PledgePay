import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-[10px] p-4 text-sm flex items-start gap-3 border",
  {
    variants: {
      variant: {
        default:
          "bg-[#151D2C] border-[#25334C] text-[#F1F5F9]",
        success:
          "bg-[#10B981]/10 border-[#10B981]/30 text-[#34D399]",
        warning:
          "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#FBBF24]",
        destructive:
          "bg-red-500/10 border-red-500/30 text-red-300",
        impact:
          "bg-[#E07A5F]/12 border-[#E07A5F]/35 text-[#F4A261]",
        info:
          "bg-blue-500/10 border-blue-500/30 text-blue-300",
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
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-semibold leading-none tracking-tight">{title}</h5>}
        <div className="text-xs sm:text-sm leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}
