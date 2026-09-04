import * as React from "react";
import { cn } from "@/lib/utils";

// ── Tabs — underline-indicator style (not background pill) ───────────────────
// Supports light (default) and dark surface variants

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  surface?: "light" | "dark";
}

const TabsContext = React.createContext<TabsContextValue>({
  value: "",
  onValueChange: () => {},
  surface: "light",
});

interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  surface?: "light" | "dark";
}

function Tabs({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  children,
  className,
  surface = "light",
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const value = controlledValue ?? internalValue;

  const handleChange = (v: string) => {
    setInternalValue(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleChange, surface }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  const { surface } = React.useContext(TabsContext);
  const isDark = surface === "dark";

  return (
    <div
      className={cn(
        "flex items-center gap-0",
        isDark
          ? "border-b border-[rgba(255,255,255,0.1)]"
          : "border-b border-[#E8EAED]",
        className
      )}
    >
      {children}
    </div>
  );
}

function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabsContext);
  const isActive = ctx.value === value;
  const isDark = ctx.surface === "dark";

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "relative px-4 py-2.5 text-xs font-medium transition-colors duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#0A6640] focus-visible:ring-inset",
        "after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:transition-all after:duration-150",
        isActive
          ? [
              isDark
                ? "text-white after:bg-[#0A6640]"
                : "text-[#111318] after:bg-[#0A6640]",
            ].join(" ")
          : [
              isDark
                ? "text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.8)] after:bg-transparent"
                : "text-[#6B7485] hover:text-[#111318] after:bg-transparent",
            ].join(" "),
        className
      )}
    >
      {children}
    </button>
  );
}

function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabsContext);
  if (ctx.value !== value) return null;
  return <div className={cn("pt-4", className)}>{children}</div>;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
