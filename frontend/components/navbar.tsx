"use client";

import Link from "next/link";
import { ShieldCheck, Activity, Terminal } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20 group-hover:bg-emerald-500/20 transition">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-foreground text-lg leading-tight">
              Pledge<span className="text-emerald-500">Pay</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              Proof-of-Commitment Escrow
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/80 border border-border text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            <span>Infra Online</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border">
            <Terminal className="h-3.5 w-3.5 text-foreground" />
            <span>v0.1.0</span>
          </div>
        </nav>
      </div>
    </header>
  );
}
