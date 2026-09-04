import * as React from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "elevated" | "flush" | "dark" | "escrow" | "impact";
type CardPadding = "none" | "sm" | "md" | "lg";

const CARD_STYLES: Record<CardVariant, string> = {
  default: [
    "bg-white rounded-[10px]",
    "border border-[#E8EAED]",
    "shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)]",
  ].join(" "),
  elevated: [
    "bg-white rounded-[12px]",
    "border border-[#E8EAED]",
    "shadow-[0_4px_12px_rgba(0,0,0,0.09),0_2px_4px_rgba(0,0,0,0.05)]",
  ].join(" "),
  flush: "bg-transparent rounded-[10px]",
  dark: [
    "bg-[#1A1F2E] rounded-[10px]",
    "border border-[rgba(255,255,255,0.08)]",
  ].join(" "),
  escrow: [
    "bg-[#F0FDF4] rounded-[10px]",
    "border border-[#6EE7B7]",
  ].join(" "),
  impact: [
    "bg-[#FFF7ED] rounded-[10px]",
    "border border-[#FDBA74]",
  ].join(" "),
};

const PADDING_STYLES: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "none", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(CARD_STYLES[variant], PADDING_STYLES[padding], className)}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = "Card";

// Sub-components
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-1", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("font-semibold text-[#111318] leading-tight", className)}
      style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs text-[#4B5263] leading-relaxed", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
