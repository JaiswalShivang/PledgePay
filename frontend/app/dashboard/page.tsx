"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useCurrentTimestampMs } from "@/hooks/use-clock";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { DemoControls } from "@/components/demo-controls";
import { IntegrationOnboardingBanner } from "@/components/integration-onboarding-banner";
import { apiClient, DashboardResponse, DashboardItem } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { Badge, ProgressBar, Alert, Tabs, TabsList, TabsTrigger } from "@/components/ui";
import {
  Plus,
  RefreshCw,
  Clock,
  GitBranch,
  Heart,
  Target,
  ArrowRight,
  Lock,
} from "lucide-react";

// ── Stat Tile ────────────────────────────────────────────────────────────────
function StatTile({
  label,
  value,
  sub,
  accent,
  wide,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: "escrow" | "blue" | "ember" | "neutral";
  wide?: boolean;
}) {
  const accentColor =
    accent === "escrow" ? "#0A6640" :
    accent === "blue"   ? "#1E4FD8" :
    accent === "ember"  ? "#C44B0A" : "#111318";

  const accentBg =
    accent === "escrow" ? "rgba(10,102,64,0.06)" :
    accent === "blue"   ? "rgba(30,79,216,0.06)" :
    accent === "ember"  ? "rgba(196,75,10,0.06)" : "transparent";

  return (
    <div
      className={`rounded-[12px] p-5 flex flex-col justify-between gap-3 ${wide ? "sm:col-span-2" : ""}`}
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E8EAED",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-[#6B7485]">{label}</span>
        <div
          className="h-6 w-6 rounded-[6px] flex items-center justify-center"
          style={{ backgroundColor: accentBg }}
        >
          {accent === "escrow" && <Lock className="h-3.5 w-3.5" style={{ color: accentColor }} />}
          {accent === "blue"   && <RefreshCw className="h-3.5 w-3.5" style={{ color: accentColor }} />}
          {accent === "ember"  && <Heart className="h-3.5 w-3.5" style={{ color: accentColor }} />}
          {accent === "neutral" && <Target className="h-3.5 w-3.5" style={{ color: accentColor }} />}
        </div>
      </div>
      <div>
        <div
          className="font-bold font-data leading-none"
          style={{
            fontSize: wide ? "2rem" : "1.6rem",
            color: accentColor,
            fontFamily: "var(--font-data, 'JetBrains Mono', monospace)",
          }}
        >
          {value}
        </div>
        {sub && (
          <div className="text-[11px] text-[#6B7485] mt-1">{sub}</div>
        )}
      </div>
    </div>
  );
}

