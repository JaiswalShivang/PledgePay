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
      <div className="glass-panel glow-emerald rounded-2xl border border-white/15 bg-zinc-950/90 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 w-80 sm:w-88">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between px-4 py-3 cursor-pointer bg-zinc-900/60 hover:bg-zinc-900 transition"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-white">
              Live Demo Controls
            </span>
          </div>
          <button className="text-zinc-400 hover:text-white">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border-t border-b border-emerald-500/20 px-3 py-2 text-[11px] font-semibold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span className="truncate">{statusMsg}</span>
          </div>
        )}

        {isOpen && (
          <div className="p-3.5 space-y-2 border-t border-white/5">
            <p className="text-[10px] text-zinc-400 leading-snug">
              Instant judge-demo controls for seamless live presentations without terminal commands.
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                onClick={handleResetDemo}
                disabled={loadingAction !== null}
                className="flex items-center justify-between rounded-xl bg-zinc-900/80 border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800 hover:text-white transition disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <RotateCcw className="h-3.5 w-3.5 text-blue-400" />
                  <span>Reset Demo (12/20 ON TRACK)</span>
                </span>
                {loadingAction === "reset" && <Loader2 className="h-3 w-3 animate-spin text-blue-400" />}
              </button>

              <button
                onClick={handleInjectAnomaly}
                disabled={loadingAction !== null}
                className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <span>Inject Anomaly Burst (8 in 64s)</span>
                </span>
                {loadingAction === "anomaly" && (
                  <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                )}
              </button>

              <button
                onClick={handleForceSuccess}
                disabled={loadingAction !== null}
                className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Force Success (100% Payout)</span>
                </span>
                {loadingAction === "success" && (
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                )}
              </button>

              <button
                onClick={handleForceFailure}
                disabled={loadingAction !== null}
                className="flex items-center justify-between rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <Heart className="h-3.5 w-3.5 text-rose-400" />
                  <span>Force Failure (Impact Donation)</span>
                </span>
                {loadingAction === "failure" && (
                  <Loader2 className="h-3 w-3 animate-spin text-rose-400" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
