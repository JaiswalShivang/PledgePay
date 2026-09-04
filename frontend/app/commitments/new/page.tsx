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
  Alert,
  Textarea,
} from "@/components/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
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

  // All charities query & filter
  const { data: allCharitiesData } = useQuery({
    queryKey: ["charities"],
    queryFn: () => apiClient.charities.getAll(),
  });
  const allCharities = allCharitiesData?.charities || [];
  const [charitySearch, setCharitySearch] = useState("");
  const [charityCategoryFilter, setCharityCategoryFilter] = useState("ALL");

  // Inline integration state
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


            {/* Extracted Parameters */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-[#52525B] uppercase tracking-wider">
                  Parsed Parameters
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingParams(!isEditingParams)}
                  className="text-xs font-medium text-[#047857] hover:underline"
                >
                  {isEditingParams ? "✓ Done Editing" : "Customize Parameters"}
                </button>
              </div>

              {!isEditingParams ? (
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
                    <div className="font-bold font-numeric text-[#18181B] mt-0.5">
                      {structuredGoal.timeframe_text || `${structuredGoal.duration} ${structuredGoal.duration === 1 ? "day" : "days"}`}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#E4E7EB]">
                    <div className="text-[#71717A]">Evidence</div>
                    <div className="font-medium text-[#18181B] mt-0.5 capitalize">
                      {structuredGoal.evidence === "codeforces_submissions"
                        ? "Codeforces Submissions"
                        : structuredGoal.evidence === "github_activity"
                          ? "GitHub Activity"
                          : (structuredGoal.evidence || "GitHub Activity").replace(/_/g, " ")}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#047857] space-y-1">
                    <label className="text-[11px] text-[#71717A] block font-medium">Target Count</label>
                    <input
                      type="number"
                      min={1}
                      value={structuredGoal.target}
                      onChange={(e) => handleParamChange("target", Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-[4px] border border-[#D1D5DB] px-2 py-1 text-xs font-numeric font-bold text-[#18181B] bg-white focus:outline-none focus:border-[#047857]"
                    />
                  </div>

                  <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#047857] space-y-1">
                    <label className="text-[11px] text-[#71717A] block font-medium">Metric Unit</label>
                    <select
                      value={structuredGoal.unit}
                      onChange={(e) => handleParamChange("unit", e.target.value)}
                      className="w-full rounded-[4px] border border-[#D1D5DB] px-2 py-1 text-xs font-medium text-[#18181B] bg-white focus:outline-none focus:border-[#047857]"
                    >
                      <option value="pages">Pages (Document Proof)</option>
                      <option value="words">Words</option>
                      <option value="problems">Problems (DSA)</option>
                      <option value="commits">Commits</option>
                      <option value="pull_requests">Pull Requests</option>
                      <option value="projects">Projects</option>
                    </select>
                  </div>

                  <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#047857] space-y-1">
                    <label className="text-[11px] text-[#71717A] block font-medium">Duration / Timeframe</label>
                    <select
                      value={
                        structuredGoal.duration_minutes === 1
                          ? "1m"
                          : structuredGoal.duration_minutes === 2
                            ? "2m"
                            : structuredGoal.duration_minutes === 5
                              ? "5m"
                              : structuredGoal.duration_minutes === 10
                                ? "10m"
                                : `${structuredGoal.duration}d`
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "1m") {
                          setStructuredGoal({
                            ...structuredGoal,
                            duration: 1,
                            duration_minutes: 1,
                            timeframe_text: "1 minute",
                          });
                        } else if (val === "2m") {
                          setStructuredGoal({
                            ...structuredGoal,
                            duration: 1,
                            duration_minutes: 2,
                            timeframe_text: "2 minutes",
                          });
                        } else if (val === "5m") {
                          setStructuredGoal({
                            ...structuredGoal,
                            duration: 1,
                            duration_minutes: 5,
                            timeframe_text: "5 minutes",
                          });
                        } else if (val === "10m") {
                          setStructuredGoal({
                            ...structuredGoal,
                            duration: 1,
                            duration_minutes: 10,
                            timeframe_text: "10 minutes",
                          });
                        } else {
                          const days = parseInt(val.replace("d", ""), 10) || 1;
                          setStructuredGoal({
                            ...structuredGoal,
                            duration: days,
                            duration_minutes: undefined,
                            timeframe_text: `${days} ${days === 1 ? "day" : "days"}`,
                          });
                        }
                      }}
                      className="w-full rounded-[4px] border border-[#D1D5DB] px-2 py-1 text-xs font-medium text-[#18181B] bg-white focus:outline-none focus:border-[#047857]"
                    >
                      <option value="1m">1 minute (Demo Sprint)</option>
                      <option value="2m">2 minutes (Demo Sprint)</option>
                      <option value="5m">5 minutes (Quick Sprint)</option>
                      <option value="10m">10 minutes</option>
                      <option value="1d">1 day</option>
                      <option value="3d">3 days</option>
                      <option value="7d">7 days (1 week)</option>
                      <option value="14d">14 days (2 weeks)</option>
                      <option value="30d">30 days (1 month)</option>
                    </select>
                  </div>

                  <div className="p-2.5 rounded-[6px] bg-[#F8F9FA] border border-[#047857] space-y-1">
                    <label className="text-[11px] text-[#71717A] block font-medium">Evidence Source</label>
                    <select
                      value={structuredGoal.evidence || "github_activity"}
                      onChange={(e) => handleParamChange("evidence", e.target.value)}
                      className="w-full rounded-[4px] border border-[#D1D5DB] px-2 py-1 text-xs font-medium text-[#18181B] bg-white focus:outline-none focus:border-[#047857]"
                    >
                      <option value="github_activity">GitHub Activity</option>
                      <option value="codeforces_submissions">Codeforces Submissions</option>
                    </select>
                  </div>
                </div>
              )}

              {structuredGoal.evidence === "codeforces_submissions" ? (
                hasCodeforces ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-[6px] bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#166534]">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
                    <span>
                      Codeforces Account Linked: <strong className="font-semibold">@{user?.codeforces_username}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-[6px] bg-[#FFF7ED] border border-[#FED7AA] space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#C2410C]">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Codeforces Account Not Linked</span>
                    </div>
                    <p className="text-[11px] text-[#9A3412]">
                      To verify problem submissions and count toward your goal, enter your Codeforces handle below:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCfHandle}
                        onChange={(e) => setNewCfHandle(e.target.value)}
                        placeholder="e.g. tourist"
                        className="flex-1 rounded-[4px] border border-[#FED7AA] bg-white px-2.5 py-1 text-xs text-[#18181B] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#047857]"
                      />
                      <Button
                        onClick={handleConnectCodeforcesInline}
                        size="sm"
                        variant="primary"
                        isLoading={isConnectingCf}
                        disabled={!newCfHandle.trim()}
                      >
                        Verify &amp; Link
                      </Button>
                    </div>
                    {cfConnectError && (
                      <p className="text-[10px] text-[#DC2626]">{cfConnectError}</p>
                    )}
                  </div>
                )
              ) : hasGithub ? (
                <div className="flex items-center gap-2 p-2.5 rounded-[6px] bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#166534]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
                  <span>
                    GitHub Account Linked: <strong className="font-semibold">@{user?.github_username}</strong>
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-[6px] bg-[#EFF6FF] border border-[#BFDBFE] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#1D4ED8]">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>GitHub Account Not Linked</span>
                    </div>
                    <Button
                      onClick={handleConnectGitHubInline}
                      size="sm"
                      variant="secondary"
                      isLoading={isConnectingGh}
                      leftIcon={<GithubIcon className="h-3.5 w-3.5" />}
                    >
                      Connect GitHub
                    </Button>
                  </div>
                  <p className="text-[11px] text-[#1E40AF]">
                    Connect your GitHub account so commits and pull requests can be automatically verified.
                  </p>
                </div>
              )}
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
        {currentStep === 3 && (
          <div className="p-5 rounded-[8px] bg-white border border-[#E4E7EB] space-y-5">
            <div className="space-y-0.5 pb-3 border-b border-[#E4E7EB]">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#18181B]">Select Fallback Impact Cause</h2>
                <span className="text-[11px] font-medium text-[#71717A]">
                  {allCharities.length > 0 ? allCharities.length : charitySuggestions.length} Causes Available
                </span>
              </div>
              <p className="text-xs text-[#52525B]">
                If your verified deadline is missed, 100% of your pledge is transferred to this non-profit cause.
              </p>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                <input
                  type="text"
                  placeholder="Search cause by name, mission, or keyword..."
                  value={charitySearch}
                  onChange={(e) => setCharitySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[6px] border border-[#E4E7EB] bg-[#F8F9FA] text-[#18181B] focus:outline-none focus:border-[#047857] focus:bg-white"
                />
              </div>

              <select
                value={charityCategoryFilter}
                onChange={(e) => setCharityCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-[6px] border border-[#E4E7EB] bg-white text-[#18181B] focus:outline-none focus:border-[#047857]"
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

            {/* Charity Cards List */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
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

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-xs text-[#71717A] bg-[#F8F9FA] rounded-[6px] border border-[#E4E7EB]">
                      No charities found matching &quot;{charitySearch}&quot;. Try a different term or category.
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
                      className={`cursor-pointer p-3.5 rounded-[6px] border transition-colors space-y-1.5 ${
                        isSelected
                          ? "bg-[#ECFDF5] border-[#047857]"
                          : "bg-white border-[#E4E7EB] hover:border-[#D1D5DB]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-[#18181B]">{charity.name}</span>
                          <Badge variant="default" size="sm">
                            {charity.category || "Impact"}
                          </Badge>
                          {suggestion && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#047857]/10 text-[#047857] border border-[#047857]/20">
                              ★ AI Recommended
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
                              className="text-[#71717A] hover:text-[#18181B]"
                              title="Visit website"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <div
                            className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${
                              isSelected
                                ? "bg-[#047857] text-white"
                                : "border border-[#D1D5DB] text-transparent"
                            }`}
                          >
                            ✓
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-[#52525B] leading-relaxed">
                        {charity.description}
                      </p>

                      {suggestion && (
                        <div className="text-[11px] text-[#047857] pt-0.5 font-medium">
                          <span>Why this matches: {suggestion.rationale}</span>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
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

            <div className="space-y-3">
              <label className="text-xs font-medium text-[#52525B]">
                Pledge Amount (₹ INR)
              </label>

              {/* Quick Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLEDGE_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPledgeAmountINR(amt)}
                    className={`py-2 rounded-[6px] border font-numeric font-medium text-sm transition-colors ${
                      pledgeAmountINR === amt
                        ? "bg-[#047857] text-white border-[#047857]"
                        : "bg-white text-[#18181B] border-[#E4E7EB] hover:border-[#D1D5DB]"
                    }`}
                  >
                    ₹{amt.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>

              {/* Custom Input Field */}
              <div className="space-y-1 pt-1">
                <label htmlFor="custom-pledge-amount" className="text-[11px] font-medium text-[#71717A]">
                  Or enter your own custom amount (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#71717A]">
                    ₹
                  </span>
                  <input
                    id="custom-pledge-amount"
                    type="number"
                    min="1"
                    max="1000000"
                    step="1"
                    placeholder="Enter any amount, e.g. 250, 750, 1500, 10000"
                    value={pledgeAmountINR || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setPledgeAmountINR(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    className="w-full pl-8 pr-4 py-2 rounded-[6px] border border-[#E4E7EB] bg-white font-numeric font-medium text-sm text-[#18181B] focus:outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857]"
                  />
                </div>
                <p className="text-[11px] text-[#71717A]">
                  Enter any custom stake according to your choice. 100% refunded when your goal is verified.
                </p>
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
                <span className="font-numeric font-medium text-[#18181B]">{structuredGoal.timeframe_text || `${structuredGoal.duration} ${structuredGoal.duration === 1 ? "day" : "days"}`}</span>
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

            {/* Pre-creation Account Verification Warning */}
            {!hasCodeforces && structuredGoal.evidence === "codeforces_submissions" && (
              <div className="p-3.5 rounded-[6px] bg-[#FFF7ED] border border-[#FED7AA] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#C2410C]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Codeforces Handle Required Before Creating Pledge</span>
                </div>
                <p className="text-[11px] text-[#9A3412]">
                  Link your Codeforces handle so our automated protocol can verify your submissions:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCfHandle}
                    onChange={(e) => setNewCfHandle(e.target.value)}
                    placeholder="e.g. tourist"
                    className="flex-1 rounded-[4px] border border-[#FED7AA] bg-white px-2.5 py-1 text-xs text-[#18181B] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#047857]"
                  />
                  <Button
                    onClick={handleConnectCodeforcesInline}
                    size="sm"
                    variant="primary"
                    isLoading={isConnectingCf}
                    disabled={!newCfHandle.trim()}
                  >
                    Link Handle
                  </Button>
                </div>
                {cfConnectError && (
                  <p className="text-[10px] text-[#DC2626]">{cfConnectError}</p>
                )}
              </div>
            )}

            {!hasGithub && structuredGoal.evidence === "github_activity" && (
              <div className="p-3.5 rounded-[6px] bg-[#EFF6FF] border border-[#BFDBFE] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1D4ED8]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>GitHub Account Required</span>
                  </div>
                  <Button
                    onClick={handleConnectGitHubInline}
                    size="sm"
                    variant="secondary"
                    isLoading={isConnectingGh}
                    leftIcon={<GithubIcon className="h-3.5 w-3.5" />}
                  >
                    Connect GitHub
                  </Button>
                </div>
                <p className="text-[11px] text-[#1E40AF]">
                  Please connect your GitHub account so commits and PRs can be automatically verified.
                </p>
              </div>
            )}

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
                disabled={
                  (!hasCodeforces && structuredGoal.evidence === "codeforces_submissions") ||
                  (!hasGithub && structuredGoal.evidence === "github_activity")
                }
              >
                Authorize Escrow &amp; Create Commitment
              </Button>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
