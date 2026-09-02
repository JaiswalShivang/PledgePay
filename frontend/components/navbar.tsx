"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, LogIn, UserPlus, LogOut, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui";

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E4E7EB] bg-white">
      <div className="container mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#18181B]">
            PledgePay
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-sm font-medium">
          {!isLoading && isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <Link href="/dashboard">
                <Button
                  variant={pathname === "/dashboard" ? "secondary" : "ghost"}
                  size="sm"
                >
                  Dashboard
                </Button>
              </Link>

              <Link href="/commitments/new">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  New Pledge
                </Button>
              </Link>

              <Link href="/profile">
                <Button
                  variant={pathname === "/profile" ? "secondary" : "ghost"}
                  size="sm"
                >
                  <span className="h-4 w-4 rounded-full bg-[#E4E7EB] text-[#18181B] flex items-center justify-center text-[10px] font-bold mr-1">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span>{user.name.split(" ")[0]}</span>
                </Button>
              </Link>

              <Button
                onClick={() => logout()}
                variant="ghost"
                size="icon"
                className="text-[#71717A] hover:text-[#B91C1C]"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/commitments/new">
                <Button variant="ghost" size="sm" leftIcon={<Plus className="h-3.5 w-3.5 text-[#047857]" />}>
                  Try AI Structurer
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="sm" leftIcon={<LogIn className="h-3.5 w-3.5" />}>
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm" leftIcon={<UserPlus className="h-3.5 w-3.5" />}>
                  Register
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
