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
  Button,
  Badge,
  ProgressBar,
  Alert,
  Textarea,
} from "@/components/ui";
import {
  ArrowRight,
  ArrowLeft,
  RefreshCw
} from "lucide-react";

const PRESET_GOALS = [
  "Solve 20 DSA problems on LeetCode in 7 days",
  "Merge 5 GitHub pull requests in 14 days",
  "Commit code daily for 30 consecutive days",
];

const PLEDGE_PRESETS = [500, 1000, 2500, 5000];

export default function NewCommitmentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

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
      setCurrentStep(2);
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

  const selectedCharity = charitySuggestions.find(
    (c) => c.charity_id === selectedCharityId
  )?.charity;

  const dailyPace =
    structuredGoal && structuredGoal.duration > 0
      ? (structuredGoal.target / structuredGoal.duration).toFixed(1)
      : "0";

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-1 pb-3 border-b border-[#E4E7EB]">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18181B]">
            Create an Escrow Commitment
          </h1>
          <p className="text-xs text-[#52525B]">
            Define your developer goal, review verifiability with AI, and authorize your escrow pledge.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { step: 1, label: "1. Goal" },
            { step: 2, label: "2. Review" },
            { step: 3, label: "3. Charity" },
            { step: 4, label: "4. Escrow" },
          ].map((item) => (
            <div
              key={item.step}
              onClick={() => {
                if (item.step === 1 || (item.step === 2 && qualityAnalysis) || (item.step === 3 && qualityAnalysis) || (item.step === 4 && selectedCharityId)) {
                  setCurrentStep(item.step as 1 | 2 | 3 | 4);
                }
              }}
              className={`cursor-pointer rounded-[6px] p-2 border text-center text-xs transition-colors ${currentStep === item.step
                  ? "bg-white border-[#047857] text-[#047857] font-semibold"
                  : currentStep > item.step
                    ? "bg-[#F8F9FA] border-[#E4E7EB] text-[#18181B]"
                    : "bg-white border-[#E4E7EB] text-[#9CA3AF]"
                }`}
            >
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {errorMessage && (
          <Alert variant="destructive" title="Error">
            {errorMessage}
          </Alert>
        )}

        {/* STEP 1: GOAL INPUT */}
        {currentStep === 1 && (
          <div className="p-5 rounded-[8px] bg-white border border-[#E4E7EB] space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-[#18181B]">What is your commitment goal?</h2>
              <p className="text-xs text-[#52525B]">
                State clearly what you will ship or solve, and within what timeframe.
              </p>
            </div>

            <Textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. I want to solve 20 DSA algorithmic problems in 14 days."
            />

            <div className="space-y-1.5">
              <span className="text-xs text-[#71717A]">Examples:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_GOALS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setInputText(preset);
                      handleAnalyze(preset);
                    }}
                    className="rounded-[4px] border border-[#E4E7EB] bg-[#F8F9FA] px-2 py-0.5 text-xs text-[#52525B] hover:text-[#18181B] hover:border-[#D1D5DB] transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => handleAnalyze()}
                variant="primary"
                size="md"
                isLoading={isAnalyzing}
                disabled={!inputText.trim()}
              >
                Analyze Goal with AI
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: QUALITY AUDIT */}
        {currentStep === 2 && qualityAnalysis && structuredGoal && (
          <div className="p-5 rounded-[8px] bg-white border border-[#E4E7EB] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EB]">
              <div>
                <h2 className="text-sm font-semibold text-[#18181B]">AI Quality Evaluation</h2>
                <p className="text-xs text-[#52525B]">
                  Evaluated for measurability and evidence verifiability.
                </p>
              </div>

              <div className="text-right">
                <div className="text-xs text-[#71717A]">Score</div>
                <div className="text-xl font-bold font-numeric text-[#047857]">
                  {qualityAnalysis.overall}/100
                </div>
              </div>
            </div>

            {/* 4 Plain Sub-scores */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB] space-y-1">
                <div className="flex justify-between text-[#52525B]">
                  <span>Specificity</span>
                  <span className="font-numeric">{qualityAnalysis.specificity}%</span>
                </div>
                <ProgressBar value={qualityAnalysis.specificity} showValue={false} size="sm" />
              </div>

              <div className="p-3 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB] space-y-1">
                <div className="flex justify-between text-[#52525B]">
                  <span>Measurability</span>
                  <span className="font-numeric">{qualityAnalysis.measurability}%</span>
                </div>
                <ProgressBar value={qualityAnalysis.measurability} showValue={false} size="sm" />
              </div>

              <div className="p-3 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB] space-y-1">
                <div className="flex justify-between text-[#52525B]">
                  <span>Realism</span>
                  <span className="font-numeric">{qualityAnalysis.realism}%</span>
                </div>
                <ProgressBar value={qualityAnalysis.realism} showValue={false} size="sm" />
              </div>

              <div className="p-3 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB] space-y-1">
                <div className="flex justify-between text-[#52525B]">
                  <span>Evidence</span>
                  <span className="font-numeric">{qualityAnalysis.evidence}%</span>
                </div>
                <ProgressBar value={qualityAnalysis.evidence} showValue={false} size="sm" />
              </div>
            </div>

            {/* Improvement Feedback */}
            {qualityAnalysis.issues && qualityAnalysis.issues.length > 0 && (
              <Alert variant="warning" title="Suggestions for higher verifiability">
                <ul className="list-disc pl-4 space-y-0.5 mt-1">
                  {qualityAnalysis.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>

                {qualityAnalysis.suggested_commitment?.goal && (
                  <div className="mt-2 pt-2 border-t border-[#FDE68A]">
                    <span className="text-xs text-[#71717A] block mb-1">Suggested rewrite:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyRewrite(qualityAnalysis.suggested_commitment.goal)}
                      className="text-left text-xs font-medium text-[#047857] hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3 shrink-0" />
                      <span>{qualityAnalysis.suggested_commitment.goal}</span>
                    </button>
                  </div>
                )}
              </Alert>
            )}

            {/* Extracted Parameters */}
            <div className="pt-2">
              <h3 className="text-xs font-semibold text-[#52525B] uppercase tracking-wider mb-2">
                Parsed Parameters
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB]">
                  <div className="text-[#71717A]">Target</div>
                  <div className="font-bold font-numeric text-[#18181B] mt-0.5">{structuredGoal.target}</div>
                </div>

                <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB]">
                  <div className="text-[#71717A]">Unit</div>
                  <div className="font-bold font-numeric text-[#047857] capitalize mt-0.5">{structuredGoal.unit}</div>
                </div>

                <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB]">
                  <div className="text-[#71717A]">Duration</div>
                  <div className="font-bold font-numeric text-[#18181B] mt-0.5">{structuredGoal.duration} days</div>
                </div>

                <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB]">
                  <div className="text-[#71717A]">Evidence</div>
                  <div className="font-medium text-[#18181B] mt-0.5">GitHub Activity</div>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-between items-center border-t border-[#E4E7EB]">
              <Button
                onClick={() => setCurrentStep(1)}
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
              >
                Refine Prompt
              </Button>

              <Button
                onClick={() => setCurrentStep(3)}
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                Choose Fallback Cause
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: CHARITY SELECTION */}
        {currentStep === 3 && charitySuggestions.length > 0 && (
          <div className="p-5 rounded-[8px] bg-white border border-[#E4E7EB] space-y-5">
            <div className="space-y-0.5 pb-3 border-b border-[#E4E7EB]">
              <h2 className="text-sm font-semibold text-[#18181B]">Select Fallback Impact Cause</h2>
              <p className="text-xs text-[#52525B]">
                If your verified deadline is missed, 100% of your pledge is transferred to this non-profit.
              </p>
            </div>

            <div className="space-y-3">
              {charitySuggestions.map((item) => {
                const isSelected = selectedCharityId === item.charity_id;
                const charity = item.charity;

                return (
                  <div
                    key={item.charity_id}
                    onClick={() => setSelectedCharityId(item.charity_id)}
                    className={`cursor-pointer p-3.5 rounded-[6px] border transition-colors space-y-1.5 ${isSelected
                        ? "bg-[#ECFDF5] border-[#047857]"
                        : "bg-white border-[#E4E7EB] hover:border-[#D1D5DB]"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#18181B]">{charity?.name}</span>
                        <Badge variant="default" size="sm">
                          {charity?.category || "Impact"}
                        </Badge>
                      </div>

                      <div
                        className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${isSelected
                            ? "bg-[#047857] text-white"
                            : "border border-[#D1D5DB] text-transparent"
                          }`}
                      >
                        ✓
                      </div>
                    </div>

                    <p className="text-xs text-[#52525B] leading-relaxed">
                      {charity?.description}
                    </p>

                    <div className="text-[11px] text-[#71717A] pt-1">
                      <span>Match reason: {item.rationale}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 flex justify-between items-center border-t border-[#E4E7EB]">
              <Button
                onClick={() => setCurrentStep(2)}
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
              >
                Back to Review
              </Button>

              <Button
                onClick={() => setCurrentStep(4)}
                variant="primary"
                size="sm"
                disabled={!selectedCharityId}
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                Configure Stake
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: PLEDGE & SUMMARY */}
        {currentStep === 4 && structuredGoal && selectedCharityId && (
          <div className="p-5 rounded-[8px] bg-white border border-[#E4E7EB] space-y-5">
            <div className="space-y-0.5 pb-3 border-b border-[#E4E7EB]">
              <h2 className="text-sm font-semibold text-[#18181B]">Configure Escrow Stake</h2>
              <p className="text-xs text-[#52525B]">
                100% refunded to your account upon verified milestone completion.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#52525B]">
                Select Pledge Amount (₹ INR)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLEDGE_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPledgeAmountINR(amt)}
                    className={`py-2 rounded-[6px] border font-numeric font-medium text-sm transition-colors ${pledgeAmountINR === amt
                        ? "bg-[#047857] text-white border-[#047857]"
                        : "bg-white text-[#18181B] border-[#E4E7EB] hover:border-[#D1D5DB]"
                      }`}
                  >
                    ₹{amt.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
            </div>

            {/* Ledger Summary */}
            <div className="p-3.5 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB] space-y-2 text-xs">
              <div className="flex justify-between text-[#52525B] pb-1.5 border-b border-[#E4E7EB]">
                <span>Required Daily Pace</span>
                <span className="font-numeric font-medium text-[#18181B]">{dailyPace} {structuredGoal.unit} / day</span>
              </div>

              <div className="flex justify-between text-[#52525B] pb-1.5 border-b border-[#E4E7EB]">
                <span>Escrow Window</span>
                <span className="font-numeric font-medium text-[#18181B]">{structuredGoal.duration} days</span>
              </div>

              <div className="flex justify-between text-[#52525B] pb-1.5 border-b border-[#E4E7EB]">
                <span>Fallback Beneficiary</span>
                <span className="font-medium text-[#18181B]">{selectedCharity?.name}</span>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-semibold text-[#18181B]">Total Stake</span>
                <span className="text-xl font-bold font-numeric text-[#047857]">
                  ₹{pledgeAmountINR.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="pt-3 flex justify-between items-center border-t border-[#E4E7EB]">
              <Button
                onClick={() => setCurrentStep(3)}
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
              >
                Change Cause
              </Button>

              <Button
                onClick={handleCreateCommitment}
                variant="primary"
                size="md"
                isLoading={isCreating}
              >
                Authorize Escrow & Create Commitment
              </Button>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
