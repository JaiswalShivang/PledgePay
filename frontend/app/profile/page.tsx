"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { CheckCircle2, AlertCircle, ExternalLink, LogOut, Trophy } from "lucide-react";
import { GithubIcon } from "@/components/icons";

// ─── Integration block ───────────────────────────────────────────────────────
function IntegrationBlock({
  icon,
  title,
  desc,
  connected,
  connectedAs,
  children,
  accentColor,
  accentBg,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  connected: boolean;
  connectedAs?: string;
  children?: React.ReactNode;
  accentColor: string;
  accentBg: string;
}) {
  return (
    <div
      className="rounded-[12px] overflow-hidden"
      style={{ backgroundColor: "#FFFFFF", border: "1px solid #E8EAED" }}
    >
      <div
        className="flex items-start justify-between px-5 py-4"
        style={{ borderBottom: "1px solid #E8EAED" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-[8px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: accentBg }}
          >
            <span style={{ color: accentColor }}>{icon}</span>
          </div>
          <div>
            <h3
              className="text-sm font-semibold text-[#111318]"
              style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
            >
              {title}
            </h3>
            <p className="text-[11px] text-[#6B7485]">{desc}</p>
          </div>
        </div>
        <span
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full shrink-0"
          style={
            connected
              ? { backgroundColor: "#D1FAE5", color: "#065535", border: "1px solid #6EE7B7" }
              : { backgroundColor: "#ECEEF1", color: "#6B7485", border: "1px solid #D8DBE0" }
          }
        >
          {connected ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {connected ? "Connected" : "Not Connected"}
        </span>
      </div>
      <div className="px-5 py-4 space-y-3">
        {connected && connectedAs ? (
          <p className="text-xs text-[#4B5263]">
            Linked as{" "}
            <strong className="font-data text-[#111318]">@{connectedAs}</strong>
          </p>
        ) : (
          <p className="text-xs text-[#6B7485]">No account linked yet.</p>
        )}
        {children}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout, isLoggingOut, refetchMe } = useAuth();
  const router = useRouter();
  const [isConnectingGh, setIsConnectingGh] = useState(false);
  const [cfHandle, setCfHandle] = useState("");
  const [isConnectingCf, setIsConnectingCf] = useState(false);
  const [cfError, setCfError] = useState<string | null>(null);
  const [cfSuccess, setCfSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("github_connected") === "true") {
        refetchMe();
        const url = new URL(window.location.href);
        url.searchParams.delete("github_connected");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [refetchMe]);

  const handleLogout = async () => { await logout(); router.push("/login"); };

  const handleConnectGitHub = async () => {
    setIsConnectingGh(true);
    try {
      const res = await apiClient.integrations.getGitHubConnectUrl(window.location.href);
      if (res.url) window.location.href = res.url;
    } catch { setIsConnectingGh(false); }
  };

  const handleConnectCodeforces = async () => {
    const handle = cfHandle.trim();
    if (!handle) { setCfError("Please enter your Codeforces handle."); return; }
    setCfError(null);
    setIsConnectingCf(true);
    try {
      await apiClient.integrations.connectCodeforces(handle);
      setCfSuccess(true);
      await refetchMe();
    } catch (err: unknown) {
      setCfError(err instanceof Error ? err.message : "Could not verify handle.");
    } finally { setIsConnectingCf(false); }
  };

  const hasGithub = !!(user?.github_username || user?.integrations?.some((i) => i.provider === "github"));
  const hasCodeforces = !!(user?.codeforces_username || user?.integrations?.some((i) => i.provider === "codeforces") || cfSuccess);
  const initials = (user?.name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <AuthGuard>
      <div className="w-full" style={{ backgroundColor: "#F5F6F8", minHeight: "calc(100vh - 56px)" }}>
        <div className="container mx-auto max-w-2xl px-4 py-10 space-y-6">

          {/* Profile Header */}
          <div
            className="rounded-[14px] px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E8EAED" }}
          >
            <div className="flex items-center gap-4">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{
                  backgroundColor: "#0A6640",
                  boxShadow: "0 0 0 3px rgba(10,102,64,0.2)",
                  fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
                }}
              >
                {initials}
              </div>
              <div>
                <h1
                  className="text-xl font-bold text-[#111318]"
                  style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
                >
                  {user?.name ?? "—"}
                </h1>
                <p className="text-sm text-[#6B7485] font-data">{user?.email ?? "—"}</p>
                <p className="text-[11px] text-[#B0B7C3] mt-0.5">Member since {formattedDate}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 h-8 px-3 text-xs font-medium rounded-[6px] transition-colors shrink-0"
              style={{
                backgroundColor: "#FEF2F2",
                color: "#B91C1C",
                border: "1px solid #FECACA",
                fontFamily: "var(--font-body, Inter, sans-serif)",
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              {isLoggingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>

          {/* Profile data rows */}
          <div
            className="rounded-[12px] overflow-hidden"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E8EAED" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E8EAED" }}>
              <h2
                className="text-sm font-semibold text-[#111318]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Account Details
              </h2>
            </div>
            {[
              { label: "Full Name", value: user?.name ?? "—", mono: false },
              { label: "Email Address", value: user?.email ?? "—", mono: true },
              { label: "Account ID", value: user?.id ?? "—", mono: true },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid #E8EAED" : undefined }}
              >
                <span className="text-xs font-medium text-[#6B7485]">{row.label}</span>
                <span
                  className={`text-xs font-medium text-[#111318] ${row.mono ? "font-data" : ""}`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* GitHub integration */}
          <IntegrationBlock
            icon={<GithubIcon className="h-4 w-4" />}
            title="GitHub Code Verification"
            desc="Required to poll commits and pull requests for automated verification."
            connected={hasGithub}
            connectedAs={user?.github_username ?? undefined}
            accentColor="#111318"
            accentBg="rgba(17,19,24,0.08)"
          >
            <button
              id="github-connect-btn"
              onClick={handleConnectGitHub}
              disabled={isConnectingGh}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-[6px] transition-colors border border-[#D8DBE0] bg-white text-[#111318] hover:bg-[#F5F6F8] disabled:opacity-50"
              style={{ fontFamily: "var(--font-body, Inter, sans-serif)" }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {isConnectingGh ? "Redirecting…" : hasGithub ? "Reconnect Account" : "Connect GitHub"}
            </button>
          </IntegrationBlock>

          {/* Codeforces integration */}
          <IntegrationBlock
            icon={<Trophy className="h-4 w-4" />}
            title="Codeforces Verification"
            desc="Required to track solved problems for DSA commitments."
            connected={hasCodeforces}
            connectedAs={user?.codeforces_username || (cfSuccess ? cfHandle : undefined)}
            accentColor="#C44B0A"
            accentBg="rgba(196,75,10,0.08)"
          >
            {!hasCodeforces && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    id="cf-handle-profile"
                    type="text"
                    value={cfHandle}
                    onChange={(e) => { setCfHandle(e.target.value); setCfError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleConnectCodeforces(); }}
                    placeholder="Enter your Codeforces handle"
                    className="flex-1 rounded-[6px] px-3 py-1.5 text-xs outline-none transition-all"
                    style={{
                      border: "1px solid #D8DBE0",
                      backgroundColor: "white",
                      color: "#111318",
                      fontFamily: "var(--font-body, Inter, sans-serif)",
                    }}
                  />
                  <button
                    id="cf-connect-btn"
                    onClick={handleConnectCodeforces}
                    disabled={isConnectingCf || !cfHandle.trim()}
                    className="shrink-0 h-8 px-3 text-xs font-medium rounded-[6px] border border-[#D8DBE0] bg-white text-[#111318] hover:border-[#0A6640] hover:text-[#0A6640] disabled:opacity-50 transition-colors"
                    style={{ fontFamily: "var(--font-body, Inter, sans-serif)" }}
                  >
                    {isConnectingCf ? "Verifying…" : "Verify & Connect"}
                  </button>
                </div>
                {cfError && <p className="text-[11px] text-[#C44B0A]">{cfError}</p>}
                <p className="text-[10px] text-[#B0B7C3]">
                  Verified via the public Codeforces API. No password needed.
                </p>
              </div>
            )}
            {hasCodeforces && (
              <button
                onClick={() => { setCfSuccess(false); setCfHandle(""); }}
                className="h-8 px-3 text-xs font-medium rounded-[6px] border border-[#D8DBE0] bg-white text-[#111318] hover:bg-[#F5F6F8] transition-colors"
                style={{ fontFamily: "var(--font-body, Inter, sans-serif)" }}
              >
                Change Handle
              </button>
            )}
          </IntegrationBlock>
        </div>
      </div>
    </AuthGuard>
  );
}
