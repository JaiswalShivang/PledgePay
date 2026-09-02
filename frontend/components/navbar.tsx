"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, LogIn, UserPlus, LogOut, PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 group-hover:bg-emerald-500/20 transition">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-white text-lg leading-tight">
              Pledge<span className="text-emerald-400">Pay</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              Proof-of-Commitment Escrow
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-3 text-sm font-medium">
          {!isLoading && isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  pathname === "/dashboard"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "text-zinc-300 hover:bg-zinc-900 border border-transparent"
                }`}
              >
                <span>Dashboard</span>
              </Link>
              <Link
                href="/commitments/new"
                className={`glow-emerald flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 ${
                  pathname === "/commitments/new" ? "ring-2 ring-emerald-400" : ""
                }`}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New Commitment</span>
              </Link>
              <Link
                href="/profile"
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  pathname === "/profile"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "text-zinc-300 hover:bg-zinc-900 border border-transparent"
                }`}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-300">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span>{user.name}</span>
              </Link>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/commitments/new"
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition"
              >
                <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>Try AI Structurer</span>
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-900 transition"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/register"
                className="glow-emerald flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
