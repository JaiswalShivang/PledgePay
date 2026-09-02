"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import {
  apiClient,
  Commitment,
  EvidenceItem,
  GitHubRepoItem,
  ProgressCalculation,
  VerificationResult,
  ResolutionResult,
} from "@/lib/api-client";
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
  CheckCircle2,
  ShieldCheck,
  Flame,
  Zap,
  RefreshCw,
  GitCommit,
  GitBranch,
  ExternalLink,
  Check,
  Target,
  TrendingUp,
  AlertTriangle,
  Bot,
  BrainCircuit,
  Trophy,
  Award,
} from "lucide-react";
import Image from "next/image";

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CommitmentDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const commitmentId = resolvedParams.id;
  const queryClient = useQueryClient();

  const [paymentStep, setPaymentStep] = useState<
    "idle" | "creating_order" | "processing_payment" | "verifying" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [isLinkingRepo, setIsLinkingRepo] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVerifyingAI, setIsVerifyingAI] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("razorpay-checkout-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-checkout-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const {
    data: commitment,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Commitment>({
    queryKey: ["commitments", commitmentId],
    queryFn: async () => {
      const res = await apiClient.commitments.getById(commitmentId);
      return res.commitment;
    },
    enabled: !!commitmentId,
  });

  const { data: userRepos } = useQuery<GitHubRepoItem[]>({
    queryKey: ["github-repos"],
    queryFn: async () => {
      const res = await apiClient.integrations.listGitHubRepos();
      return res.repos;
    },
    enabled: !!commitment && commitment.status === "ACTIVE",
  });

  const { data: evidenceData, refetch: refetchEvidence } = useQuery<EvidenceItem[]>({
    queryKey: ["evidence", commitmentId],
    queryFn: async () => {
      const res = await apiClient.commitments.getEvidence(commitmentId);
      return res.evidence;
    },
    enabled: !!commitment && commitment.status === "ACTIVE",
  });

  const { data: progressData, refetch: refetchProgress } = useQuery<ProgressCalculation>({
    queryKey: ["progress", commitmentId],
    queryFn: async () => {
      const res = await apiClient.commitments.getProgress(commitmentId);
      return res.progress;
    },
    enabled: !!commitment && commitment.status === "ACTIVE",
  });

  const { data: verificationData, refetch: refetchVerification } = useQuery<VerificationResult | null>({
    queryKey: ["verification", commitmentId],
    queryFn: async () => {
      const res = await apiClient.commitments.getVerification(commitmentId);
      return res.verification;
    },
    enabled: !!commitment && commitment.status === "ACTIVE",
  });

  const { data: statusData, refetch: refetchStatus } = useQuery<ResolutionResult>({
    queryKey: ["resolution-status", commitmentId],
    queryFn: async () => {
      return await apiClient.commitments.getStatus(commitmentId);
    },
    enabled: !!commitmentId,
  });

  const activeRepo =
    selectedRepo ||
    commitment?.github_repo ||
    (userRepos && userRepos.length > 0 ? userRepos[0].full_name : "demo-developer/dsa-daily-challenge");

  const handleLinkRepo = async () => {
    if (!activeRepo) return;
    setIsLinkingRepo(true);
    setErrorMessage(null);
    try {
      await apiClient.commitments.linkRepo(commitmentId, activeRepo);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to link repository";
      setErrorMessage(msg);
    } finally {
      setIsLinkingRepo(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    setErrorMessage(null);
    try {
      const res = await apiClient.commitments.syncEvidence(commitmentId);
      refetchEvidence();
      refetchProgress();
      refetchVerification();
      refetchStatus();
      refetch();
      setSyncSuccessMsg(`Successfully synced ${res.synced_count} evidence items.`);
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sync evidence";
      setErrorMessage(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleVerifyAI = async () => {
    setIsVerifyingAI(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.commitments.verify(commitmentId);
      queryClient.setQueryData(["progress", commitmentId], res.progress);
      queryClient.setQueryData(["verification", commitmentId], res.verification);
      refetchProgress();
      refetchVerification();
      refetchStatus();
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute AI verification";
      setErrorMessage(msg);
    } finally {
      setIsVerifyingAI(false);
    }
  };

  const handleCheckResolution = async () => {
    setIsResolving(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.commitments.checkResolution(commitmentId);
      queryClient.setQueryData(["commitments", commitmentId], res.commitment);
      queryClient.setQueryData(["resolution-status", commitmentId], res);
      refetch();
      refetchStatus();
      refetchProgress();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resolve commitment";
      setErrorMessage(msg);
    } finally {
      setIsResolving(false);
    }
  };

  const handlePledgePayment = async () => {
    if (!commitment) return;

    setErrorMessage(null);
    setPaymentStep("creating_order");

    try {
      const orderData = await apiClient.payments.createOrder(commitment.id);
      setPaymentStep("processing_payment");

      if (typeof window !== "undefined" && window.Razorpay && !orderData.is_mock) {
        const options: RazorpayOptions = {
          key: orderData.key_id,
          amount: orderData.amount_paise,
          currency: orderData.currency,
          name: "PledgePay Escrow",
          description: `Pledge for: ${commitment.title}`,
          order_id: orderData.razorpay_order_id,
          handler: async function (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) {
            setPaymentStep("verifying");
            try {
              const verifyRes = await apiClient.payments.verify({
                commitment_id: commitment.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              queryClient.setQueryData(["commitments", commitment.id], verifyRes.commitment);
              setPaymentStep("success");
              refetch();
              refetchProgress();
              refetchVerification();
              refetchStatus();
            } catch (vErr: unknown) {
              const msg =
                vErr instanceof Error ? vErr.message : "Payment signature verification failed";
              setErrorMessage(msg);
              setPaymentStep("error");
            }
          },
          theme: {
            color: "#10b981",
          },
          modal: {
            ondismiss: function () {
              setPaymentStep("idle");
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        setPaymentStep("verifying");
        const mockPayID = orderData.mock_payment_id || `pay_mock_${Date.now()}`;
        const mockSig = orderData.mock_signature || `sig_mock_${Date.now()}`;

        const verifyRes = await apiClient.payments.verify({
          commitment_id: commitment.id,
          razorpay_order_id: orderData.razorpay_order_id,
          razorpay_payment_id: mockPayID,
          razorpay_signature: mockSig,
        });

        queryClient.setQueryData(["commitments", commitment.id], verifyRes.commitment);
        setPaymentStep("success");
        refetch();
        refetchProgress();
        refetchVerification();
        refetchStatus();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to initiate payment order";
      setErrorMessage(msg);
      setPaymentStep("error");
    }
  };

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

  const getPaceStatusBadge = (status: "ON_TRACK" | "AT_RISK" | "BEHIND") => {
    switch (status) {
      case "ON_TRACK":
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />,
          label: "ON TRACK",
        };
      case "AT_RISK":
        return {
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
          label: "AT RISK",
        };
      case "BEHIND":
        return {
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          icon: <AlertCircle className="h-3.5 w-3.5 text-rose-400" />,
          label: "BEHIND PACE",
        };
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

  const isResolved =
    commitment?.status === "COMPLETED" ||
    commitment?.status === "FAILED" ||
    statusData?.is_resolved ||
    !!statusData?.donation;

  const isSuccessOutcome =
    commitment?.status === "COMPLETED" || statusData?.donation?.outcome === "SUCCESS";

  const donation = statusData?.donation || commitment?.donation;

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
              {errorMessage && (
                <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                  <div>
                    <div className="font-semibold">Error</div>
                    <div className="text-xs text-red-300/90 mt-0.5">{errorMessage}</div>
                  </div>
                </div>
              )}

              {syncSuccessMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>{syncSuccessMsg}</span>
                </div>
              )}

              {isResolved && isSuccessOutcome && (
                <div className="glass-panel glow-emerald rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-zinc-900/60 to-zinc-950/80 p-6 sm:p-8 space-y-6 text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-zinc-950 shadow-xl shadow-emerald-500/20">
                    <Trophy className="h-8 w-8" />
                  </div>
                  <div className="space-y-2 max-w-xl mx-auto">
                    <span className="inline-block rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/30">
                      🎉 COMMITMENT COMPLETED & VERIFIED
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Target Achieved. Real Impact Created.
                    </h2>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      You met your goal of {commitment.target_count} {commitment.unit}! Your stake of ₹{amountINR.toLocaleString("en-IN")} was automatically routed as a verified donation to <span className="font-bold text-emerald-300">{commitment.charity?.name}</span>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
                    <div className="rounded-xl bg-zinc-900/80 p-4 border border-white/5">
                      <div className="text-[10px] uppercase font-mono text-zinc-400">Verified Evidence</div>
                      <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                        {statusData?.progress?.verified || commitment.target_count} / {commitment.target_count} {commitment.unit}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">100% Milestone Achieved</div>
                    </div>

                    <div className="rounded-xl bg-zinc-900/80 p-4 border border-white/5">
                      <div className="text-[10px] uppercase font-mono text-zinc-400">Impact Beneficiary</div>
                      <div className="text-base font-bold text-white mt-1 truncate">
                        {commitment.charity?.name}
                      </div>
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>DONATED ₹{amountINR.toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-zinc-900/80 p-4 border border-white/5">
                      <div className="text-[10px] uppercase font-mono text-zinc-400">RazorpayX Payout Ref</div>
                      <div className="text-xs font-mono text-zinc-300 mt-1 truncate">
                        {donation?.razorpayx_payout_id || "pout_test_verified_success"}
                      </div>
                      {commitment.charity?.website_url && (
                        <a
                          href={commitment.charity.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <span>Visit Charity</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isResolved && !isSuccessOutcome && (
                <div className="glass-panel rounded-2xl border border-blue-500/30 bg-gradient-to-br from-zinc-900/80 via-zinc-900/40 to-zinc-950/80 p-6 sm:p-8 space-y-6 text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 text-rose-400 border border-white/10 shadow-lg">
                    <Heart className="h-8 w-8 text-rose-400" />
                  </div>
                  <div className="space-y-2 max-w-xl mx-auto">
                    <span className="inline-block rounded-full bg-blue-500/10 px-3.5 py-1 text-xs font-mono font-bold text-blue-300 border border-blue-500/20">
                      RESOLVED • IMPACT CREATED
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      You didn&apos;t hit the full target — but your pledge still helped.
                    </h2>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      Every pledge creates real positive impact. Your ₹{amountINR.toLocaleString("en-IN")} stake has been securely transferred via RazorpayX directly to <span className="font-bold text-white">{commitment.charity?.name}</span> to support their mission.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
                    <div className="rounded-xl bg-zinc-900/80 p-4 border border-white/5">
                      <div className="text-[10px] uppercase font-mono text-zinc-400">Final Progress</div>
                      <div className="text-lg font-bold text-zinc-200 font-mono mt-1">
                        {statusData?.progress?.verified || 0} / {commitment.target_count} {commitment.unit}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">Resolved on Deadline</div>
                    </div>

                    <div className="rounded-xl bg-zinc-900/80 p-4 border border-white/5">
                      <div className="text-[10px] uppercase font-mono text-zinc-400">Donation Status</div>
                      <div className="text-base font-bold text-white mt-1 truncate">
                        {commitment.charity?.name}
                      </div>
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>DONATED ₹{amountINR.toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-zinc-900/80 p-4 border border-white/5">
                      <div className="text-[10px] uppercase font-mono text-zinc-400">RazorpayX Receipt</div>
                      <div className="text-xs font-mono text-zinc-300 mt-1 truncate">
                        {donation?.razorpayx_payout_id || "pout_test_impact_settled"}
                      </div>
                      {commitment.charity?.website_url && (
                        <a
                          href={commitment.charity.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <span>Visit Charity</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {commitment.status === "ACTIVE" && (
                <div className="glass-panel glow-emerald flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950 font-bold">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Escrow Locked & Commitment Active</span>
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <p className="text-xs text-emerald-200/80 mt-0.5">
                        Your ₹{amountINR.toLocaleString("en-IN")} stake is secured in smart escrow. Evidence polling and progress evaluation active.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckResolution}
                    disabled={isResolving}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500/20 px-3.5 py-2 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition disabled:opacity-50"
                  >
                    {isResolving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Award className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                    <span>{isResolving ? "Checking..." : "Check Resolution Now"}</span>
                  </button>
                </div>
              )}

              {verificationData && verificationData.anomaly_flag && (
                <div className="glass-panel rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                      <span>Potential Anomaly Detected in Evidence Stream</span>
                      <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono uppercase text-amber-300 border border-amber-500/30">
                        FLAGGED
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/90 leading-relaxed">
                      {verificationData.anomaly_reason ||
                        "Unusual timing pattern or cluster burst detected during automated evidence inspection."}
                    </p>
                  </div>
                </div>
              )}

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

              {commitment.status === "ACTIVE" && progressData && (
                <div className="glass-panel glow-emerald rounded-2xl border border-emerald-500/20 p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Target className="h-4 w-4 text-emerald-400" />
                          <span>Progress & AI Verification Engine</span>
                        </h3>
                        {(() => {
                          const badge = getPaceStatusBadge(progressData.status);
                          return (
                            <span
                              className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold font-mono uppercase ${badge.bg}`}
                            >
                              {badge.icon}
                              <span>{badge.label}</span>
                            </span>
                          );
                        })()}
                        {verificationData?.ai_summary?.evidence_quality && (
                          <span className="flex items-center gap-1 rounded-md border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-teal-300">
                            <Bot className="h-3 w-3" />
                            <span>{verificationData.ai_summary.evidence_quality} QUALITY</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Mathematical evaluation: {progressData.verified} / {progressData.target} {commitment.unit} verified.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleVerifyAI}
                        disabled={isVerifyingAI}
                        className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-50"
                      >
                        {isVerifyingAI ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <BrainCircuit className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                        <span>{isVerifyingAI ? "Analyzing AI..." : "Run AI Verification"}</span>
                      </button>

                      <div className="text-right">
                        <div className="text-[10px] uppercase text-zinc-500 font-mono">Completion</div>
                        <div className="text-2xl font-black text-emerald-400 font-mono">
                          {progressData.progress_pct}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-3 w-full rounded-full bg-zinc-900 overflow-hidden border border-white/5 p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700 shadow-lg shadow-emerald-500/30"
                        style={{ width: `${progressData.progress_pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>0 {commitment.unit}</span>
                      <span className="font-mono text-zinc-300 font-semibold">
                        {progressData.verified} of {progressData.target} {commitment.unit}
                      </span>
                      <span>{progressData.target} {commitment.unit}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="rounded-xl bg-zinc-900/60 p-3 border border-white/5">
                      <div className="text-[10px] uppercase text-zinc-400 font-mono">Verified Items</div>
                      <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                        {progressData.verified}
                      </div>
                    </div>

                    <div className="rounded-xl bg-zinc-900/60 p-3 border border-white/5">
                      <div className="text-[10px] uppercase text-zinc-400 font-mono">Days Remaining</div>
                      <div className="text-base font-bold text-white font-mono mt-0.5 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-blue-400" />
                        <span>{progressData.days_remaining}d</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-zinc-900/60 p-3 border border-white/5">
                      <div className="text-[10px] uppercase text-zinc-400 font-mono">Actual Daily Pace</div>
                      <div className="text-base font-bold text-white font-mono mt-0.5">
                        {progressData.daily_pace_actual} <span className="text-xs font-normal text-zinc-500">/day</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-zinc-900/60 p-3 border border-white/5">
                      <div className="text-[10px] uppercase text-zinc-400 font-mono">
                        {verificationData?.ai_confidence
                          ? `AI Confidence (${verificationData.ai_confidence}%)`
                          : "Required Pace"}
                      </div>
                      <div className="text-base font-bold text-zinc-300 font-mono mt-0.5">
                        {verificationData?.ai_confidence
                          ? `${verificationData.ai_confidence}%`
                          : `${progressData.daily_pace_required}/day`}
                      </div>
                    </div>
                  </div>

                  {verificationData?.ai_summary?.summary && (
                    <div className="rounded-xl bg-zinc-900/80 p-3.5 border border-white/5 text-xs text-zinc-300 flex items-start gap-2.5">
                      <Bot className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-white">AI Evidence Assessment: </span>
                        <span>{verificationData.ai_summary.summary}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

              {commitment.status === "ACTIVE" && (
                <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-emerald-400" />
                        <span>Linked Repository & Automated Evidence Poller</span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Evidence is fetched concurrently across commits, PRs, and issues.
                      </p>
                    </div>

                    <button
                      onClick={handleSyncNow}
                      disabled={isSyncing}
                      className="glow-emerald flex items-center gap-2 rounded-xl bg-zinc-900 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10 transition disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 text-emerald-400 ${
                          isSyncing ? "animate-spin" : ""
                        }`}
                      />
                      <span>{isSyncing ? "Syncing Evidence..." : "Sync Now"}</span>
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-full">
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Assigned GitHub Repository
                      </label>
                      <select
                        value={activeRepo}
                        onChange={(e) => setSelectedRepo(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs font-mono text-white outline-none focus:border-emerald-500"
                      >
                        {userRepos && userRepos.length > 0 ? (
                          userRepos.map((repo) => (
                            <option key={repo.id} value={repo.full_name}>
                              {repo.full_name}
                            </option>
                          ))
                        ) : (
                          <option value="demo-developer/dsa-daily-challenge">
                            demo-developer/dsa-daily-challenge
                          </option>
                        )}
                      </select>
                    </div>

                    <button
                      onClick={handleLinkRepo}
                      disabled={isLinkingRepo || activeRepo === commitment.github_repo}
                      className="mt-6 flex shrink-0 items-center gap-1.5 rounded-xl bg-zinc-800 border border-white/10 px-4 py-3 text-xs font-semibold text-white hover:bg-zinc-700 transition disabled:opacity-40"
                    >
                      {isLinkingRepo ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                      <span>{activeRepo === commitment.github_repo ? "Linked" : "Link Repo"}</span>
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                        Raw Evidence Stream ({evidenceData?.length || 0})
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Deduplicated by source_ref
                      </span>
                    </div>

                    {evidenceData && evidenceData.length > 0 ? (
                      <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-zinc-900/40">
                        {evidenceData.map((ev) => (
                          <div
                            key={ev.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 hover:bg-white/[0.02] transition"
                          >
                            <div className="flex items-start gap-2.5">
                              {ev.source === "github_commit" ? (
                                <GitCommit className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                              ) : (
                                <GitPullRequest className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                              )}
                              <div>
                                <div className="text-xs font-semibold text-white">
                                  {ev.raw_payload.message || ev.raw_payload.title || ev.source_ref}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                                  <span className="font-mono text-zinc-300">
                                    {ev.source_ref}
                                  </span>
                                  <span>•</span>
                                  <span>{new Date(ev.occurred_at).toLocaleString()}</span>
                                  {ev.raw_payload.author && (
                                    <>
                                      <span>•</span>
                                      <span className="text-emerald-400">
                                        @{ev.raw_payload.author}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {ev.raw_payload.url && (
                              <a
                                href={ev.raw_payload.url}
                                target="_blank"
                                rel="noreferrer"
                                className="self-end sm:self-center flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition"
                              >
                                <span>Inspect</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
                        <GitCommit className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                        <div className="text-xs font-semibold text-zinc-300">
                          No evidence items recorded yet
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 max-w-sm mx-auto">
                          Click &quot;Sync Now&quot; above or push code to your linked GitHub repository.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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

              {commitment.status !== "ACTIVE" && commitment.status !== "COMPLETED" && commitment.status !== "FAILED" && (
                <div className="glass-panel glow-emerald rounded-2xl border border-white/10 p-6 space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Lock className="h-4 w-4 text-emerald-400" />
                        <span>Authorize Escrow & Lock Pledge</span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Deposit your stake into the PledgePay verified escrow via Razorpay Test Mode. 100% refunded when you achieve your goal.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 rounded-xl bg-zinc-900/60 p-3 border border-white/5 text-xs text-zinc-300">
                      <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Instant automated refund upon milestone completion</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-zinc-900/60 p-3 border border-white/5 text-xs text-zinc-300">
                      <Flame className="h-4 w-4 text-rose-400 shrink-0" />
                      <span>Zero fee routing to chosen charity on failure</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePledgePayment}
                    disabled={paymentStep !== "idle" && paymentStep !== "error"}
                    className="glow-emerald flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 font-bold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {paymentStep === "creating_order" ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Initializing Razorpay Order...</span>
                      </>
                    ) : paymentStep === "processing_payment" ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Processing Payment in Razorpay...</span>
                      </>
                    ) : paymentStep === "verifying" ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Verifying HMAC Signature Server-Side...</span>
                      </>
                    ) : paymentStep === "success" ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-zinc-950" />
                        <span>Payment Verified! Commitment Active</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        <span>Pledge & Authorize ₹{amountINR.toLocaleString("en-IN")} Escrow</span>
                      </>
                    )}
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
