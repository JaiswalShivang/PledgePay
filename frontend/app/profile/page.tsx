"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import {
  Button,
  Badge,
} from "@/components/ui";
import {
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function ProfilePage() {
  const { user, logout, isLoggingOut } = useAuth();
  const router = useRouter();
  const [isConnectingGh, setIsConnectingGh] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

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

  const hasGithub =
    user?.github_username ||
    user?.integrations?.some((i) => i.provider === "github");

  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    : "N/A";

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EB]">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#18181B]">
              Account Settings
            </h1>
            <p className="text-xs text-[#52525B]">
              Manage your credentials and GitHub code verification.
            </p>
          </div>

          <Button
            onClick={handleLogout}
            variant="destructive"
            size="sm"
            isLoading={isLoggingOut}
            leftIcon={<LogOut className="h-3.5 w-3.5" />}
          >
            Sign Out
          </Button>
        </div>

        {/* Profile Card */}
        <div className="p-5 rounded-[8px] bg-white border border-[#E4E7EB] space-y-4">
          <h2 className="text-sm font-semibold text-[#18181B]">Profile Information</h2>

          <div className="space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-[#E4E7EB]">
              <span className="text-[#52525B]">Full Name</span>
              <span className="font-medium text-[#18181B]">{user?.name || "—"}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-[#E4E7EB]">
              <span className="text-[#52525B]">Email Address</span>
              <span className="font-numeric font-medium text-[#18181B]">{user?.email || "—"}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-[#E4E7EB]">
              <span className="text-[#52525B]">Account ID</span>
              <span className="font-numeric text-[#71717A]">{user?.id || "—"}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2">
              <span className="text-[#52525B]">Member Since</span>
              <span className="text-[#18181B]">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* GitHub Integration Card */}
        <div className="p-5 rounded-[8px] bg-white border border-[#E4E7EB] space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-[#18181B]">GitHub Code Verification</h2>
              <p className="text-xs text-[#52525B]">
                Required to poll commits, pull requests, and closed issues for automated verification.
              </p>
            </div>

            {hasGithub ? (
              <Badge variant="active" size="sm" icon={<CheckCircle2 className="h-3 w-3" />}>
                Connected
              </Badge>
            ) : (
              <Badge variant="default" size="sm" icon={<AlertCircle className="h-3 w-3" />}>
                Not Connected
              </Badge>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="text-xs text-[#52525B]">
              {user?.github_username ? (
                <span>Connected as <strong className="text-[#18181B] font-numeric">@{user.github_username}</strong></span>
              ) : (
                <span>No GitHub account linked</span>
              )}
            </div>

            <Button
              onClick={handleConnectGitHub}
              variant="secondary"
              size="sm"
              isLoading={isConnectingGh}
              leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              {hasGithub ? "Reconnect Account" : "Connect GitHub"}
            </Button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
