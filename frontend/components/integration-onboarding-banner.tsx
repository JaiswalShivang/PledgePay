"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
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
    <div className="relative rounded-[12px] border border-[#F2F3F7] bg-white p-6 font-body">
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 p-1.5 rounded-[12px] text-[#16161A]/40 hover:bg-[#F2F3F7] hover:text-[#16161A] transition-colors"
        title="Dismiss for this session"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3.5 mb-6">
        <div className="h-10 w-10 rounded-[12px] bg-[#3D5AFE] text-white flex items-center justify-center shrink-0">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-subhead text-[#16161A]">
            Connect verification sources
          </h2>
          <p className="text-[14px] text-[#16161A]/70 mt-0.5">
            Automated milestone verification requires linked developer accounts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          className={`p-5 rounded-[12px] border transition-colors ${
            hasGithub
              ? "bg-white border-[#00C896]"
              : "bg-[#F2F3F7] border-transparent"
          }`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <GithubIcon className="h-4 w-4 text-[#16161A]" />
              <span className="text-[16px] font-bold text-[#16161A] font-display">
                GitHub
              </span>
            </div>
            {hasGithub ? (
              <span className="flex items-center gap-1 text-[14px] font-bold text-[#00C896]">
                <CheckCircle2 className="h-4 w-4" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[14px] text-[#16161A]/50">
                <AlertCircle className="h-4 w-4" />
                Not linked
              </span>
            )}
          </div>

          {hasGithub ? (
            <p className="text-[14px] text-[#00C896] font-medium">
              @{user?.github_username || "connected"} &bull; Commits &amp; PRs tracked
            </p>
          ) : (
            <>
              <p className="text-[14px] text-[#16161A]/70 mb-4">
                Track commits, pull requests, and pushes automatically.
              </p>
              <Button
                onClick={handleConnectGitHub}
                variant="primary"
                size="sm"
                isLoading={isConnectingGh}
                leftIcon={<GithubIcon className="h-4 w-4" />}
              >
                Connect GitHub
              </Button>
            </>
          )}
        </div>

        <div
          className={`p-5 rounded-[12px] border transition-colors ${
            hasCodeforces || cfSuccess
              ? "bg-white border-[#00C896]"
              : "bg-[#F2F3F7] border-transparent"
          }`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#FF6B35]" />
              <span className="text-[16px] font-bold text-[#16161A] font-display">
                Codeforces
              </span>
            </div>
            {hasCodeforces || cfSuccess ? (
              <span className="flex items-center gap-1 text-[14px] font-bold text-[#00C896]">
                <CheckCircle2 className="h-4 w-4" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[14px] text-[#16161A]/50">
                <AlertCircle className="h-4 w-4" />
                Not linked
              </span>
            )}
          </div>

          {hasCodeforces || cfSuccess ? (
            <p className="text-[14px] text-[#00C896] font-medium">
              @{user?.codeforces_username || cfHandle} &bull; Solutions verified
            </p>
          ) : (
            <>
              <p className="text-[14px] text-[#16161A]/70 mb-3">
                Track algorithmic problem solutions and contest milestones.
              </p>
              <div className="flex gap-2">
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
                  className="flex-1 min-w-0 rounded-[12px] border border-[#D8DBE0] bg-white px-3 py-1.5 text-[14px] text-[#16161A] outline-none focus:border-[#3D5AFE]"
                />
                <Button
                  id="cf-verify-btn"
                  onClick={handleConnectCodeforces}
                  disabled={isConnectingCf || !cfHandle.trim()}
                  variant="primary"
                  size="sm"
                >
                  {isConnectingCf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
              {cfError && (
                <p className="text-[14px] text-[#FF3D71] mt-2">{cfError}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
