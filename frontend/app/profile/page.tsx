"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { CheckCircle2, AlertCircle, ExternalLink, LogOut, ShieldCheck } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

function IntegrationBlock({
  icon,
  title,
  desc,
  connected,
  connectedAs,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  connected: boolean;
  connectedAs?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] bg-white border border-[#F2F3F7] overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-[#F2F3F7]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[12px] bg-[#F2F3F7] flex items-center justify-center text-[#16161A] shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-[#16161A] font-display">
              {title}
            </h3>
            <p className="text-[14px] text-[#16161A]/60 font-body">{desc}</p>
          </div>
        </div>
        <Badge variant={connected ? "verified" : "neutral"} size="sm">
          {connected ? (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> Not Connected
            </span>
          )}
        </Badge>
      </div>
      <div className="p-6 space-y-4">
        {connected && connectedAs ? (
          <p className="text-[14px] text-[#16161A]/70 font-body">
            Linked account: <strong className="font-bold text-[#16161A]">@{connectedAs}</strong>
          </p>
        ) : (
          <p className="text-[14px] text-[#16161A]/50 font-body">No account linked yet.</p>
        )}
        {children}
      </div>
    </div>
  );
}

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

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleConnectGitHub = async () => {
    setIsConnectingGh(true);
    try {
      const res = await apiClient.integrations.getGitHubConnectUrl(window.location.href);
      if (res.url) window.location.href = res.url;
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
      setCfError(err instanceof Error ? err.message : "Could not verify handle.");
    } finally {
      setIsConnectingCf(false);
    }
  };

  const hasGithub = !!(user?.github_username || user?.integrations?.some((i) => i.provider === "github"));
  const hasCodeforces = !!(user?.codeforces_username || user?.integrations?.some((i) => i.provider === "codeforces") || cfSuccess);
  const initials = (user?.name ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <AuthGuard>
      <div className="w-full bg-white min-h-[calc(100vh-64px)]">
        <div className="container mx-auto max-w-2xl px-4 py-10 space-y-8">
          <div className="rounded-[12px] p-6 bg-white border border-[#F2F3F7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-[12px] bg-[#3D5AFE] flex items-center justify-center text-[20px] font-bold text-white shrink-0 font-display">
                {initials}
              </div>
              <div className="space-y-0.5">
                <h1 className="text-subhead text-[#16161A]">
                  {user?.name ?? "—"}
                </h1>
                <p className="text-[14px] text-[#16161A]/60 font-body">{user?.email ?? "—"}</p>
                <p className="text-[14px] text-[#16161A]/40 font-body">Member since {formattedDate}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="destructive"
              size="sm"
              leftIcon={<LogOut className="h-4 w-4" />}
            >
              Sign Out
            </Button>
          </div>

          <div className="space-y-2">
            <h2 className="text-subhead text-[#16161A]">
              Connected Platforms
            </h2>
            <p className="text-[14px] text-[#16161A]/70 font-body">
              These developer accounts provide the automated evidence used to verify your active pledges.
            </p>
          </div>

          <div className="space-y-4">
            <IntegrationBlock
              icon={<GithubIcon className="h-5 w-5" />}
              title="GitHub"
              desc="Polls commits, merged PRs, and repository activity."
              connected={hasGithub}
              connectedAs={user?.github_username}
            >
              {!hasGithub ? (
                <Button
                  onClick={handleConnectGitHub}
                  disabled={isConnectingGh}
                  variant="primary"
                  size="md"
                  leftIcon={<GithubIcon className="h-4 w-4" />}
                >
                  {isConnectingGh ? "Opening GitHub…" : "Connect GitHub Account"}
                </Button>
              ) : (
                <a
                  href={`https://github.com/${user?.github_username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[14px] text-[#3D5AFE] hover:underline font-medium font-body"
                >
                  <span>View GitHub Profile</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </IntegrationBlock>

            <IntegrationBlock
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Codeforces"
              desc="Verifies algorithmic problem solutions."
              connected={hasCodeforces}
              connectedAs={user?.codeforces_username}
            >
              {!hasCodeforces ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={cfHandle}
                      onChange={(e) => setCfHandle(e.target.value)}
                      placeholder="Codeforces handle (e.g. tourist)"
                    />
                    <Button
                      onClick={handleConnectCodeforces}
                      disabled={isConnectingCf || !cfHandle.trim()}
                      variant="primary"
                      size="md"
                      className="shrink-0"
                    >
                      {isConnectingCf ? "Linking…" : "Link Handle"}
                    </Button>
                  </div>
                  {cfError && <p className="text-[14px] text-[#FF3D71] font-body">{cfError}</p>}
                </div>
              ) : (
                <a
                  href={`https://codeforces.com/profile/${user?.codeforces_username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[14px] text-[#3D5AFE] hover:underline font-medium font-body"
                >
                  <span>View Codeforces Profile</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </IntegrationBlock>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
