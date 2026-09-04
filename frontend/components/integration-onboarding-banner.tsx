"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui";
import { GithubIcon } from "@/components/icons";
import {
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Trophy,
  Zap,
} from "lucide-react";

interface IntegrationOnboardingBannerProps {
  onDismiss: () => void;
}

export function IntegrationOnboardingBanner({
  onDismiss,
}: IntegrationOnboardingBannerProps) {
  const { user, refetchMe } = useAuth();
  const [isConnectingGh, setIsConnectingGh] = useState(false);
  const [cfHandle, setCfHandle] = useState("");
  const [isConnectingCf, setIsConnectingCf] = useState(false);
  const [cfError, setCfError] = useState<string | null>(null);
  const [cfSuccess, setCfSuccess] = useState(false);

  const hasGithub =
    !!user?.github_username ||
    user?.integrations?.some((i) => i.provider === "github");
  const hasCodeforces =
    !!user?.codeforces_username ||
    user?.integrations?.some((i) => i.provider === "codeforces");

  const allConnected = hasGithub && hasCodeforces;

  const handleConnectGitHub = async () => {
    setIsConnectingGh(true);
    try {
      const res = await apiClient.integrations.getGitHubConnectUrl(
        window.location.href
      );
      if (res.url) {
        window.location.href = res.url;
      }
    } catch {
      setIsConnectingGh(false);
    }
  };

  const handleConnectCodeforces = async () => {
    const handle = cfHandle.trim();
    if (!handle) {
      setCfError("Please enter your Codeforces handle.");
      return;
    }
    setCfError(null);
    setIsConnectingCf(true);
    try {
      await apiClient.integrations.connectCodeforces(handle);
      setCfSuccess(true);
      await refetchMe();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not verify Codeforces handle. Please try again.";
      setCfError(msg);
    } finally {
      setIsConnectingCf(false);
    }
  };

  if (allConnected) return null;

  return (
    <div className="relative rounded-[10px] border border-[#D1FAE5] bg-gradient-to-br from-[#ECFDF5] via-white to-[#F0F9FF] p-5 shadow-sm">
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-full text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#18181B] transition-colors"
        title="Dismiss for this session"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="h-9 w-9 rounded-full bg-[#047857] flex items-center justify-center shrink-0">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#18181B]">
            Connect your coding accounts
          </h2>
          <p className="text-xs text-[#52525B] mt-0.5">
            The AI needs access to your accounts to automatically verify your
            commitment progress.
          </p>
        </div>
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* GitHub */}
        <div
          className={`p-4 rounded-[8px] border transition-colors ${
            hasGithub
              ? "bg-[#F0FDF4] border-[#86EFAC]"
              : "bg-white border-[#E4E7EB]"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GithubIcon className="h-4 w-4 text-[#18181B]" />
              <span className="text-xs font-semibold text-[#18181B]">
                GitHub
              </span>
            </div>
            {hasGithub ? (
              <span className="flex items-center gap-1 text-[10px] font-medium text-[#047857]">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-[#6B7280]">
                <AlertCircle className="h-3 w-3" />
                Not linked
              </span>
            )}
          </div>

          {hasGithub ? (
            <p className="text-[11px] text-[#047857]">
              @{user?.github_username || "connected"} · commits &amp; PRs
              tracked
            </p>
          ) : (
            <>
              <p className="text-[11px] text-[#52525B] mb-3">
                Track commits, pull requests, and code pushes automatically.
              </p>
              <Button
                onClick={handleConnectGitHub}
                variant="secondary"
                size="sm"
                isLoading={isConnectingGh}
                leftIcon={<GithubIcon className="h-3.5 w-3.5" />}
              >
                Connect GitHub
              </Button>
            </>
          )}
        </div>

        {/* Codeforces */}
        <div
          className={`p-4 rounded-[8px] border transition-colors ${
            hasCodeforces || cfSuccess
              ? "bg-[#F0FDF4] border-[#86EFAC]"
              : "bg-white border-[#E4E7EB]"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#EA580C]" />
              <span className="text-xs font-semibold text-[#18181B]">
                Codeforces
              </span>
            </div>
            {hasCodeforces || cfSuccess ? (
              <span className="flex items-center gap-1 text-[10px] font-medium text-[#047857]">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-[#6B7280]">
                <AlertCircle className="h-3 w-3" />
                Not linked
              </span>
            )}
          </div>

          {hasCodeforces || cfSuccess ? (
            <p className="text-[11px] text-[#047857]">
              @{user?.codeforces_username || cfHandle} · problem solutions
              tracked
            </p>
          ) : (
            <>
              <p className="text-[11px] text-[#52525B] mb-3">
                Track solved problems and contest submissions automatically.
              </p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  id="cf-handle-input"
                  value={cfHandle}
                  onChange={(e) => {
                    setCfHandle(e.target.value);
                    setCfError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConnectCodeforces();
                  }}
                  placeholder="Your CF handle"
                  className="flex-1 min-w-0 rounded-[6px] border border-[#E4E7EB] bg-white px-2.5 py-1.5 text-xs text-[#18181B] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857] transition-colors"
                />
                <button
                  id="cf-verify-btn"
                  onClick={handleConnectCodeforces}
                  disabled={isConnectingCf || !cfHandle.trim()}
                  className="shrink-0 rounded-[6px] border border-[#E4E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#18181B] hover:border-[#047857] hover:text-[#047857] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  {isConnectingCf ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </button>
              </div>
              {cfError && (
                <p className="text-[10px] text-[#DC2626] mt-1.5">{cfError}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-[10px] text-[#9CA3AF] mt-3">
        You can also manage these from your{" "}
        <a href="/profile" className="underline hover:text-[#52525B]">
          Profile page
        </a>
        . Both integrations are required for full AI verification.
      </p>
    </div>
  );
}
