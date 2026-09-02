"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { apiClient, Commitment } from "@/lib/api-client";
import {
  Calendar,
  Coins,
  Heart,
  GitPullRequest,
  Clock,
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  CreditCard,
  Lock,
} from "lucide-react";
import Image from "next/image";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CommitmentDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const commitmentId = resolvedParams.id;

  const {
    data: commitment,
    isLoading,
    isError,
    error,
  } = useQuery<Commitment>({
    queryKey: ["commitments", commitmentId],
    queryFn: async () => {
      const res = await apiClient.commitments.getById(commitmentId);
      return res.commitment;
    },
    enabled: !!commitmentId,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "DRAFT":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "PAYMENT_PENDING":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "COMPLETED":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "FAILED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return "bg-zinc-800 text-zinc-300 border-white/10";
    }
  };

  const amountINR = commitment ? commitment.amount_paise / 100 : 0;
  const startDateStr = commitment?.start_date
    ? new Date(commitment.start_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const endDateStr = commitment?.end_date
    ? new Date(commitment.end_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6">
          <Link
            href="/commitments/new"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Create another commitment</span>
          </Link>

          {isLoading ? (
            <div className="flex items-center gap-3 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              <span className="text-sm text-zinc-400">Loading commitment...</span>
            </div>
          ) : isError || !commitment ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
              <div>
                <h3 className="font-bold">Commitment Not Found</h3>
                <p className="mt-1 text-xs text-red-300/80">
                  {(error as Error)?.message || "You do not have access to view this commitment."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`inline-block rounded-md border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider font-mono ${getStatusBadge(
                        commitment.status
                      )}`}
                    >
                      {commitment.status}
                    </span>
                    {commitment.quality_score && (
                      <span className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                        <Sparkles className="h-3 w-3" />
                        <span>Quality: {commitment.quality_score}/100</span>
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    {commitment.title}
                  </h1>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-zinc-900/80 border border-white/10 px-4 py-2 self-start sm:self-auto">
                  <Coins className="h-5 w-5 text-amber-400" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-zinc-400">Pledge Stake</div>
                    <div className="text-base font-extrabold text-white font-mono">
                      ₹{amountINR.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-zinc-900/50 p-3.5 border border-white/5">
                  <div className="text-xs text-zinc-400">Target</div>
                  <div className="text-base font-bold text-white font-mono mt-1">
                    {commitment.target_count}{" "}
                    <span className="text-xs font-normal text-zinc-400">{commitment.unit}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-900/50 p-3.5 border border-white/5">
                  <div className="text-xs text-zinc-400">Duration</div>
                  <div className="text-base font-bold text-white font-mono mt-1 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    <span>{commitment.duration_days} Days</span>
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-900/50 p-3.5 border border-white/5">
                  <div className="text-xs text-zinc-400">Timeframe</div>
                  <div className="text-xs font-medium text-zinc-300 mt-1.5 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-blue-400" />
                    <span>{startDateStr}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    until {endDateStr}
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-900/50 p-3.5 border border-white/5">
                  <div className="text-xs text-zinc-400">Verification Source</div>
                  <div className="text-xs font-semibold text-zinc-200 mt-1.5 flex items-center gap-1.5">
                    <GitPullRequest className="h-3.5 w-3.5 text-blue-400" />
                    <span className="capitalize">{commitment.evidence_type.replace("_", " ")}</span>
                  </div>
                </div>
              </div>

              {commitment.charity && (
                <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Heart className="h-4 w-4 text-rose-400" />
                      <span>Fallback Impact Beneficiary</span>
                    </h3>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                      {commitment.charity.category}
                    </span>
                  </div>

                  <div className="flex items-start gap-4">
                    {commitment.charity.logo_url && (
                      <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-zinc-800 border border-white/10">
                        <Image
                          src={commitment.charity.logo_url}
                          alt={commitment.charity.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <h4 className="text-base font-bold text-white">
                        {commitment.charity.name}
                      </h4>
                      <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                        {commitment.charity.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {commitment.status === "DRAFT" && (
                <div className="glass-panel glow-emerald rounded-2xl border border-white/10 p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Lock className="h-4 w-4 text-emerald-400" />
                        <span>Ready to Lock in Escrow?</span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Your draft commitment is saved. Next, authorize and lock your pledge stake via Razorpay payment escrow.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      alert(
                        "Razorpay Escrow payment gateway integration activates in Prompt 5!"
                      );
                    }}
                    className="glow-emerald flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-bold text-zinc-950 transition hover:bg-emerald-400"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Authorize & Pledge ₹{amountINR.toLocaleString("en-IN")}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
