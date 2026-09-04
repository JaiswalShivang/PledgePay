"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient, HealthResponse } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Target } from "lucide-react";

const SAMPLE_GOALS = [
  "Solve 20 DSA problems in 7 days",
  "Merge 10 pull requests in 14 days",
  "Ship 3 microservices in 30 days",
];

const BENEFICIARY_CAUSES = [
  {
    name: "Educate Girls India",
    category: "Education",
    desc: "Mobilizes rural communities for primary education across underserved districts.",
    color: "#1E4FD8",
  },
  {
    name: "Akshaya Patra Foundation",
    category: "Poverty Relief",
    desc: "Eliminates classroom hunger through mid-day school meal programs.",
    color: "#0A6640",
  },
  {
    name: "Sankara Eye Foundation",
    category: "Healthcare",
    desc: "Provides free eye surgeries to eliminate curable blindness.",
    color: "#C44B0A",
  },
  {
    name: "FreeCodeCamp Foundation",
    category: "Open Education",
    desc: "Creates free, open-source technical education accessible worldwide.",
    color: "#6B7485",
  },
];

const PIPELINE_STEPS = [
  {
    num: "1",
    label: "Structure",
    desc: "AI parses your natural language goal into quantitative parameters and an evidence rule.",
    color: "#1E4FD8",
    bg: "rgba(30,79,216,0.12)",
  },
  {
    num: "2",
    label: "Escrow",
    desc: "Deposit your stake and pair your goal with an accredited non-profit beneficiary.",
    color: "#0A6640",
    bg: "rgba(10,102,64,0.12)",
  },
  {
    num: "3",
    label: "Verify",
    desc: "Commits and submissions are polled automatically; AI confirms relevance daily.",
    color: "#1E4FD8",
    bg: "rgba(30,79,216,0.12)",
  },
  {
    num: "4",
    label: "Settle",
    desc: "Hit your target → full refund. Miss it → stake routes to your chosen charity.",
    color: "#C44B0A",
    bg: "rgba(196,75,10,0.12)",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [goalText, setGoalText] = useState("");

  const { data: health } = useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: () => apiClient.getHealth(),
    refetchInterval: 15000,
  });

  const handleStartWithGoal = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      goalText.trim()
        ? `/commitments/new?goal=${encodeURIComponent(goalText.trim())}`
        : "/commitments/new"
    );
  };

  return (
    <div className="w-full flex flex-col">
      {/* ── HERO — full-bleed dark ───────────────────────────────────────── */}
      <section
        className="w-full px-4 pt-20 pb-24 flex flex-col items-center text-center space-y-8"
        style={{ backgroundColor: "#0F1117" }}
      >
        {/* Eyebrow */}
        <div
          className="text-[11px] font-medium tracking-[0.18em] uppercase"
          style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-data)" }}
        >
          Stake · Verify · Settle
        </div>

        {/* Headline */}
        <div className="space-y-3 max-w-2xl">
          <h1
            className="text-4xl sm:text-6xl font-bold text-white leading-[1.08] tracking-tight"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
          >
            Put real money
            <br />
            behind your{" "}
            <span style={{ color: "#0A6640" }}>code goals.</span>
          </h1>
          <p
            className="text-base sm:text-lg leading-relaxed max-w-lg mx-auto"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Lock stakes into automated escrow. Verified daily from GitHub and Codeforces activity. Miss your target? Your pledge funds a verified charity.
          </p>
        </div>

        {/* Goal Input */}
        <form
          onSubmit={handleStartWithGoal}
          className="w-full max-w-xl space-y-3"
        >
          <div
            className="flex flex-col sm:flex-row gap-2 p-2 rounded-[12px]"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="relative flex-1 flex items-center">
              <Target className="absolute left-3 h-4 w-4 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
              <input
                id="hero-goal-input"
                type="text"
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                placeholder="e.g. Solve 20 DSA problems in 7 days"
                className="w-full rounded-[8px] py-2.5 pl-9 pr-3 text-sm text-white bg-transparent placeholder:text-[rgba(255,255,255,0.3)] outline-none"
                style={{ fontFamily: "var(--font-body, Inter, sans-serif)" }}
              />
            </div>
            <button
              type="submit"
              id="hero-structure-btn"
              className="flex items-center justify-center gap-2 h-10 px-5 text-sm font-semibold text-white rounded-[8px] shrink-0 transition-all"
              style={{
                backgroundColor: "#0A6640",
                fontFamily: "var(--font-body, Inter, sans-serif)",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#085535")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#0A6640")}
            >
              Structure Goal
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SAMPLE_GOALS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setGoalText(s)}
                className="text-[11px] px-2.5 py-1 rounded-full transition-colors"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.55)",
                  fontFamily: "var(--font-body, Inter, sans-serif)",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "white";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.25)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </form>

        {/* Auth CTAs */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              id="hero-dashboard-link"
              className="flex items-center gap-2 h-10 px-6 text-sm font-semibold text-white rounded-[8px] transition-all"
              style={{ backgroundColor: "#0A6640", fontFamily: "var(--font-body)" }}
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/commitments/new"
                id="hero-create-link"
                className="flex items-center gap-2 h-10 px-6 text-sm font-semibold text-white rounded-[8px] transition-all"
                style={{ backgroundColor: "#0A6640", fontFamily: "var(--font-body)" }}
              >
                Create Commitment
              </Link>
              <Link
                href="/login"
                id="hero-signin-link"
                className="flex items-center h-10 px-5 text-sm font-medium rounded-[8px] transition-colors"
                style={{
                  color: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  fontFamily: "var(--font-body)",
                }}
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS — numbered timeline ───────────────────────────── */}
      <section
        className="w-full px-4 py-16"
        style={{ backgroundColor: "#F5F6F8", borderTop: "1px solid #E8EAED" }}
      >
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="space-y-1">
            <h2
              className="text-2xl font-bold text-[#111318]"
              style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
            >
              How it works
            </h2>
            <p className="text-sm text-[#4B5263]">
              A closed-loop protocol combining code proof, AI analysis, and escrow settlement.
            </p>
          </div>

          {/* Horizontal pipeline — desktop / stacked — mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-[12px] overflow-hidden"
            style={{ border: "1px solid #E8EAED" }}
          >
            {PIPELINE_STEPS.map((step, i) => (
              <div
                key={step.label}
                className="relative p-6 space-y-3 bg-white"
                style={{
                  borderRight: i < PIPELINE_STEPS.length - 1 ? "1px solid #E8EAED" : undefined,
                }}
              >
                {/* Step number */}
                <div
                  className="h-9 w-9 rounded-[8px] flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: step.bg,
                    color: step.color,
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {step.num}
                </div>
                <div className="space-y-1">
                  <h3
                    className="text-sm font-semibold text-[#111318]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {step.label}
                  </h3>
                  <p className="text-xs text-[#4B5263] leading-relaxed">{step.desc}</p>
                </div>
                {/* Connector arrow on desktop */}
                {i < PIPELINE_STEPS.length - 1 && (
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-5 w-5 bg-white border border-[#E8EAED] rounded-full hidden lg:flex items-center justify-center z-10"
                    style={{ color: "#B0B7C3" }}
                  >
                    <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHARITY CAUSES — horizontal scroll cards ─────────────────── */}
      <section
        className="w-full px-4 py-16"
        style={{ backgroundColor: "#FFFFFF", borderTop: "1px solid #E8EAED" }}
      >
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2
                className="text-2xl font-bold text-[#111318]"
                style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
              >
                Verified Beneficiary Causes
              </h2>
              <p className="text-sm text-[#4B5263]">
                Every commitment is backed by an accredited non-profit. You choose before staking.
              </p>
            </div>
            <Link
              href="/commitments/new"
              id="causes-view-all"
              className="text-xs font-medium text-[#0A6640] hover:underline underline-offset-4 shrink-0"
            >
              View all causes →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BENEFICIARY_CAUSES.map((cause) => (
              <div
                key={cause.name}
                className="flex gap-4 p-5 rounded-[10px] bg-white"
                style={{
                  border: "1px solid #E8EAED",
                  borderLeft: `4px solid ${cause.color}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                }}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-semibold text-[#111318]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {cause.name}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-[4px] font-medium"
                      style={{
                        backgroundColor: `${cause.color}18`,
                        color: cause.color,
                      }}
                    >
                      {cause.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#4B5263] leading-relaxed">{cause.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATUS BAR ───────────────────────────────────────────────────── */}
      <section
        className="w-full px-4 py-5"
        style={{ backgroundColor: "#0F1117", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: health?.status === "ok" ? "#0A6640" : "#C44B0A" }}
            />
            <span
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-data)" }}
            >
              {health?.status === "ok" ? "All systems operational" : "System degraded"}
            </span>
          </div>
          <span
            className="text-[11px]"
            style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-data)" }}
          >
            Next.js 16 + Go/Gin · PostgreSQL · Razorpay Escrow
          </span>
        </div>
      </section>
    </div>
  );
}
