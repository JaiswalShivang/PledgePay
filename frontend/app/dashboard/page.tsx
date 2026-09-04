"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useCurrentTimestampMs } from "@/hooks/use-clock";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { IntegrationOnboardingBanner } from "@/components/integration-onboarding-banner";
import { apiClient, DashboardResponse, DashboardItem } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { Badge, ProgressBar, Alert, Tabs, TabsList, TabsTrigger, Button } from "@/components/ui";
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

function StatTile({
  label,
  value,
  sub,
  accentColor,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accentColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] p-6 bg-white border border-[#F2F3F7] flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium text-[#16161A]/70 font-body">{label}</span>
        <div
          className="h-8 w-8 rounded-[12px] flex items-center justify-center text-white"
          style={{ backgroundColor: accentColor }}
        >
          {icon}
        </div>
      </div>
      <div>
        <div
          className="font-bold font-display text-[32px] leading-tight"
          style={{ color: accentColor }}
        >
          {value}
        </div>
        {sub && (
          <div className="text-[14px] text-[#16161A]/60 mt-1 font-body">{sub}</div>
        )}
      </div>
    </div>
  );
}

function StatTileSkeleton() {
  return (
    <div className="rounded-[12px] p-6 bg-white border border-[#F2F3F7] flex flex-col justify-between gap-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-[#F2F3F7] rounded-[12px]" />
        <div className="h-8 w-8 rounded-[12px] bg-[#F2F3F7]" />
      </div>
      <div className="space-y-2">
        <div className="h-8 w-32 bg-[#F2F3F7] rounded-[12px]" />
        <div className="h-4 w-20 bg-[#F2F3F7] rounded-[12px]" />
      </div>
    </div>
  );
}

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
  const paceVariant = comm.status === "COMPLETED" ? "verified" : comm.status === "FAILED" ? "charity" : prog.status === "ON_TRACK" ? "verified" : "stake";

  const borderColor =
    comm.status === "COMPLETED" ? "#00C896" :
    comm.status === "FAILED"    ? "#FF3D71" :
    comm.status === "ACTIVE"    ? "#3D5AFE" : "#FF6B35";

  const isExpired = comm.status === "ACTIVE" && comm.end_date && currentTimestamp > 0 &&
    new Date(comm.end_date).getTime() <= currentTimestamp;

  return (
    <Link href={`/commitments/${comm.id}`} className="block group" aria-label={`View commitment: ${comm.title}`}>
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-[12px] bg-white transition-colors border border-[#F2F3F7] hover:border-[#3D5AFE]"
        style={{ borderLeftWidth: "4px", borderLeftColor: borderColor }}
      >
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {getStatusBadge(comm.status, prog.status)}
            <span className="text-[14px] px-2.5 py-0.5 rounded-[12px] font-medium font-body bg-[#F2F3F7] text-[#16161A]">
              {comm.evidence_type === "codeforces_submissions" ? "Codeforces" : "GitHub"}
            </span>
          </div>
          <h3 className="text-[16px] font-bold text-[#16161A] truncate group-hover:text-[#3D5AFE] transition-colors font-display">
            {comm.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-[#16161A]/60 font-body">
            <span className="font-display font-medium">{formatDurationText(comm.title, comm.duration_days)}</span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-display">{formatTimeRemaining(comm.end_date, prog.days_remaining)}</span>
            </span>
            {comm.charity && (
              <span className="flex items-center gap-1.5 text-[#FF3D71]">
                <Heart className="h-3.5 w-3.5" />
                <span className="font-medium">{comm.charity.name}</span>
              </span>
            )}
            {!comm.charity && comm.github_repo && (
              <span className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                <span>{comm.github_repo}</span>
              </span>
            )}
          </div>
          <div className="pt-1">
            <ProgressBar value={prog.progress_pct} variant={paceVariant} size="sm" />
          </div>
        </div>

        <div className="sm:text-right shrink-0 space-y-1.5">
          <div className="text-[20px] font-bold font-display text-[#FF6B35]">
            ₹{amountINR.toLocaleString("en-IN")}
          </div>
          <div className="text-[14px] text-[#16161A]/60 font-display">
            {prog.verified} / {prog.target} {comm.unit}
          </div>
          {isExpired && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[12px] text-[14px] font-medium bg-[#FF6B35] text-white">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Auto-settling…
            </div>
          )}
          {comm.status === "FAILED" && (
            <div className="text-[14px] font-medium text-[#FF3D71]">
              Donated to {comm.charity?.name || "Charity"}
            </div>
          )}
          {comm.status === "COMPLETED" && (
            <div className="text-[14px] font-medium text-[#00C896]">
              Stake Refunded
            </div>
          )}
          <div className="hidden sm:flex justify-end pt-1">
            <ArrowRight className="h-4 w-4 text-[#16161A]/40 group-hover:text-[#3D5AFE] transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}

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
      console.error(err);
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
            variant={pace === "ON_TRACK" ? "verified" : "stake"}
            size="sm"
          >
            {pace === "ON_TRACK" ? "On Track" : pace === "AT_RISK" ? "At Risk" : "Behind"}
          </Badge>
        );
      case "COMPLETED":
        return <Badge variant="verified" size="sm">Completed</Badge>;
      case "FAILED":
        return <Badge variant="charity" size="sm">Impact Donated</Badge>;
      case "PAYMENT_PENDING":
        return <Badge variant="stake" size="sm">Payment Pending</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Draft</Badge>;
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
    return `${durationDays}d`;
  };

  return (
    <AuthGuard>
      <div className="w-full bg-white min-h-[calc(100vh-64px)]">
        <div className="container mx-auto max-w-5xl px-4 py-10 space-y-8">

          {showBanner && <IntegrationOnboardingBanner onDismiss={handleDismissBanner} />}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-section text-[#16161A]">
                  Dashboard
                </h1>
                {isFetching && !isLoading && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[12px] bg-[#3D5AFE]/10 text-[#3D5AFE] text-[14px] font-medium font-body">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Syncing…
                  </span>
                )}
              </div>
              <p className="text-[14px] text-[#16161A]/70 mt-1 font-body">
                Active escrow custody, milestone progress, and verified charitable impact.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                leftIcon={<RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />}
              >
                Refresh
              </Button>
              <Link href="/commitments/new">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  New Pledge
                </Button>
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <StatTileSkeleton key={i} />
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile
                label="Total in Escrow"
                value={`₹${(stats.total_pledged_paise / 100).toLocaleString("en-IN")}`}
                sub={`${stats.active_commitments_count} active commitment${stats.active_commitments_count !== 1 ? "s" : ""}`}
                accentColor="#FF6B35"
                icon={<Lock className="h-4 w-4" />}
              />
              <StatTile
                label="Active Commitments"
                value={String(stats.active_commitments_count)}
                sub="In progress"
                accentColor="#3D5AFE"
                icon={<RefreshCw className="h-4 w-4" />}
              />
              <StatTile
                label="Completed Milestones"
                value={String(stats.completed_count)}
                sub="100% principal refunded"
                accentColor="#00C896"
                icon={<Target className="h-4 w-4" />}
              />
              <StatTile
                label="Total Donated to Charity"
                value={`₹${(stats.total_donated_paise / 100).toLocaleString("en-IN")}`}
                sub="Sent to accredited causes"
                accentColor="#FF3D71"
                icon={<Heart className="h-4 w-4" />}
              />
            </div>
          ) : null}

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

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-5 rounded-[12px] bg-white border border-[#F2F3F7] animate-pulse space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-48 bg-[#F2F3F7] rounded-[12px]" />
                    <div className="h-6 w-20 bg-[#F2F3F7] rounded-[12px]" />
                  </div>
                  <div className="h-3 w-full bg-[#F2F3F7] rounded-[12px]" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="h-4 w-32 bg-[#F2F3F7] rounded-[12px]" />
                    <div className="h-4 w-24 bg-[#F2F3F7] rounded-[12px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <Alert variant="destructive" title="Failed to load commitments">
              {(error as Error)?.message || "An unexpected error occurred."}
            </Alert>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center rounded-[12px] space-y-5 bg-white border border-[#F2F3F7]">
              <Target className="mx-auto h-10 w-10 text-[#16161A]/30" />
              <div className="space-y-1">
                <h3 className="text-subhead text-[#16161A]">
                  No commitments found
                </h3>
                <p className="text-[14px] text-[#16161A]/60 font-body">
                  {filter === "ALL"
                    ? "You haven't created any commitments yet."
                    : `No commitments match the "${filter}" filter.`}
                </p>
              </div>
              <Link href="/commitments/new">
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Create a Commitment
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
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
        </div>
      </div>
    </AuthGuard>
  );
}
