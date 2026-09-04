"use client";

import { use, useState, useRef, useEffect } from "react";
import { useCurrentTimestampMs } from "@/hooks/use-clock";
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
  CoachChat,
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
    }).catch(() => {});
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
            color: "#3D5AFE",
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
      <div className="w-full bg-white min-h-[calc(100vh-64px)]">
        <div className="container mx-auto max-w-5xl px-4 py-10 space-y-8">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-[14px] text-[#16161A]/60 hover:text-[#16161A] transition-colors font-body"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-8 animate-pulse">
              <div className="space-y-2">
                <div className="h-6 w-32 bg-[#F2F3F7] rounded-[12px]" />
                <div className="h-10 w-96 bg-[#F2F3F7] rounded-[12px]" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-56 rounded-[12px] bg-[#F2F3F7]" />
                  <div className="h-72 rounded-[12px] bg-[#F2F3F7]" />
                </div>
                <div className="space-y-6">
                  <div className="h-64 rounded-[12px] bg-[#F2F3F7]" />
                  <div className="h-48 rounded-[12px] bg-[#F2F3F7]" />
                </div>
              </div>
            </div>
          ) : isError || !commitment ? (
            <Alert variant="destructive" title="Commitment Not Found">
              {(error as Error)?.message || "You do not have access to view this commitment."}
            </Alert>
          ) : (
            <div className="space-y-8">
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

              {isResolved && (
                <ResolutionBanner commitment={commitment} statusData={statusData} />
              )}

              {commitment.status === "ACTIVE" && (
                <div className="p-6 rounded-[12px] bg-white border-2 border-[#00C896] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-[#00C896] shrink-0" />
                    <div>
                      <div className="text-[16px] font-bold text-[#16161A] font-display">
                        Escrow Locked &amp; Automated Polling Active
                      </div>
                      <p className="text-[14px] text-[#16161A]/70 font-body">
                        ₹{amountINR.toLocaleString("en-IN")} stake is secured in custody. 100% refunded upon completion.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckResolution}
                    variant="outline"
                    size="sm"
                    isLoading={isResolving}
                    leftIcon={<Award className="h-4 w-4 text-[#00C896]" />}
                  >
                    Check Resolution
                  </Button>
                </div>
              )}

              {verificationData?.anomaly_flag && (
                <AnomalyBanner reason={verificationData.anomaly_reason} />
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3F7]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={commitment.status === "ACTIVE" ? "active" : "neutral"} size="sm">
                      {commitment.status}
                    </Badge>
                    {commitment.quality_score && (
                      <Badge variant="verified" size="sm">
                        Quality: {commitment.quality_score}/100
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-section text-[#16161A]">
                    {commitment.title}
                  </h1>
                </div>

                <div className="sm:text-right shrink-0">
                  <div className="text-[14px] text-[#16161A]/60 font-body">Escrow Stake</div>
                  <div className="text-[32px] font-bold font-display text-[#FF6B35]">
                    ₹{amountINR.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {commitment.status === "ACTIVE" && (
                    progressData ? (
                      <ProgressVerificationPanel
                        commitment={commitment}
                        progressData={progressData}
                        verificationData={verificationData}
                        isVerifyingAI={isVerifyingAI}
                        onVerifyAI={handleVerifyAI}
                      />
                    ) : (
                      <div className="rounded-[12px] bg-white border border-[#F2F3F7] p-6 space-y-4 animate-pulse">
                        <div className="h-6 w-48 bg-[#F2F3F7] rounded-[12px]" />
                        <div className="h-10 w-full bg-[#F2F3F7] rounded-[12px]" />
                        <div className="h-4 w-32 bg-[#F2F3F7] rounded-[12px]" />
                      </div>
                    )
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

                <div className="space-y-6">
                  {commitment.status === "ACTIVE" && (
                    <CoachChat
                      commitmentId={commitmentId}
                      onProgressUpdated={() => {
                        refetchProgress();
                        refetch();
                      }}
                    />
                  )}

                  {commitment.charity && (
                    <CharityCard charity={commitment.charity} />
                  )}

                  <div className="p-6 rounded-[12px] bg-white border border-[#F2F3F7] space-y-3 text-[14px] font-body">
                    <div className="font-bold text-[#16161A] pb-2 border-b border-[#F2F3F7] font-display">
                      Target Specifications
                    </div>
                    <div className="flex justify-between text-[#16161A]/70">
                      <span>Target Metric</span>
                      <span className="font-bold font-display text-[#16161A]">{commitment.target_count} {commitment.unit}</span>
                    </div>
                    <div className="flex justify-between text-[#16161A]/70">
                      <span>Duration</span>
                      <span className="font-bold font-display text-[#16161A]">{commitment.duration_days} days</span>
                    </div>
                    <div className="flex justify-between text-[#16161A]/70">
                      <span>Evidence Source</span>
                      <span className="capitalize text-[#16161A]">{commitment.evidence_type.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
