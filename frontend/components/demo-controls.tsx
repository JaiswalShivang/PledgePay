"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import {
  Sliders,
  RotateCcw,
  AlertTriangle,
  Trophy,
  Heart,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";

export function DemoControls({ commitmentId }: { commitmentId?: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const showMsg = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleResetDemo = async () => {
    setLoadingAction("reset");
    try {
      const res = await apiClient.dev.resetDemo();
      queryClient.invalidateQueries();
      showMsg("Demo state reset to 12/20 (ON TRACK)");
      if (res.primary_commitment_id) {
        router.push(`/commitments/${res.primary_commitment_id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset demo";
      showMsg(`Error: ${msg}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInjectAnomaly = async () => {
    setLoadingAction("anomaly");
    try {
      await apiClient.dev.injectAnomaly(commitmentId);
      queryClient.invalidateQueries();
      showMsg("Injected rapid 8-commit burst (Anomaly Flagged)");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to inject anomaly";
      showMsg(`Error: ${msg}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleForceSuccess = async () => {
    setLoadingAction("success");
    try {
      await apiClient.dev.forceSuccess(commitmentId);
      queryClient.invalidateQueries();
      showMsg("Goal Completed! RazorpayX donation dispatched");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to force success";
      showMsg(`Error: ${msg}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleForceFailure = async () => {
    setLoadingAction("failure");
    try {
      await apiClient.dev.forceFailure(commitmentId);
      queryClient.invalidateQueries();
      showMsg("Deadline expired! Stake routed as charity impact donation");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to force failure";
      showMsg(`Error: ${msg}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="rounded-[8px] border border-[#E4E7EB] bg-white shadow-md overflow-hidden transition-all w-72 sm:w-80">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between px-3.5 py-2 cursor-pointer bg-[#F8F9FA] hover:bg-[#F1F3F5] transition-colors"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#18181B]">
            <Sliders className="h-3.5 w-3.5 text-[#047857]" />
            <span>Judge Demo Controls</span>
          </div>
          <button className="text-[#71717A]">
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-1.5 bg-[#F0FDF4] border-t border-b border-[#BBF7D0] px-3 py-1.5 text-[11px] text-[#166534]">
            <CheckCircle2 className="h-3 w-3 shrink-0 text-[#166534]" />
            <span className="truncate">{statusMsg}</span>
          </div>
        )}

        {isOpen && (
          <div className="p-3 space-y-1.5 border-t border-[#E4E7EB]">
            <p className="text-[11px] text-[#71717A]">
              Live presentation triggers:
            </p>

            <div className="grid grid-cols-1 gap-1.5 pt-0.5">
              <button
                onClick={handleResetDemo}
                disabled={loadingAction !== null}
                className="flex items-center justify-between rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB] px-2.5 py-1.5 text-xs text-[#18181B] hover:bg-[#F1F3F5] transition-colors disabled:opacity-50"
              >
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="h-3 w-3 text-[#1D4ED8]" />
                  <span>Reset Demo (12/20 On Track)</span>
                </span>
                {loadingAction === "reset" && <Loader2 className="h-3 w-3 animate-spin text-[#1D4ED8]" />}
              </button>

              <button
                onClick={handleInjectAnomaly}
                disabled={loadingAction !== null}
                className="flex items-center justify-between rounded-[6px] bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-1.5 text-xs text-[#92400E] hover:bg-[#FEF3C7] transition-colors disabled:opacity-50"
              >
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-[#D97706]" />
                  <span>Inject Anomaly (8 commits in 64s)</span>
                </span>
                {loadingAction === "anomaly" && (
                  <Loader2 className="h-3 w-3 animate-spin text-[#D97706]" />
                )}
              </button>

              <button
                onClick={handleForceSuccess}
                disabled={loadingAction !== null}
                className="flex items-center justify-between rounded-[6px] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1.5 text-xs text-[#166534] hover:bg-[#DCFCE7] transition-colors disabled:opacity-50"
              >
                <span className="flex items-center gap-1.5">
                  <Trophy className="h-3 w-3 text-[#15803D]" />
                  <span>Force Success (100% Payout)</span>
                </span>
                {loadingAction === "success" && (
                  <Loader2 className="h-3 w-3 animate-spin text-[#15803D]" />
                )}
              </button>

              <button
                onClick={handleForceFailure}
                disabled={loadingAction !== null}
                className="flex items-center justify-between rounded-[6px] bg-[#FFF7ED] border border-[#FED7AA] px-2.5 py-1.5 text-xs text-[#9A3412] hover:bg-[#FFEDD5] transition-colors disabled:opacity-50"
              >
                <span className="flex items-center gap-1.5">
                  <Heart className="h-3 w-3 text-[#C2410C]" />
                  <span>Force Failure (Impact Settlement)</span>
                </span>
                {loadingAction === "failure" && (
                  <Loader2 className="h-3 w-3 animate-spin text-[#C2410C]" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
