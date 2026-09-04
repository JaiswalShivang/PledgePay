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
  Alert,
  Textarea,
  Input,
} from "@/components/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  Lock,
  Loader2,
} from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";

const PRESET_GOALS = [
  "Solve 20 DSA problems on LeetCode in 7 days",
  "Merge 5 GitHub pull requests in 14 days",
  "Commit code daily for 30 consecutive days",
];

const PLEDGE_PRESETS = [500, 1000, 2500, 5000];

export default function NewCommitmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, refetchMe } = useAuth();
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
  const [isEditingParams, setIsEditingParams] = useState(false);

  const { data: allCharitiesData, isLoading: isCharitiesLoading } = useQuery({
    queryKey: ["charities"],
    queryFn: () => apiClient.charities.getAll(),
    staleTime: 15 * 60 * 1000,
  });
  const allCharities = allCharitiesData?.charities || [];
  const [charitySearch, setCharitySearch] = useState("");
  const [charityCategoryFilter, setCharityCategoryFilter] = useState("ALL");

  const [newCfHandle, setNewCfHandle] = useState("");
  const [isConnectingCf, setIsConnectingCf] = useState(false);
  const [cfConnectError, setCfConnectError] = useState<string | null>(null);
  const [isConnectingGh, setIsConnectingGh] = useState(false);

  const hasGithub =
    !!user?.github_username ||
    user?.integrations?.some((i) => i.provider === "github");
  const hasCodeforces =
    !!user?.codeforces_username ||
    user?.integrations?.some((i) => i.provider === "codeforces");

  const handleConnectCodeforcesInline = async () => {
    const handle = newCfHandle.trim();
    if (!handle) return;
    setIsConnectingCf(true);
    setCfConnectError(null);
    try {
      await apiClient.integrations.connectCodeforces(handle);
      await refetchMe();
      setNewCfHandle("");
    } catch (err: unknown) {
      setCfConnectError(
        err instanceof Error ? err.message : "Failed to verify Codeforces handle"
      );
    } finally {
      setIsConnectingCf(false);
    }
  };

  const handleConnectGitHubInline = async () => {
    setIsConnectingGh(true);
    try {
      const res = await apiClient.integrations.getGitHubConnectUrl(
        window.location.href
      );
      if (res.url) window.location.href = res.url;
    } catch {
      setIsConnectingGh(false);
    }
  };

  const handleParamChange = (field: keyof StructuredGoal, value: string | number) => {
    if (!structuredGoal) return;
    const updated = {
      ...structuredGoal,
      [field]: value,
    };
    if (field === "duration") {
      const numDays = typeof value === "number" ? value : parseInt(String(value), 10) || 1;
      updated.timeframe_text = `${numDays} ${numDays === 1 ? "day" : "days"}`;
    }
    setStructuredGoal(updated);
  };

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
        duration_minutes: structuredGoal.duration_minutes,
        evidence_type: structuredGoal.evidence || "github_activity",
        amount_paise: amountPaise,
        quality_score: qualityAnalysis?.overall,
        charity_id: selectedCharityId,
      });

      queryClient.invalidateQueries({ queryKey: ["commitments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.refetchQueries({ queryKey: ["dashboard"] });
      queryClient.refetchQueries({ queryKey: ["commitments"] });

      router.push(`/commitments/${res.commitment.id}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create commitment draft";
      setErrorMessage(msg);
      setIsCreating(false);
    }
  };

  const selectedCharity =
    allCharities.find((c) => c.id === selectedCharityId) ||
    charitySuggestions.find((c) => c.charity_id === selectedCharityId)?.charity;

  const dailyPace =
    structuredGoal && structuredGoal.duration > 0
      ? (structuredGoal.target / structuredGoal.duration).toFixed(1)
      : "0";

  return (
    <AuthGuard>
      <div className="w-full bg-white min-h-[calc(100vh-64px)]">
        <div className="container mx-auto max-w-2xl px-4 py-10 space-y-8">
          <div className="space-y-2">
            <h1 className="text-section text-[#16161A]">
              Create an Escrow Commitment
            </h1>
            <p className="text-[14px] text-[#16161A]/70 font-body">
              Define your developer goal, review verifiability with AI, and authorize your escrow pledge.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { step: 1, label: "1. Goal" },
              { step: 2, label: "2. Review" },
              { step: 3, label: "3. Charity" },
              { step: 4, label: "4. Escrow" },
            ].map((item) => (
              <div
                key={item.step}
                onClick={() => {
                  if (
                    item.step === 1 ||
                    (item.step === 2 && qualityAnalysis) ||
                    (item.step === 3 && qualityAnalysis) ||
                    (item.step === 4 && selectedCharityId)
                  ) {
                    setCurrentStep(item.step as 1 | 2 | 3 | 4);
                  }
                }}
                className={`cursor-pointer rounded-[12px] p-3 text-center text-[14px] font-medium transition-colors font-body ${currentStep === item.step
                    ? "bg-[#3D5AFE] text-white"
                    : currentStep > item.step
                      ? "bg-[#F2F3F7] text-[#16161A]"
                      : "bg-white border border-[#F2F3F7] text-[#16161A]/40"
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

          {currentStep === 1 && (
            <div className="p-8 rounded-[12px] bg-white border border-[#F2F3F7] space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-subhead text-[#16161A]">What is your commitment goal?</h2>
                <p className="text-[14px] text-[#16161A]/70 font-body">
                  State clearly what you will ship or solve, and within what timeframe.
                </p>
              </div>

              <Textarea
                rows={4}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g. I want to solve 20 DSA algorithmic problems in 14 days."
              />

              <div className="space-y-2">
                <span className="text-[14px] font-medium text-[#16161A]/60 font-body">Presets:</span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_GOALS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setInputText(preset);
                        handleAnalyze(preset);
                      }}
                      className="rounded-[12px] bg-[#F2F3F7] px-3.5 py-1.5 text-[14px] text-[#16161A]/80 hover:text-[#16161A] hover:bg-[#e5e7ee] transition-colors font-body"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {isAnalyzing && (
                <div className="p-4 rounded-[12px] bg-[#3D5AFE]/5 border border-[#3D5AFE]/20 flex items-center gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-[12px] bg-[#3D5AFE] text-white flex items-center justify-center shrink-0">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[14px] font-bold text-[#16161A] font-display">
                      AI Structuring in Progress…
                    </div>
                    <p className="text-[14px] text-[#16161A]/70 font-body">
                      Extracting metrics, verifiability benchmarks, and charitable matching.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <Button
                  onClick={() => handleAnalyze()}
                  variant="primary"
                  size="md"
                  isLoading={isAnalyzing}
                  disabled={!inputText.trim()}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Analyze Goal with AI
                </Button>
              </div>
            </div>
          )}

          {currentStep === 2 && qualityAnalysis && structuredGoal && (
            <div className="p-8 rounded-[12px] bg-white border border-[#F2F3F7] space-y-6">
              <div className="space-y-1">
                <h2 className="text-subhead text-[#16161A]">Goal Verifiability Review</h2>
                <p className="text-[14px] text-[#16161A]/70 font-body">
                  AI analysis confirming quantitative targets and milestone tracking.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-[#16161A]/70 font-body">Parsed Parameters</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingParams(!isEditingParams)}
                    className="text-[14px] font-medium text-[#3D5AFE] hover:underline"
                  >
                    {isEditingParams ? "Done Editing" : "Customize Parameters"}
                  </button>
                </div>

                {!isEditingParams ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-[12px] bg-[#F2F3F7] space-y-1">
                      <div className="text-[14px] text-[#16161A]/60 font-body">Target</div>
                      <div className="text-[20px] font-bold font-display text-[#16161A]">{structuredGoal.target}</div>
                    </div>
                    <div className="p-4 rounded-[12px] bg-[#F2F3F7] space-y-1">
                      <div className="text-[14px] text-[#16161A]/60 font-body">Unit</div>
                      <div className="text-[20px] font-bold font-display text-[#00C896] capitalize">{structuredGoal.unit}</div>
                    </div>
                    <div className="p-4 rounded-[12px] bg-[#F2F3F7] space-y-1">
                      <div className="text-[14px] text-[#16161A]/60 font-body">Duration</div>
                      <div className="text-[20px] font-bold font-display text-[#16161A]">
                        {structuredGoal.timeframe_text || `${structuredGoal.duration}d`}
                      </div>
                    </div>
                    <div className="p-4 rounded-[12px] bg-[#F2F3F7] space-y-1">
                      <div className="text-[14px] text-[#16161A]/60 font-body">Evidence</div>
                      <div className="text-[14px] font-bold font-display text-[#16161A] capitalize truncate">
                        {structuredGoal.evidence === "codeforces_submissions" ? "Codeforces" : "GitHub"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-[12px] bg-[#F2F3F7] space-y-1">
                      <label className="text-[14px] text-[#16161A]/70 font-medium font-body block">Target</label>
                      <input
                        type="number"
                        min={1}
                        value={structuredGoal.target}
                        onChange={(e) => handleParamChange("target", Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full rounded-[12px] border border-[#D8DBE0] bg-white px-3 py-1.5 text-[14px] font-display font-bold text-[#16161A] focus:outline-none focus:border-[#3D5AFE]"
                      />
                    </div>
                    <div className="p-3.5 rounded-[12px] bg-[#F2F3F7] space-y-1">
                      <label className="text-[14px] text-[#16161A]/70 font-medium font-body block">Unit</label>
                      <select
                        value={structuredGoal.unit}
                        onChange={(e) => handleParamChange("unit", e.target.value)}
                        className="w-full rounded-[12px] border border-[#D8DBE0] bg-white px-2 py-1.5 text-[14px] text-[#16161A] font-body focus:outline-none focus:border-[#3D5AFE]"
                      >
                        <option value="problems">Problems</option>
                        <option value="commits">Commits</option>
                        <option value="pull_requests">Pull Requests</option>
                        <option value="projects">Projects</option>
                      </select>
                    </div>
                    <div className="p-3.5 rounded-[12px] bg-[#F2F3F7] space-y-1">
                      <label className="text-[14px] text-[#16161A]/70 font-medium font-body block">Duration</label>
                      <select
                        value={`${structuredGoal.duration}d`}
                        onChange={(e) => {
                          const days = parseInt(e.target.value.replace("d", ""), 10) || 1;
                          handleParamChange("duration", days);
                        }}
                        className="w-full rounded-[12px] border border-[#D8DBE0] bg-white px-2 py-1.5 text-[14px] text-[#16161A] font-body focus:outline-none focus:border-[#3D5AFE]"
                      >
                        <option value="3d">3 days</option>
                        <option value="7d">7 days</option>
                        <option value="14d">14 days</option>
                        <option value="30d">30 days</option>
                      </select>
                    </div>
                    <div className="p-3.5 rounded-[12px] bg-[#F2F3F7] space-y-1">
                      <label className="text-[14px] text-[#16161A]/70 font-medium font-body block">Source</label>
                      <select
                        value={structuredGoal.evidence || "github_activity"}
                        onChange={(e) => handleParamChange("evidence", e.target.value)}
                        className="w-full rounded-[12px] border border-[#D8DBE0] bg-white px-2 py-1.5 text-[14px] text-[#16161A] font-body focus:outline-none focus:border-[#3D5AFE]"
                      >
                        <option value="github_activity">GitHub Activity</option>
                        <option value="codeforces_submissions">Codeforces</option>
                      </select>
                    </div>
                  </div>
                )}

                {structuredGoal.evidence === "codeforces_submissions" ? (
                  hasCodeforces ? (
                    <div className="flex items-center gap-2 p-3.5 rounded-[12px] bg-white border border-[#00C896] text-[14px] text-[#00C896] font-body">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00C896]" />
                      <span>Linked Codeforces: @{user?.codeforces_username}</span>
                    </div>
                  ) : (
                    <div className="p-4 rounded-[12px] bg-white border-2 border-[#FF6B35] space-y-3">
                      <div className="flex items-center gap-2 text-[14px] font-bold text-[#FF6B35] font-body">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <span>Codeforces Account Not Linked</span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newCfHandle}
                          onChange={(e) => setNewCfHandle(e.target.value)}
                          placeholder="e.g. tourist"
                        />
                        <Button
                          onClick={handleConnectCodeforcesInline}
                          size="md"
                          variant="stake"
                          isLoading={isConnectingCf}
                          disabled={!newCfHandle.trim()}
                        >
                          Link
                        </Button>
                      </div>
                      {cfConnectError && (
                        <p className="text-[14px] text-[#FF3D71] font-body">{cfConnectError}</p>
                      )}
                    </div>
                  )
                ) : hasGithub ? (
                  <div className="flex items-center gap-2 p-3.5 rounded-[12px] bg-white border border-[#00C896] text-[14px] text-[#00C896] font-body">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00C896]" />
                    <span>Linked GitHub: @{user?.github_username}</span>
                  </div>
                ) : (
                  <div className="p-4 rounded-[12px] bg-white border border-[#3D5AFE] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[14px] font-medium text-[#16161A] font-body">
                      <AlertCircle className="h-5 w-5 text-[#3D5AFE] shrink-0" />
                      <span>Connect GitHub for commit polling</span>
                    </div>
                    <Button
                      onClick={handleConnectGitHubInline}
                      size="sm"
                      variant="primary"
                      isLoading={isConnectingGh}
                      leftIcon={<GithubIcon className="h-4 w-4" />}
                    >
                      Connect
                    </Button>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-between items-center border-t border-[#F2F3F7]">
                <Button
                  onClick={() => setCurrentStep(1)}
                  variant="secondary"
                  size="sm"
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                  Refine Prompt
                </Button>
                <Button
                  onClick={() => setCurrentStep(3)}
                  variant="primary"
                  size="md"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Choose Fallback Cause
                </Button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="p-8 rounded-[12px] bg-white border border-[#F2F3F7] space-y-6">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-subhead text-[#16161A]">Select Fallback Impact Cause</h2>
                  <span className="text-[14px] text-[#FF3D71] font-medium font-body">
                    {allCharities.length > 0 ? allCharities.length : charitySuggestions.length} Causes Available
                  </span>
                </div>
                <p className="text-[14px] text-[#16161A]/70 font-body">
                  If your verified deadline is missed, 100% of your pledge is transferred to this accredited non-profit.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#16161A]/40" />
                  <input
                    type="text"
                    placeholder="Search causes..."
                    value={charitySearch}
                    onChange={(e) => setCharitySearch(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-[14px] rounded-[12px] border border-[#D8DBE0] bg-white text-[#16161A] focus:outline-none focus:border-[#3D5AFE] font-body"
                  />
                </div>
                <select
                  value={charityCategoryFilter}
                  onChange={(e) => setCharityCategoryFilter(e.target.value)}
                  className="px-3.5 py-2.5 text-[14px] rounded-[12px] border border-[#D8DBE0] bg-white text-[#16161A] font-body focus:outline-none focus:border-[#3D5AFE]"
                >
                  <option value="ALL">All Categories</option>
                  {Array.from(
                    new Set(
                      (allCharities.length > 0
                        ? allCharities
                        : charitySuggestions.map((s) => s.charity).filter(Boolean)
                      )
                        .map((c) => c?.category)
                        .filter(Boolean)
                    )
                  ).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {(() => {
                  const baseList =
                    allCharities.length > 0
                      ? allCharities
                      : charitySuggestions.map((s) => s.charity!).filter(Boolean);

                  const filtered = baseList.filter((c) => {
                    const matchCat =
                      charityCategoryFilter === "ALL" || c.category === charityCategoryFilter;
                    const matchSearch =
                      !charitySearch.trim() ||
                      c.name.toLowerCase().includes(charitySearch.toLowerCase()) ||
                      c.description?.toLowerCase().includes(charitySearch.toLowerCase()) ||
                      c.category?.toLowerCase().includes(charitySearch.toLowerCase());
                    return matchCat && matchSearch;
                  });

                  if (isCharitiesLoading && filtered.length === 0) {
                    return (
                      <div className="space-y-3">
                        {[1, 2, 3].map((n) => (
                          <div key={n} className="p-5 rounded-[12px] bg-[#F2F3F7] animate-pulse h-24" />
                        ))}
                      </div>
                    );
                  }

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-10 text-[14px] text-[#16161A]/50 bg-[#F2F3F7] rounded-[12px]">
                        No causes found matching your filter.
                      </div>
                    );
                  }

                  return filtered.map((charity) => {
                    const isSelected = selectedCharityId === charity.id;
                    const suggestion = charitySuggestions.find(
                      (s) => s.charity_id === charity.id
                    );

                    return (
                      <div
                        key={charity.id}
                        onClick={() => setSelectedCharityId(charity.id)}
                        className={`cursor-pointer p-5 rounded-[12px] border-2 transition-colors space-y-2 ${isSelected
                            ? "bg-white border-[#FF3D71]"
                            : "bg-white border-[#F2F3F7] hover:border-[#FF3D71]/40"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[16px] font-bold text-[#16161A] font-display">{charity.name}</span>
                            <span className="text-[14px] px-2.5 py-0.5 rounded-[12px] bg-[#FF3D71] text-white font-medium font-body">
                              {charity.category || "Impact"}
                            </span>
                            {suggestion && (
                              <span className="text-[14px] px-2.5 py-0.5 rounded-[12px] bg-[#F2F3F7] text-[#16161A] font-medium font-body">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {charity.website_url && (
                              <a
                                href={charity.website_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[#16161A]/50 hover:text-[#16161A]"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            <div
                              className={`h-5 w-5 rounded-[12px] flex items-center justify-center text-[12px] ${isSelected
                                  ? "bg-[#FF3D71] text-white"
                                  : "border border-[#D8DBE0] text-transparent"
                                }`}
                            >
                              ✓
                            </div>
                          </div>
                        </div>

                        <p className="text-[14px] text-[#16161A]/70 leading-relaxed font-body">
                          {charity.description}
                        </p>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="pt-4 flex justify-between items-center border-t border-[#F2F3F7]">
                <Button
                  onClick={() => setCurrentStep(2)}
                  variant="secondary"
                  size="sm"
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                  Back to Review
                </Button>
                <Button
                  onClick={() => setCurrentStep(4)}
                  variant="primary"
                  size="md"
                  disabled={!selectedCharityId}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Configure Stake
                </Button>
              </div>
            </div>
          )}

          {currentStep === 4 && structuredGoal && selectedCharityId && (
            <div className="p-8 rounded-[12px] bg-white border border-[#F2F3F7] space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-subhead text-[#16161A]">Configure Escrow Stake</h2>
                <p className="text-[14px] text-[#16161A]/70 font-body">
                  100% refunded to your original payment method upon verified completion.
                </p>
              </div>

              <div className="space-y-4">
                <label className="text-[14px] font-medium text-[#16161A] font-body">
                  Pledge Amount (₹ INR)
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PLEDGE_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPledgeAmountINR(amt)}
                      className={`py-3 rounded-[12px] font-display font-bold text-[20px] transition-colors border ${pledgeAmountINR === amt
                          ? "bg-[#FF6B35] text-white border-[#FF6B35]"
                          : "bg-white text-[#16161A] border-[#F2F3F7] hover:border-[#FF6B35]"
                        }`}
                    >
                      ₹{amt.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <label htmlFor="custom-pledge-amount" className="text-[14px] font-medium text-[#16161A]/70 font-body">
                    Or enter a custom stake amount (₹ INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[16px] font-bold font-display text-[#16161A]">
                      ₹
                    </span>
                    <input
                      id="custom-pledge-amount"
                      type="number"
                      min="1"
                      value={pledgeAmountINR || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setPledgeAmountINR(isNaN(val) ? 0 : Math.max(0, val));
                      }}
                      className="w-full pl-8 pr-4 py-2.5 rounded-[12px] border border-[#D8DBE0] bg-white font-display font-bold text-[20px] text-[#FF6B35] focus:outline-none focus:border-[#FF6B35]"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-[12px] bg-[#F2F3F7] space-y-3 text-[14px] font-body">
                <div className="flex justify-between text-[#16161A]/70 pb-2 border-b border-black/10">
                  <span>Required Daily Pace</span>
                  <span className="font-display font-bold text-[#16161A]">{dailyPace} {structuredGoal.unit} / day</span>
                </div>
                <div className="flex justify-between text-[#16161A]/70 pb-2 border-b border-black/10">
                  <span>Escrow Window</span>
                  <span className="font-display font-bold text-[#16161A]">{structuredGoal.timeframe_text || `${structuredGoal.duration}d`}</span>
                </div>
                <div className="flex justify-between text-[#16161A]/70 pb-2 border-b border-black/10">
                  <span>Fallback Beneficiary</span>
                  <span className="font-bold text-[#FF3D71]">{selectedCharity?.name}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[16px] font-bold text-[#16161A] font-display">Total Stake</span>
                  <span className="text-[32px] font-bold font-display text-[#FF6B35]">
                    ₹{pledgeAmountINR.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center border-t border-[#F2F3F7]">
                <Button
                  onClick={() => setCurrentStep(3)}
                  variant="secondary"
                  size="sm"
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                  Change Cause
                </Button>
                <Button
                  onClick={handleCreateCommitment}
                  variant="stake"
                  size="lg"
                  isLoading={isCreating}
                  disabled={
                    (!hasCodeforces && structuredGoal.evidence === "codeforces_submissions") ||
                    (!hasGithub && structuredGoal.evidence === "github_activity")
                  }
                  rightIcon={<Lock className="h-4 w-4" />}
                >
                  Authorize Escrow &amp; Create Commitment
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
