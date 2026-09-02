"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { GithubIcon } from "@/components/icons";

export default function ProfilePage() {
  const { user, logout, isLoggingOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
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
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              User Profile
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Manage your credentials, active commitments, and integration tokens.
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 self-start rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50 sm:self-auto"
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span>Sign Out</span>
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="glass-panel rounded-2xl border border-white/10 p-6 md:col-span-1">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/30">
                <UserIcon className="h-10 w-10" />
                <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-zinc-950">
                  ✓
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">{user?.name}</h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">{user?.email}</p>
              <div className="mt-4 flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verified Staker</span>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Account ID</span>
                <span className="font-mono text-zinc-300">
                  {user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-4)}` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Member Since</span>
                <span className="text-zinc-300">{formattedDate}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6 md:col-span-2">
            <div className="glass-panel rounded-2xl border border-white/10 p-6">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-emerald-400" />
                <span>Account Credentials</span>
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-zinc-900/50 p-3.5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">Email Address</div>
                      <div className="text-sm font-medium text-white">{user?.email}</div>
                    </div>
                  </div>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                    Primary
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-zinc-900/50 p-3.5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">Full Name</div>
                      <div className="text-sm font-medium text-white">{user?.name}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-white/10 p-6">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <GithubIcon className="h-4 w-4 text-emerald-400" />
                <span>Evidence Providers & Integrations</span>
              </h3>

              <div className="rounded-xl bg-zinc-900/50 p-4 border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-white">
                      <GithubIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">GitHub OAuth</h4>
                        {hasGithub ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Connected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-white/5">
                            <AlertCircle className="h-3 w-3" /> Not Connected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {user?.github_username ? (
                          <span className="font-mono text-emerald-300">
                            @{user.github_username}
                          </span>
                        ) : (
                          "Required for automated GitHub commit and PR verification"
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!hasGithub) {
                        alert("GitHub integration connect flow activates in Prompt 3!");
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
                  >
                    <span>{hasGithub ? "Manage" : "Connect"}</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
