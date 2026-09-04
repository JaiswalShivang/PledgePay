"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, UserPlus, LogOut, Plus, LayoutDashboard, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// ── Logo Mark ────────────────────────────────────────────────────────────────
function VaultMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer vault shape */}
      <rect x="2" y="3" width="24" height="22" rx="4" fill="#0A6640" />
      {/* Vault door circle */}
      <circle cx="14" cy="14" r="7" stroke="white" strokeWidth="1.5" fill="none" />
      {/* Dial lines */}
      <line x1="14" y1="7" x2="14" y2="9.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="18.5" x2="14" y2="21" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="14" x2="9.5" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18.5" y1="14" x2="21" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      {/* Center dot */}
      <circle cx="14" cy="14" r="2" fill="white" />
      {/* Handle stub */}
      <rect x="19" y="13" width="3" height="2" rx="1" fill="white" />
    </svg>
  );
}

// ── Nav Link ─────────────────────────────────────────────────────────────────
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
        "relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[6px] transition-colors duration-150",
        "outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-50",
        active
          ? "text-white bg-[rgba(255,255,255,0.1)]"
          : "text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]",
      ].join(" ")}
      style={{ fontFamily: "var(--font-body, Inter, sans-serif)" }}
    >
      {icon && <span className="shrink-0 opacity-80">{icon}</span>}
      {children}
      {/* Active underline */}
      {active && (
        <span
          className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#0A6640]"
          style={{ bottom: "-1px" }}
        />
      )}
    </Link>
  );
}

// ── User Avatar ───────────────────────────────────────────────────────────────
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
      className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-50 rounded-full"
      title={`Profile: ${name}`}
    >
      <span
        className={[
          "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all",
          active
            ? "bg-[#0A6640] text-white ring-2 ring-white ring-opacity-30"
            : "bg-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.2)]",
        ].join(" ")}
        style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
      >
        {initials}
      </span>
      <span
        className="text-sm hidden sm:block text-[rgba(255,255,255,0.7)] hover:text-white transition-colors"
        style={{ fontFamily: "var(--font-body, Inter, sans-serif)" }}
      >
        {name.split(" ")[0]}
      </span>
    </Link>
  );
}

// ── Navbar ─────────────────────────────────────────────────────────────────
export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        backgroundColor: "var(--canvas-dark, #0F1117)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-50 rounded-[4px]"
        >
          <VaultMark className="h-7 w-7 shrink-0" />
          <span
            className="font-semibold text-base tracking-tight text-white"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
          >
            PledgePay
          </span>
        </Link>

        {/* Right nav */}
        <nav className="flex items-center gap-1" aria-label="Primary navigation">
          {!isLoading && isAuthenticated && user ? (
            <>
              <NavLink
                href="/dashboard"
                active={pathname === "/dashboard"}
                icon={<LayoutDashboard className="h-3.5 w-3.5" />}
              >
                Dashboard
              </NavLink>

              <Link
                href="/commitments/new"
                className={[
                  "flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-[6px] transition-all ml-1",
                  "bg-[#0A6640] text-white hover:bg-[#085535] active:bg-[#064426]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A6640] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]",
                ].join(" ")}
                style={{ fontFamily: "var(--font-body, Inter, sans-serif)" }}
              >
                <Plus className="h-3.5 w-3.5" />
                New Pledge
              </Link>

              <NavLink
                href="/admin"
                active={pathname === "/admin"}
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
              >
                <span className="hidden sm:inline">Admin</span>
              </NavLink>

              <span className="w-px h-4 bg-[rgba(255,255,255,0.12)] mx-1" />

              <UserAvatar name={user.name} href="/profile" active={pathname === "/profile"} />

              <button
                onClick={() => logout()}
                title="Sign Out"
                className={[
                  "h-7 w-7 flex items-center justify-center rounded-[6px] ml-1 transition-colors",
                  "text-[rgba(255,255,255,0.4)] hover:text-[#F87171] hover:bg-[rgba(248,113,113,0.08)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-50",
                ].join(" ")}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/commitments/new"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] rounded-[6px] transition-colors"
                style={{ fontFamily: "var(--font-body, Inter, sans-serif)" }}
              >
                <Plus className="h-3.5 w-3.5 text-[#0A6640]" />
                Try AI Structurer
              </Link>

              <NavLink href="/admin" active={pathname === "/admin"} icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                <span className="hidden sm:inline">Admin</span>
              </NavLink>

              <Link
                href="/login"
                className={[
                  "flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-[6px] transition-colors",
                  "text-[rgba(255,255,255,0.7)] border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] hover:text-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-50",
                ].join(" ")}
                style={{ fontFamily: "var(--font-body, Inter, sans-serif)" }}
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </Link>

              <Link
                href="/register"
                className={[
                  "flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-[6px] transition-all ml-1",
                  "bg-[#0A6640] text-white hover:bg-[#085535]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A6640] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]",
                ].join(" ")}
                style={{ fontFamily: "var(--font-body, Inter, sans-serif)" }}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
