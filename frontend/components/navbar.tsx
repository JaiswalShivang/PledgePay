"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, UserPlus, LogOut, Plus, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

function VaultMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="3" width="24" height="22" rx="6" fill="#3D5AFE" />
      <circle cx="14" cy="14" r="7" stroke="white" strokeWidth="2" fill="none" />
      <line x1="14" y1="7" x2="14" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="18" x2="14" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="7" y1="14" x2="10" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="14" x2="21" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="14" r="2.5" fill="white" />
    </svg>
  );
}

function NavLink({
  href,
  active,
  children,
  icon,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "relative flex items-center gap-2 px-3.5 py-2 text-[14px] font-medium rounded-[12px] transition-colors font-body",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D5AFE]",
        active
          ? "text-[#3D5AFE] bg-[#3D5AFE]/10 font-semibold"
          : "text-[#16161A]/70 hover:text-[#16161A] hover:bg-[#F2F3F7]",
      ].join(" ")}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </Link>
  );
}

function UserAvatar({ name, href, active }: { name: string; href: string; active: boolean }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[#3D5AFE] rounded-[12px] px-2 py-1 hover:bg-[#F2F3F7] transition-colors"
      title={`Profile: ${name}`}
    >
      <span
        className={[
          "h-8 w-8 rounded-[12px] flex items-center justify-center text-[14px] font-bold transition-all font-display",
          active
            ? "bg-[#3D5AFE] text-white"
            : "bg-[#F2F3F7] text-[#16161A] hover:bg-[#16161A]/10",
        ].join(" ")}
      >
        {initials}
      </span>
      <span className="text-[14px] font-medium hidden sm:block text-[#16161A]/80 hover:text-[#16161A] font-body">
        {name.split(" ")[0]}
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const isAdminPath = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-[#F2F3F7]">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href={isAdminPath ? "/admin" : "/"}
          className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#3D5AFE] rounded-[12px]"
        >
          <VaultMark className="h-8 w-8 shrink-0" />
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[20px] tracking-tight text-[#16161A]">
              PledgePay
            </span>
            {isAdminPath && (
              <span className="px-2 py-0.5 text-[12px] font-bold uppercase tracking-wider bg-[#16161A] text-white rounded-[12px] font-display">
                Admin
              </span>
            )}
          </div>
        </Link>

        <nav className="flex items-center gap-2" aria-label="Primary navigation">
          {isAdminPath ? (
            !isLoading && isAuthenticated && user ? (
              <>
                <UserAvatar name={user.name} href="/profile" active={pathname === "/profile"} />

                <button
                  onClick={() => logout()}
                  title="Sign Out"
                  className="h-9 w-9 flex items-center justify-center rounded-[12px] text-[#16161A]/60 hover:text-[#FF3D71] hover:bg-[#FF3D71]/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 h-10 px-4 text-[14px] font-medium rounded-[12px] text-[#16161A] hover:bg-[#F2F3F7] transition-colors font-body"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Link>
            )
          ) : !isLoading && isAuthenticated && user ? (
            <>
              <NavLink
                href="/dashboard"
                active={pathname === "/dashboard"}
                icon={<LayoutDashboard className="h-4 w-4" />}
              >
                Dashboard
              </NavLink>

              <Link
                href="/commitments/new"
                className="flex items-center gap-2 h-10 px-4 text-[14px] font-medium rounded-[12px] bg-[#3D5AFE] text-white hover:bg-[#3249cb] transition-colors font-body"
              >
                <Plus className="h-4 w-4" />
                <span>New Pledge</span>
              </Link>

              <span className="w-px h-5 bg-[#16161A]/10 mx-1" />

              <UserAvatar name={user.name} href="/profile" active={pathname === "/profile"} />

              <button
                onClick={() => logout()}
                title="Sign Out"
                className="h-9 w-9 flex items-center justify-center rounded-[12px] text-[#16161A]/60 hover:text-[#FF3D71] hover:bg-[#FF3D71]/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/commitments/new"
                className="flex items-center gap-2 px-3.5 py-2 text-[14px] font-medium text-[#16161A]/70 hover:text-[#16161A] hover:bg-[#F2F3F7] rounded-[12px] transition-colors font-body"
              >
                <Plus className="h-4 w-4 text-[#3D5AFE]" />
                <span>AI Structurer</span>
              </Link>

              <Link
                href="/login"
                className="flex items-center gap-2 h-10 px-4 text-[14px] font-medium rounded-[12px] text-[#16161A] hover:bg-[#F2F3F7] transition-colors font-body"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Link>

              <Link
                href="/register"
                className="flex items-center gap-2 h-10 px-4 text-[14px] font-medium rounded-[12px] bg-[#3D5AFE] text-white hover:bg-[#3249cb] transition-colors font-body ml-1"
              >
                <UserPlus className="h-4 w-4" />
                <span>Register</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