// ── Commitment Row ───────────────────────────────────────────────────────────
function CommitmentRow({
  item,
  currentTimestamp,
  formatTimeRemaining,
  formatDurationText,
  getStatusBadge,
}: {
  item: DashboardItem;
  currentTimestamp: number;
  formatTimeRemaining: (end: string, days: number) => string;
  formatDurationText: (title: string, days: number) => string;
  getStatusBadge: (status: string, pace: "ON_TRACK" | "AT_RISK" | "BEHIND") => React.ReactNode;
}) {
  const { commitment: comm, progress: prog } = item;
  const amountINR = comm.amount_paise / 100;
  const paceStatus = prog.status === "ON_TRACK" ? "on_track" : prog.status === "AT_RISK" ? "at_risk" : "behind";

  const leftBorderColor =
    comm.status === "COMPLETED" ? "#0A6640" :
    comm.status === "FAILED"    ? "#C44B0A" :
    prog.status === "ON_TRACK"  ? "#0A6640" :
    prog.status === "AT_RISK"   ? "#B45309" : "#C44B0A";

  const isExpired = comm.status === "ACTIVE" && comm.end_date && currentTimestamp > 0 &&
    new Date(comm.end_date).getTime() <= currentTimestamp;

  return (
    <Link href={`/commitments/${comm.id}`} className="block group" aria-label={`View commitment: ${comm.title}`}>
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[10px] bg-white transition-all duration-150 group-hover:shadow-md"
        style={{
          border: "1px solid #E8EAED",
          borderLeft: `4px solid ${leftBorderColor}`,
        }}
      >
        {/* Left: title + meta */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {getStatusBadge(comm.status, prog.status)}
            <span
              className="text-xs px-1.5 py-0.5 rounded-[4px] font-medium"
              style={
                comm.evidence_type === "codeforces_submissions"
                  ? { backgroundColor: "#FFF7ED", color: "#C44B0A", border: "1px solid #FDBA74" }
                  : { backgroundColor: "#EFF6FF", color: "#1E4FD8", border: "1px solid #93C5FD" }
              }
            >
              {comm.evidence_type === "codeforces_submissions" ? "Codeforces" : "GitHub"}
            </span>
          </div>
          <h3
            className="text-sm font-semibold text-[#111318] truncate group-hover:text-[#0A6640] transition-colors"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
          >
            {comm.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7485]">
            <span className="font-data">{formatDurationText(comm.title, comm.duration_days)}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="font-data">{formatTimeRemaining(comm.end_date, prog.days_remaining)}</span>
            </span>
            {comm.charity && (
              <span className="flex items-center gap-1 text-[#C44B0A]">
                <Heart className="h-3 w-3" />
                <span>{comm.charity.name}</span>
              </span>
            )}
            {!comm.charity && comm.github_repo && (
              <span className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                <span className="font-data">{comm.github_repo}</span>
              </span>
            )}
          </div>
          <div className="pt-0.5">
            <ProgressBar value={prog.progress_pct} status={paceStatus} size="xs" animated={comm.status === "ACTIVE"} />
          </div>
        </div>

        {/* Right: stake + progress */}
        <div className="sm:text-right shrink-0 space-y-1">
          <div
            className="text-base font-bold font-data text-[#111318]"
            style={{ fontFamily: "var(--font-data)" }}
          >
            ₹{amountINR.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-[#6B7485] font-data">
            {prog.verified} / {prog.target} {comm.unit}
          </div>
          {isExpired && (
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium"
              style={{ backgroundColor: "#FFF7ED", color: "#C44B0A", border: "1px solid #FDBA74" }}
            >
              <RefreshCw className="h-3 w-3 animate-spin" />
              Auto-settling…
            </div>
          )}
          {comm.status === "FAILED" && (
            <div className="text-[11px] font-medium text-[#C44B0A]">
              ✓ Donated to {comm.charity?.name || "Charity"}
            </div>
          )}
          {comm.status === "COMPLETED" && (
            <div className="text-[11px] font-medium text-[#0A6640]">
              ✓ Stake Refunded
            </div>
          )}
          <div className="hidden sm:flex justify-end mt-1">
            <ArrowRight className="h-3.5 w-3.5 text-[#B0B7C3] group-hover:text-[#0A6640] transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [filter, setFilter] = useState<string>("ALL");
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<DashboardResponse>({
    queryKey: ["dashboard"],
    queryFn: async () => await apiClient.dashboard.get(),
    refetchInterval: 30_000,
  });

  const stats = dashboardData?.stats;
  const items = useMemo(() => dashboardData?.items || [], [dashboardData?.items]);

  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("onboarding") === "true") {
        sessionStorage.removeItem("integration_banner_dismissed");
        return false;
      }
      return sessionStorage.getItem("integration_banner_dismissed") === "true";
    }
    return false;
  });

  const currentTimestamp = useCurrentTimestampMs();

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    if (typeof window !== "undefined") sessionStorage.setItem("integration_banner_dismissed", "true");
  };

  const handleSettleCommitment = useCallback(async (id: string) => {
    try {
      await apiClient.commitments.checkResolution(id);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["commitments"] });
      refetch();
    } catch (err) {
      console.error("Failed to auto-settle:", err);
    }
  }, [queryClient, refetch]);

  const settledAttemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!items || items.length === 0 || currentTimestamp === 0) return;
    items.forEach((item) => {
      const comm = item.commitment;
      if (comm.status === "ACTIVE" && comm.end_date) {
        const endMs = new Date(comm.end_date).getTime();
        if (currentTimestamp >= endMs && !settledAttemptedRef.current.has(comm.id)) {
          settledAttemptedRef.current.add(comm.id);
          handleSettleCommitment(comm.id);
        }
      }
    });
  }, [items, currentTimestamp, handleSettleCommitment]);

  const hasGithub = !!user?.github_username || user?.integrations?.some((i) => i.provider === "github");
  const hasCodeforces = !!user?.codeforces_username || user?.integrations?.some((i) => i.provider === "codeforces");
  const showBanner = !bannerDismissed && !authLoading && (!hasGithub || !hasCodeforces);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("github_connected") === "true") {
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        const url = new URL(window.location.href);
        url.searchParams.delete("github_connected");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [queryClient]);

  const filteredItems = items.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return item.commitment.status === "ACTIVE";
    if (filter === "COMPLETED") return item.commitment.status === "COMPLETED";
    if (filter === "FAILED") return item.commitment.status === "FAILED";
    if (filter === "DRAFT") return item.commitment.status === "DRAFT" || item.commitment.status === "PAYMENT_PENDING";
    return true;
  });

  const getStatusBadge = (status: string, pace: "ON_TRACK" | "AT_RISK" | "BEHIND") => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge
            variant={pace === "ON_TRACK" ? "active" : pace === "AT_RISK" ? "pending" : "failed"}
            size="sm"
            dot={pace === "ON_TRACK"}
          >
            {pace === "ON_TRACK" ? "On Track" : pace === "AT_RISK" ? "At Risk" : "Behind"}
          </Badge>
        );
      case "COMPLETED":
        return <Badge variant="completed" size="sm">Completed</Badge>;
      case "FAILED":
        return <Badge variant="impact" size="sm">Impact Donated</Badge>;
      case "PAYMENT_PENDING":
        return <Badge variant="pending" size="sm">Payment Pending</Badge>;
      default:
        return <Badge variant="default" size="sm">Draft</Badge>;
    }
  };

  const formatTimeRemaining = (endDateStr: string, daysRemaining: number): string => {
    if (!endDateStr || currentTimestamp === 0) {
      if (daysRemaining <= 0) return "Due today";
      if (daysRemaining === 1) return "1d left";
      return `${daysRemaining}d left`;
    }
    const end = new Date(endDateStr).getTime();
    const diffMs = end - currentTimestamp;
    if (diffMs <= 0) return "Expired";
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays >= 1) return `${diffDays}d left`;
    if (diffHr >= 1) return `${diffHr}h left`;
    if (diffMin >= 1) return `${diffMin}m ${diffSec % 60}s left`;
    return `${diffSec}s left`;
  };

  const formatDurationText = (title: string, durationDays: number): string => {
    const lower = (title || "").toLowerCase();
    const mMin = lower.match(/(\d+)\s*(?:minutes?|mins?)\b/);
    if (mMin) return `${mMin[1]}min`;
    const mHr = lower.match(/(\d+)\s*(?:hours?|hrs?)\b/);
    if (mHr) return `${mHr[1]}hr`;
    return `${durationDays}${durationDays === 1 ? "d" : "d"}`;
  };

  return (
    <AuthGuard>
      <div className="w-full" style={{ backgroundColor: "#F5F6F8", minHeight: "calc(100vh - 56px)" }}>
        <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">

          {showBanner && <IntegrationOnboardingBanner onDismiss={handleDismissBanner} />}

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1
                className="text-2xl font-bold text-[#111318]"
                style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
              >
                Dashboard
              </h1>
              <p className="text-xs text-[#6B7485] mt-0.5">
                Active escrow custody, code verification, and charitable impact.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-[6px] transition-colors border border-[#D8DBE0] bg-white text-[#4B5263] hover:bg-[#F5F6F8] disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <Link
                href="/commitments/new"
                className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-[6px] text-white transition-colors"
                style={{ backgroundColor: "#0A6640", fontFamily: "var(--font-body)" }}
              >
                <Plus className="h-3.5 w-3.5" />
                New Pledge
              </Link>
            </div>
          </div>

          {/* ── Asymmetric Stat Tiles ──────────────────────────────── */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Escrow tile: 2-column wide */}
              <StatTile
                label="Total in Escrow"
                value={`₹${(stats.total_pledged_paise / 100).toLocaleString("en-IN")}`}
                sub={`${stats.active_commitments_count} active commitment${stats.active_commitments_count !== 1 ? "s" : ""}`}
                accent="escrow"
                wide
              />
              <StatTile
                label="Active"
                value={String(stats.active_commitments_count)}
                accent="blue"
              />
              <StatTile
                label="Completed"
                value={String(stats.completed_count)}
                accent="neutral"
              />
              {/* Charity donated — full row below on small, normal tile on large */}
              <div className="col-span-2 sm:col-span-4">
                <div
                  className="rounded-[12px] p-4 flex items-center justify-between"
                  style={{
                    backgroundColor: "rgba(196,75,10,0.06)",
                    border: "1px solid rgba(196,75,10,0.2)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-[8px] flex items-center justify-center"
                      style={{ backgroundColor: "rgba(196,75,10,0.12)" }}
                    >
                      <Heart className="h-4 w-4 text-[#C44B0A]" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-[#6B7485]">Total Donated to Charity</div>
                      <div
                        className="text-xl font-bold font-data text-[#C44B0A]"
                        style={{ fontFamily: "var(--font-data)" }}
                      >
                        ₹{(stats.total_donated_paise / 100).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[#C44B0A] opacity-60">via RazorpayX payout</span>
                </div>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div>
            <Tabs defaultValue="ALL" value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="ALL">All ({items.length})</TabsTrigger>
                <TabsTrigger value="ACTIVE">Active</TabsTrigger>
                <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
                <TabsTrigger value="FAILED">Impact Donated</TabsTrigger>
                <TabsTrigger value="DRAFT">Draft</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Commitment List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-28 rounded-[10px] skeleton" />
              ))}
            </div>
          ) : isError ? (
            <Alert variant="destructive" title="Failed to load commitments">
              {(error as Error)?.message || "An unexpected error occurred."}
            </Alert>
          ) : filteredItems.length === 0 ? (
            <div
              className="p-10 text-center rounded-[12px] space-y-4"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid #E8EAED" }}
            >
              <Target className="mx-auto h-8 w-8 text-[#B0B7C3]" />
              <div className="space-y-1">
                <h3
                  className="text-sm font-semibold text-[#111318]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  No commitments found
                </h3>
                <p className="text-xs text-[#6B7485]">
                  {filter === "ALL"
                    ? "You haven't created any commitments yet."
                    : `No commitments match the "${filter}" filter.`}
                </p>
              </div>
              <Link
                href="/commitments/new"
                className="inline-flex items-center gap-2 h-9 px-5 text-sm font-semibold text-white rounded-[8px] transition-all"
                style={{ backgroundColor: "#0A6640", fontFamily: "var(--font-body)" }}
              >
                <Plus className="h-4 w-4" />
                Create a Commitment
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredItems.map((item: DashboardItem) => (
                <CommitmentRow
                  key={item.commitment.id}
                  item={item}
                  currentTimestamp={currentTimestamp}
                  formatTimeRemaining={formatTimeRemaining}
                  formatDurationText={formatDurationText}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          )}

          <DemoControls />
        </div>
      </div>
    </AuthGuard>
  );
}
