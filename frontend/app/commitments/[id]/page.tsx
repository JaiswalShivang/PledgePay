"use client";

import { use, useState, useRef, useEffect } from "react";
import { useCurrentTimestampMs } from "@/hooks/use-clock";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { DemoControls } from "@/components/demo-controls";
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
  Button,
  Badge,
  Alert,
} from "@/components/ui";
import {
  ArrowLeft,
  ShieldCheck,
  Award,
} from "lucide-react";
import {
  AnomalyBanner,
  ResolutionBanner,
  EscrowPaymentCard,
  ProgressVerificationPanel,
  EvidenceFeed,
  CharityCard,
} from "@/components/commitment-detail";

interface RazorpayPaymentFailedResponse {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
  };
}

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
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  retry?: {
    enabled?: boolean;
    max_count?: number;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  [key: string]: unknown;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: RazorpayPaymentFailedResponse) => void) => void;
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
  const nowMs = useCurrentTimestampMs();
  const hasTriggeredResolutionRef = useRef(false);
  const hasAutoSyncedRef = useRef(false);



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
    refetchInterval: (query) => {
      const c = query.state.data;
      return c?.status === "ACTIVE" ? 30_000 : false;
    },
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
    enabled: !!commitment,
    refetchInterval: commitment?.status === "ACTIVE" ? 30_000 : false,
  });

  const { data: progressData, refetch: refetchProgress } = useQuery<ProgressCalculation>({
    queryKey: ["progress", commitmentId],
    queryFn: async () => {
      const res = await apiClient.commitments.getProgress(commitmentId);
      return res.progress;
    },
    enabled: !!commitment,
    refetchInterval: commitment?.status === "ACTIVE" ? 30_000 : false,
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

  useEffect(() => {
    if (!commitment || commitment.status !== "ACTIVE" || hasAutoSyncedRef.current) return;
    hasAutoSyncedRef.current = true;
    apiClient.commitments.syncEvidence(commitmentId).then(() => {
      refetchEvidence();
      refetchProgress();
      refetchStatus();
    }).catch(() => { /* silent */ });
  }, [commitment, commitmentId, refetchEvidence, refetchProgress, refetchStatus]);

  useEffect(() => {
    if (!commitment || commitment.status !== "ACTIVE" || hasTriggeredResolutionRef.current) return;
    if (!commitment.end_date || nowMs === 0) return;
    const deadlineMs = new Date(commitment.end_date).getTime();
    if (nowMs >= deadlineMs) {
      hasTriggeredResolutionRef.current = true;
      const timeoutId = setTimeout(async () => {
        setIsResolving(true);
        try {
          await apiClient.commitments.checkResolution(commitmentId);
          refetch();
          refetchProgress();
          refetchStatus();
          refetchEvidence();
        } catch {
          // silent
        } finally {
          setIsResolving(false);
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [nowMs, commitment, commitmentId, refetch, refetchProgress, refetchStatus, refetchEvidence]);

  const activeRepo =
    selectedRepo ||
    commitment?.github_repo ||
    (userRepos && userRepos.length > 0 ? userRepos[0].full_name : "");

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
          prefill: {
            name: "PledgePay Test User",
            email: "demo@pledgepay.io",
            contact: "9999999999",
          },
          retry: {
            enabled: true,
            max_count: 3,
          },
          handler: async function (response) {
            setPaymentStep("verifying");
            try {
              const verifyRes = await apiClient.payments.verify({
                commitment_id: commitment.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              queryClient.setQueryData(["commitments", commitment.id], verifyRes.commitment);
              queryClient.invalidateQueries({ queryKey: ["dashboard"] });
              queryClient.invalidateQueries({ queryKey: ["commitments"] });
              queryClient.refetchQueries({ queryKey: ["dashboard"] });
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
            color: "#047857",
          },
          modal: {
            ondismiss: function () {
              setPaymentStep("idle");
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (failResp: RazorpayPaymentFailedResponse) {
          setPaymentStep("error");
          const reason =
            failResp.error?.description ||
            failResp.error?.reason ||
            "Razorpay payment was declined or cancelled.";
          setErrorMessage(`Payment failed: ${reason}`);
        });
        rzp.open();
      } else {
        // Fallback if Razorpay credentials are mock/offline
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
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["commitments"] });
        queryClient.refetchQueries({ queryKey: ["dashboard"] });
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

  const amountINR = commitment ? commitment.amount_paise / 100 : 0;
  const isResolved =
    commitment?.status === "COMPLETED" ||
    commitment?.status === "FAILED" ||
    statusData?.is_resolved ||
    !!statusData?.donation;

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs text-[#52525B] hover:text-[#18181B] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="h-64 rounded-[8px] bg-white border border-[#E4E7EB] animate-pulse flex items-center justify-center text-xs text-[#71717A]">
            Loading commitment ledger...
          </div>
        ) : isError || !commitment ? (
          <Alert variant="destructive" title="Commitment Not Found">
            {(error as Error)?.message || "You do not have access to view this commitment."}
          </Alert>
        ) : (
          <div className="space-y-6">
            {errorMessage && (
              <Alert variant="destructive" title="Operation Error">
                {errorMessage}
              </Alert>
            )}

            {syncSuccessMsg && (
              <Alert variant="success">
                {syncSuccessMsg}
              </Alert>
            )}

            {/* Resolution Banner */}
            {isResolved && (
              <ResolutionBanner commitment={commitment} statusData={statusData} />
            )}

            {/* Active Escrow Custody Banner */}
            {commitment.status === "ACTIVE" && (
              <div className="p-4 rounded-[8px] bg-[#ECFDF5] border border-[#A7F3D0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-[#047857] shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-[#065F46]">
                      Escrow Locked & Polling Active
                    </div>
                    <p className="text-xs text-[#047857]">
                      ₹{amountINR.toLocaleString("en-IN")} stake is secured in smart escrow.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleCheckResolution}
                  variant="secondary"
                  size="sm"
                  isLoading={isResolving}
                  leftIcon={<Award className="h-3.5 w-3.5 text-[#047857]" />}
                >
                  Check Resolution
                </Button>
              </div>
            )}

            {/* Anomaly Detection Banner */}
            {verificationData?.anomaly_flag && (
              <AnomalyBanner reason={verificationData.anomaly_reason} />
            )}

            {/* Title & Stake Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4E7EB]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={commitment.status === "ACTIVE" ? "active" : "default"} size="sm">
                    {commitment.status}
                  </Badge>
                  {commitment.quality_score && (
                    <Badge variant="active" size="sm">
                      Quality: {commitment.quality_score}/100
                    </Badge>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18181B]">
                  {commitment.title}
                </h1>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs text-[#71717A]">Escrow Stake</div>
                <div className="text-xl font-bold font-numeric text-[#18181B]">
                  ₹{amountINR.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Two-Column Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Progress & Evidence */}
              <div className="lg:col-span-2 space-y-6">
                {commitment.status === "ACTIVE" && progressData && (
                  <ProgressVerificationPanel
                    commitment={commitment}
                    progressData={progressData}
                    verificationData={verificationData}
                    isVerifyingAI={isVerifyingAI}
                    onVerifyAI={handleVerifyAI}
                  />
                )}

                {commitment.status === "ACTIVE" && (
                  <EvidenceFeed
                    commitment={commitment}
                    evidenceData={evidenceData}
                    userRepos={userRepos}
                    activeRepo={activeRepo}
                    isLinkingRepo={isLinkingRepo}
                    isSyncing={isSyncing}
                    onRepoChange={setSelectedRepo}
                    onLinkRepo={handleLinkRepo}
                    onSyncNow={handleSyncNow}
                  />
                )}

                {commitment.status !== "ACTIVE" && commitment.status !== "COMPLETED" && commitment.status !== "FAILED" && (
                  <EscrowPaymentCard
                    commitment={commitment}
                    paymentStep={paymentStep}
                    onPledgePayment={handlePledgePayment}
                  />
                )}
              </div>

              {/* Right Column: AI Coach Chat & Cause */}
              <div className="space-y-6">


                {commitment.charity && (
                  <CharityCard charity={commitment.charity} />
                )}

                {/* Target Parameters */}
                <div className="p-4 rounded-[8px] bg-white border border-[#E4E7EB] space-y-2 text-xs">
                  <div className="font-semibold text-[#18181B] pb-1 border-b border-[#E4E7EB]">
                    Target Specifications
                  </div>
                  <div className="flex justify-between text-[#52525B]">
                    <span>Target Metric</span>
                    <span className="font-numeric font-medium text-[#18181B]">{commitment.target_count} {commitment.unit}</span>
                  </div>
                  <div className="flex justify-between text-[#52525B]">
                    <span>Duration</span>
                    <span className="font-numeric font-medium text-[#18181B]">{commitment.duration_days} days</span>
                  </div>
                  <div className="flex justify-between text-[#52525B]">
                    <span>Evidence Source</span>
                    <span className="capitalize text-[#18181B]">{commitment.evidence_type.replace("_", " ")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DemoControls commitmentId={commitmentId} />
      </div>
    </AuthGuard>
  );
}
