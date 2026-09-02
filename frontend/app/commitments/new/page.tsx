"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import {
  apiClient,
  StructuredGoal,
  QualityAnalysis,
  CharitySuggestion,
} from "@/lib/api-client";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Loader2,
  Wand2,
  RefreshCw,
  GitPullRequest,
  Check,
  ShieldAlert,
  Coins,
  Clock,
  TrendingUp,
  Flame,
} from "lucide-react";
import Image from "next/image";

const PRESET_GOALS = [
  "Solve 20 DSA problems on LeetCode in 7 days",
  "Merge 5 GitHub pull requests in 14 days",
  "Commit code daily for 30 consecutive days",
  "Learn how to code better",
];

const PLEDGE_PRESETS = [500, 1000, 2500, 5000];

export default function NewCommitmentPage() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [structuredGoal, setStructuredGoal] = useState<StructuredGoal | null>(null);
  const [qualityAnalysis, setQualityAnalysis] = useState<QualityAnalysis | null>(null);
  const [charitySuggestions, setCharitySuggestions] = useState<CharitySuggestion[]>([]);
  const [selectedCharityId, setSelectedCharityId] = useState<string | null>(null);
  const [pledgeAmountINR, setPledgeAmountINR] = useState<number>(1000);

  const handleAnalyze = async (textToAnalyze?: string) => {
    const text = (textToAnalyze || inputText).trim();
    if (!text) {
      setErrorMessage("Please enter a commitment goal to analyze.");
      return;
    }

    setErrorMessage(null);
    setIsAnalyzing(true);

    try {
      const res = await apiClient.ai.analyzeCombined(text);
      setStructuredGoal(res.structured);
      setQualityAnalysis(res.quality);
      setCharitySuggestions(res.charities || []);
      if (res.charities && res.charities.length > 0) {
        setSelectedCharityId(res.charities[0].charity_id);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to analyze commitment goal with AI";
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyRewrite = (rewriteText: string) => {
    setInputText(rewriteText);
    handleAnalyze(rewriteText);
  };

  const handleCreateCommitment = async () => {
    if (!structuredGoal) {
      setErrorMessage("Please analyze and structure your goal first.");
      return;
    }
    if (!selectedCharityId) {
      setErrorMessage("Please select a fallback charity for your pledge.");
      return;
    }
    if (pledgeAmountINR < 1) {
      setErrorMessage("Please enter a valid pledge amount.");
      return;
    }

    setErrorMessage(null);
    setIsCreating(true);

    try {
      const amountPaise = pledgeAmountINR * 100;
      const res = await apiClient.commitments.create({
        title: structuredGoal.goal,
        target_count: structuredGoal.target,
        unit: structuredGoal.unit,
        duration_days: structuredGoal.duration,
        evidence_type: structuredGoal.evidence || "github_activity",
        amount_paise: amountPaise,
        quality_score: qualityAnalysis?.overall,
        charity_id: selectedCharityId,
      });

      router.push(`/commitments/${res.commitment.id}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create commitment draft";
      setErrorMessage(msg);
      setIsCreating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 50) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-red-400 border-red-500/30 bg-red-500/10";
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const selectedCharity = charitySuggestions.find(
    (c) => c.charity_id === selectedCharityId
  )?.charity;

  const dailyPace =
    structuredGoal && structuredGoal.duration > 0
      ? (structuredGoal.target / structuredGoal.duration).toFixed(1)
      : "0";

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Goal Structurer & Quality Engine</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Create a New Commitment
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Define your developer milestone in plain English. Our AI parses parameters, evaluates verifiability, and matches impact causes.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-8">
          <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-emerald-400" />
                <span>What is your commitment goal?</span>
              </label>
              <span className="text-xs text-zinc-500">{inputText.length} characters</span>
            </div>

            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. I want to solve 20 DSA problems in 7 days and push solutions to my GitHub repo."
              className="w-full rounded-xl border border-white/10 bg-zinc-900/70 p-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-zinc-500">Quick Presets:</span>
              {PRESET_GOALS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setInputText(preset);
                    handleAnalyze(preset);
                  }}
                  className="rounded-lg border border-white/5 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 transition hover:border-emerald-500/30 hover:text-emerald-300 hover:bg-zinc-800"
                >
                  {preset}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleAnalyze()}
              disabled={isAnalyzing || !inputText.trim()}
              className="glow-emerald mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing Goal with Groq AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Analyze Commitment Quality</span>
                </>
              )}
            </button>
          </div>

          {qualityAnalysis && (
            <div className="glass-panel glow-emerald rounded-2xl border border-white/10 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-emerald-400" />
                    <span>Commitment Quality Score</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Automated evaluation for specificity, measurability, and verifiable evidence.
                  </p>
                </div>

                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${getScoreColor(
                    qualityAnalysis.overall
                  )}`}
                >
                  <span className="text-2xl">{qualityAnalysis.overall}</span>
                  <div className="flex flex-col text-[10px] uppercase tracking-wider font-mono">
                    <span>Quality</span>
                    <span>Score / 100</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 rounded-xl bg-zinc-900/50 p-3.5 border border-white/5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-300">Specificity</span>
                    <span className="text-zinc-400">{qualityAnalysis.specificity}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                        qualityAnalysis.specificity
                      )}`}
                      style={{ width: `${qualityAnalysis.specificity}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 rounded-xl bg-zinc-900/50 p-3.5 border border-white/5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-300">Measurability</span>
                    <span className="text-zinc-400">{qualityAnalysis.measurability}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                        qualityAnalysis.measurability
                      )}`}
                      style={{ width: `${qualityAnalysis.measurability}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 rounded-xl bg-zinc-900/50 p-3.5 border border-white/5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-300">Realism & Feasibility</span>
                    <span className="text-zinc-400">{qualityAnalysis.realism}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                        qualityAnalysis.realism
                      )}`}
                      style={{ width: `${qualityAnalysis.realism}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 rounded-xl bg-zinc-900/50 p-3.5 border border-white/5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-300">Evidence Verifiability</span>
                    <span className="text-zinc-400">{qualityAnalysis.evidence}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                        qualityAnalysis.evidence
                      )}`}
                      style={{ width: `${qualityAnalysis.evidence}%` }}
                    />
                  </div>
                </div>
              </div>

              {qualityAnalysis.issues && qualityAnalysis.issues.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Areas for Improvement</span>
                  </div>
                  <ul className="list-disc pl-5 text-xs text-amber-200/90 space-y-1">
                    {qualityAnalysis.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>

                  {qualityAnalysis.suggested_commitment &&
                    qualityAnalysis.suggested_commitment.goal && (
                      <div className="mt-3 pt-3 border-t border-amber-500/20">
                        <div className="text-xs text-zinc-300 mb-1.5 font-medium">
                          Suggested High-Quality Rewrite:
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleApplyRewrite(
                              qualityAnalysis.suggested_commitment.goal
                            )
                          }
                          className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-emerald-500/30 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10 transition text-left"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>
                            {qualityAnalysis.suggested_commitment.goal} (Target:{" "}
                            {qualityAnalysis.suggested_commitment.target}{" "}
                            {qualityAnalysis.suggested_commitment.unit} in{" "}
                            {qualityAnalysis.suggested_commitment.duration} days)
                          </span>
                        </button>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {structuredGoal && (
            <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Structured Commitment Parameters</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  These parameters will be locked in the smart escrow contract.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl bg-zinc-900/60 p-3.5 border border-white/5">
                  <div className="text-xs text-zinc-400">Target Count</div>
                  <div className="text-lg font-bold text-white font-mono mt-1">
                    {structuredGoal.target}
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-900/60 p-3.5 border border-white/5">
                  <div className="text-xs text-zinc-400">Unit Type</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono capitalize mt-1">
                    {structuredGoal.unit}
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-900/60 p-3.5 border border-white/5">
                  <div className="text-xs text-zinc-400">Duration</div>
                  <div className="text-lg font-bold text-white font-mono mt-1">
                    {structuredGoal.duration} Days
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-900/60 p-3.5 border border-white/5">
                  <div className="text-xs text-zinc-400">Evidence Source</div>
                  <div className="text-xs font-semibold text-zinc-200 mt-1.5 flex items-center gap-1.5">
                    <GitPullRequest className="h-3.5 w-3.5 text-blue-400" />
                    <span>GitHub Activity</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {charitySuggestions.length > 0 && (
            <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-400" />
                  <span>Select Fallback Impact Charity</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  If you fail to meet your verified commitment, your stake will be automatically routed to your chosen nonprofit.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {charitySuggestions.map((item) => {
                  const isSelected = selectedCharityId === item.charity_id;
                  const charity = item.charity;
                  return (
                    <div
                      key={item.charity_id}
                      onClick={() => setSelectedCharityId(item.charity_id)}
                      className={`relative cursor-pointer rounded-2xl p-4 border transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                          : "border-white/10 bg-zinc-900/50 hover:border-white/20 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-300 border border-white/5">
                          {charity?.category || "Impact"}
                        </span>
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500 text-zinc-950"
                              : "border-zinc-700 bg-zinc-800 text-transparent"
                          }`}
                        >
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      </div>

                      {charity?.logo_url && (
                        <div className="relative mb-3 h-24 w-full rounded-lg overflow-hidden bg-zinc-800">
                          <Image
                            src={charity.logo_url}
                            alt={charity.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}

                      <h4 className="text-sm font-bold text-white mb-1">
                        {charity?.name || "Verified Charity Partner"}
                      </h4>
                      <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                        {charity?.description}
                      </p>

                      <div className="rounded-lg bg-zinc-950/60 p-2.5 border border-white/5">
                        <div className="text-[10px] uppercase font-bold text-emerald-400 mb-0.5 font-mono">
                          AI Match Rationale
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {item.rationale}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {structuredGoal && selectedCharityId && (
            <div className="glass-panel glow-emerald rounded-2xl border border-white/10 p-6 space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Coins className="h-5 w-5 text-amber-400" />
                  <span>Pledge Amount & Escrow Commitment Summary</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Select your financial stake. 100% refunded upon verified goal completion.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Select Pledge Stake (₹ INR)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PLEDGE_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPledgeAmountINR(amt)}
                      className={`py-2.5 rounded-xl border text-sm font-bold transition ${
                        pledgeAmountINR === amt
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                          : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      ₹{amt.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-zinc-900/80 p-5 border border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    Required Daily Pace
                  </span>
                  <span className="font-semibold text-white font-mono">
                    {dailyPace} {structuredGoal.unit} / day
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    Escrow Window
                  </span>
                  <span className="font-semibold text-white font-mono">
                    {structuredGoal.duration} Days
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 text-rose-400" />
                    Fallback Beneficiary
                  </span>
                  <span className="font-semibold text-emerald-300">
                    {selectedCharity?.name || "Selected Charity"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-amber-400" />
                    Total Escrow Stake
                  </span>
                  <span className="text-xl font-extrabold text-emerald-400 font-mono">
                    ₹{pledgeAmountINR.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCreateCommitment}
                disabled={isCreating}
                className="glow-emerald flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 font-bold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Persisting Commitment Draft...</span>
                  </>
                ) : (
                  <>
                    <span>Create Commitment & Continue</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
