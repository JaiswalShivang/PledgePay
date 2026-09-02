"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { DemoControls } from "@/components/demo-controls";
import { apiClient, DashboardResponse, DashboardItem } from "@/lib/api-client";
import {
  Button,
  Badge,
  ProgressBar,
  Alert,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import {
  Plus,
  RefreshCw,
  Clock,
  GitBranch,
  Heart,
  Target,
} from "lucide-react";

export default function DashboardPage() {
  const [filter, setFilter] = useState<string>("ALL");

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

  const getStatusBadge = (status: string, paceStatus: "ON_TRACK" | "AT_RISK" | "BEHIND") => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge
            variant={paceStatus === "ON_TRACK" ? "active" : paceStatus === "AT_RISK" ? "pending" : "failed"}
            size="sm"
          >
            {paceStatus === "ON_TRACK" ? "On Track" : paceStatus === "AT_RISK" ? "At Risk" : "Behind"}
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="completed" size="sm">
            Completed
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="impact" size="sm">
            Impact Donated
          </Badge>
        );
      case "PAYMENT_PENDING":
        return (
          <Badge variant="pending" size="sm">
            Payment Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="default" size="sm">
            Draft
          </Badge>
        );
    }
  };

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E4E7EB]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18181B]">
              Commitment Dashboard
            </h1>
            <p className="text-xs text-[#52525B]">
              Active escrow custody, code verification, and charitable impact.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => refetch()}
              variant="secondary"
              size="sm"
              isLoading={isFetching}
              leftIcon={<RefreshCw className="h-3.5 w-3.5 text-[#52525B]" />}
            >
              Refresh
            </Button>

            <Link href="/commitments/new">
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                New Pledge
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Plain Stat Numbers */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-[8px] bg-white border border-[#E4E7EB]">
            <div>
              <div className="text-xs text-[#52525B]">Total in Escrow</div>
              <div className="text-2xl font-bold font-numeric text-[#047857] mt-0.5">
                ₹{(stats.total_pledged_paise / 100).toLocaleString("en-IN")}
              </div>
            </div>

            <div>
              <div className="text-xs text-[#52525B]">Active Commitments</div>
              <div className="text-2xl font-bold font-numeric text-[#18181B] mt-0.5">
                {stats.active_commitments_count}
              </div>
            </div>

            <div>
              <div className="text-xs text-[#52525B]">Completed Goals</div>
              <div className="text-2xl font-bold font-numeric text-[#18181B] mt-0.5">
                {stats.completed_count}
              </div>
            </div>

            <div>
              <div className="text-xs text-[#52525B]">Charity Donated</div>
              <div className="text-2xl font-bold font-numeric text-[#C2410C] mt-0.5">
                ₹{(stats.total_donated_paise / 100).toLocaleString("en-IN")}
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
              <div key={n} className="h-24 rounded-[8px] bg-white border border-[#E4E7EB] animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <Alert variant="destructive" title="Failed to load commitments">
            {(error as Error)?.message || "An unexpected error occurred."}
          </Alert>
        ) : filteredItems.length === 0 ? (
          <div className="p-10 text-center rounded-[8px] bg-white border border-[#E4E7EB] space-y-3">
            <Target className="mx-auto h-8 w-8 text-[#71717A]" />
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-[#18181B]">No commitments found</h3>
              <p className="text-xs text-[#52525B]">
                {filter === "ALL"
                  ? "You have not created any commitments yet."
                  : `No commitments currently match the "${filter}" filter.`}
              </p>
            </div>
            <Link href="/commitments/new">
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                Create a Commitment
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item: DashboardItem) => {
              const comm = item.commitment;
              const prog = item.progress;
              const amountINR = comm.amount_paise / 100;
              const paceStatus = prog.status === "ON_TRACK" ? "on_track" : prog.status === "AT_RISK" ? "at_risk" : "behind";

              return (
                <Link key={comm.id} href={`/commitments/${comm.id}`} className="block group">
                  <div className="p-4 rounded-[8px] bg-white border border-[#E4E7EB] group-hover:border-[#9CA3AF] transition-colors space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(comm.status, prog.status)}
                          <h3 className="text-sm font-semibold text-[#18181B] group-hover:text-[#047857] transition-colors">
                            {comm.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#52525B] font-numeric">
                          <span>{comm.duration_days} days total</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[#52525B]">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{prog.days_remaining}d left</span>
                          </span>
                          {comm.charity && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-[#C2410C]">
                                <Heart className="h-3.5 w-3.5" />
                                <span>{comm.charity.name}</span>
                              </span>
                            </>
                          )}
                          {!comm.charity && comm.github_repo && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-[#52525B]">
                                <GitBranch className="h-3.5 w-3.5" />
                                <span>{comm.github_repo}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold font-numeric text-[#18181B]">
                          ₹{amountINR.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[11px] text-[#71717A] font-numeric">
                          {prog.verified} / {prog.target} {comm.unit}
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <ProgressBar
                        value={prog.progress_pct}
                        status={paceStatus}
                        size="sm"
                        showValue={false}
                      />
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
