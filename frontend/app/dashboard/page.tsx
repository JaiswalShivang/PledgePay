"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { DemoControls } from "@/components/demo-controls";
import { apiClient, DashboardResponse, DashboardItem } from "@/lib/api-client";
import {
  Target,
  Coins,
  Heart,
  Clock,
  Plus,
  ArrowRight,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  GitBranch,
  ShieldCheck,
  RefreshCw,
  Zap,
} from "lucide-react";
import Image from "next/image";

export default function DashboardPage() {
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED" | "FAILED" | "DRAFT">("ALL");

  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<DashboardResponse>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      return await apiClient.dashboard.get();
    },
  });

  const stats = dashboardData?.stats;
  const items = dashboardData?.items || [];

  const filteredItems = items.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return item.commitment.status === "ACTIVE";
    if (filter === "COMPLETED") return item.commitment.status === "COMPLETED";
    if (filter === "FAILED") return item.commitment.status === "FAILED";
    if (filter === "DRAFT")
      return item.commitment.status === "DRAFT" || item.commitment.status === "PAYMENT_PENDING";
    return true;
  });

  const getPaceBadge = (status: "ON_TRACK" | "AT_RISK" | "BEHIND") => {
    switch (status) {
      case "ON_TRACK":
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          icon: <TrendingUp className="h-3 w-3 text-emerald-400" />,
          label: "ON TRACK",
        };
      case "AT_RISK":
        return {
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: <AlertTriangle className="h-3 w-3 text-amber-400" />,
          label: "AT RISK",
        };
      case "BEHIND":
        return {
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          icon: <AlertCircle className="h-3 w-3 text-rose-400" />,
          label: "BEHIND",
        };
    }
  };

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Commitment Command Center</span>
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Deterministic progress evaluation, AI verification, and escrow-backed milestones.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-emerald-400" : ""}`} />
              <span>Refresh</span>
            </button>

            <Link
              href="/commitments/new"
              className="glow-emerald flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition"
            >
              <Plus className="h-4 w-4" />
              <span>New Commitment</span>
            </Link>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel rounded-2xl border border-white/10 p-5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase">
                <span>Active Commitments</span>
                <Target className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-white font-mono">
                {stats.active_commitments_count}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                <ShieldCheck className="h-3 w-3" />
                <span>Live Escrow Active</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-white/10 p-5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase">
                <span>Total Pledged</span>
                <Coins className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-3xl font-black text-amber-300 font-mono">
                ₹{(stats.total_pledged_paise / 100).toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">
                Smallest Unit: {stats.total_pledged_paise} paise
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-white/10 p-5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase">
                <span>Completed Goals</span>
                <CheckCircle2 className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-3xl font-black text-purple-300 font-mono">
                {stats.completed_count}
              </div>
              <div className="text-[11px] text-purple-400 flex items-center gap-1 font-semibold">
                <Zap className="h-3 w-3" />
                <span>100% Proof Verified</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-white/10 p-5 space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono uppercase">
                <span>Charity Impact Donated</span>
                <Heart className="h-4 w-4 text-rose-400" />
              </div>
              <div className="text-3xl font-black text-rose-300 font-mono">
                ₹{(stats.total_donated_paise / 100).toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] text-rose-400 flex items-center gap-1 font-semibold">
                <Sparkles className="h-3 w-3" />
                <span>Win or Lose Impact</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto">
          {(["ALL", "ACTIVE", "COMPLETED", "FAILED", "DRAFT"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-xl px-4 py-2 text-xs font-mono font-bold uppercase transition ${
                filter === tab
                  ? "bg-white text-zinc-950 shadow-md"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {tab} {tab === "ALL" ? `(${items.length})` : ""}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-64 rounded-2xl border border-white/5 bg-zinc-900/40 p-6 animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
            <h3 className="font-bold">Failed to load dashboard</h3>
            <p className="text-xs text-red-300/80 mt-1">{(error as Error)?.message}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-dashed border-white/10 p-12 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 text-zinc-400">
              <Target className="h-7 w-7 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No commitments found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {filter === "ALL"
                  ? "You haven't created any commitments yet. Use AI goal structuring and lock in your first pledge."
                  : `No commitments currently match the "${filter}" filter.`}
              </p>
            </div>
            <Link
              href="/commitments/new"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create Your First Commitment</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item: DashboardItem) => {
              const comm = item.commitment;
              const prog = item.progress;
              const badge = getPaceBadge(prog.status);
              const amountINR = comm.amount_paise / 100;

              return (
                <Link
                  key={comm.id}
                  href={`/commitments/${comm.id}`}
                  className="group glass-panel rounded-2xl border border-white/10 p-5 hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                          comm.status === "ACTIVE"
                            ? badge.bg
                            : comm.status === "COMPLETED"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            : comm.status === "FAILED"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : "bg-zinc-800 text-zinc-400 border-white/10"
                        }`}
                      >
                        {comm.status === "ACTIVE" ? badge.icon : null}
                        <span>{comm.status === "ACTIVE" ? badge.label : comm.status}</span>
                      </span>

                      <div className="flex items-center gap-1 text-xs font-extrabold text-amber-300 font-mono">
                        <Coins className="h-3.5 w-3.5 text-amber-400" />
                        <span>₹{amountINR.toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition line-clamp-1">
                        {comm.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1 font-mono">
                        <span>{comm.duration_days} Days</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-blue-400" />
                          <span>{prog.days_remaining}d left</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Progress</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {prog.progress_pct}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden border border-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                          style={{ width: `${prog.progress_pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                        <span>
                          {prog.verified} / {prog.target} {comm.unit}
                        </span>
                        <span>{prog.daily_pace_actual}/day pace</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    {comm.charity ? (
                      <div className="flex items-center gap-2 truncate max-w-[180px]">
                        {comm.charity.logo_url && (
                          <div className="relative h-5 w-5 shrink-0 rounded-full overflow-hidden bg-zinc-800">
                            <Image
                              src={comm.charity.logo_url}
                              alt={comm.charity.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <span className="text-zinc-300 truncate text-[11px] font-medium">
                          {comm.charity.name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                        <GitBranch className="h-3.5 w-3.5" />
                        <span>{comm.github_repo || "No repo linked"}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs group-hover:translate-x-0.5 transition-transform">
                      <span>View</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <DemoControls />
      </div>
    </AuthGuard>
  );
}
