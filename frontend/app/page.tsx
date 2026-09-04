"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient, HealthResponse } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Target, Heart, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SAMPLE_GOALS = [
  "Solve 20 DSA problems in 7 days",
  "Merge 10 pull requests in 14 days",
  "Ship 3 microservices in 30 days",
];

const BENEFICIARY_CAUSES = [
  {
    name: "Educate Girls India",
    category: "Education",
    desc: "Mobilizes rural communities for primary schooling across underserved districts.",
    impact: "Provides 1 year of girl-child schooling per ₹2,500 pledge",
  },
  {
    name: "Akshaya Patra Foundation",
    category: "Poverty Relief",
    desc: "Eliminates classroom hunger through wholesome mid-day school meal programs.",
    impact: "Sponsors 1,000 mid-day meals for primary students",
  },
  {
    name: "Sankara Eye Foundation",
    category: "Healthcare",
    desc: "Performs free corrective eye surgeries to eliminate curable blindness.",
    impact: "Funds complete sight restoration surgery for elderly patients",
  },
  {
    name: "FreeCodeCamp Foundation",
    category: "Open Education",
    desc: "Creates accessible open-source programming education worldwide.",
    impact: "Supports curriculum servers serving 100,000+ coders daily",
  },
];

const PIPELINE_STEPS = [
  {
    num: "1",
    label: "Goal",
    desc: "Input your natural language milestone. AI structures quantified targets and verifiable evidence rules.",
    accent: "#3D5AFE",
  },
  {
    num: "2",
    label: "Escrow",
    desc: "Deposit your chosen stake into automated escrow and select a verified beneficiary charity.",
    accent: "#FF6B35",
  },
  {
    num: "3",
    label: "Verify",
    desc: "GitHub commits and Codeforces submissions are polled daily. AI validates code authenticity.",
    accent: "#00C896",
  },
  {
    num: "4",
    label: "Settle",
    desc: "Achieve target → 100% principal refunded. Miss deadline → funds transfer directly to your chosen charity.",
    accent: "#FF3D71",
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
    <div className="w-full flex flex-col bg-white">
      <section className="w-full px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 max-w-6xl mx-auto flex flex-col items-center text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-[#F2F3F7] text-[#16161A] text-[14px] font-medium font-body border border-[#F2F3F7]">
          <span className="text-[#FF6B35] font-bold">Stake</span>
          <span className="text-[#16161A]/40">&bull;</span>
          <span className="text-[#00C896] font-bold">Verify</span>
          <span className="text-[#16161A]/40">&bull;</span>
          <span className="text-[#FF3D71] font-bold">Settle</span>
        </div>

        <div className="space-y-4 max-w-3xl">
          <h1 className="text-hero text-[#16161A]">
            Put real money behind your code goals.
          </h1>
          <p className="text-[20px] text-[#16161A]/80 font-body leading-relaxed max-w-2xl mx-auto">
            Stake money into automated escrow. Verified automatically by GitHub activity and AI.
            Hit your target for a 100% refund — or fund a verified charity.
          </p>
        </div>

        <form
          onSubmit={handleStartWithGoal}
          className="w-full max-w-xl space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-[12px] bg-[#F2F3F7] border border-[#F2F3F7]">
            <div className="relative flex-1 flex items-center">
              <Target className="absolute left-3.5 h-5 w-5 shrink-0 text-[#16161A]/40" />
              <input
                id="hero-goal-input"
                type="text"
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                placeholder="e.g. Solve 20 DSA problems in 7 days"
                className="w-full rounded-[12px] py-3 pl-11 pr-3 text-[14px] text-[#16161A] bg-white placeholder:text-[#16161A]/40 outline-none border border-transparent focus:border-[#3D5AFE]"
              />
            </div>
            <Button
              type="submit"
              id="hero-structure-btn"
              variant="primary"
              size="md"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Structure Goal
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {SAMPLE_GOALS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setGoalText(s)}
                className="text-[14px] px-3 py-1.5 rounded-[12px] bg-[#F2F3F7] text-[#16161A]/70 hover:text-[#16161A] hover:bg-[#e5e7ee] transition-colors font-body"
              >
                {s}
              </button>
            ))}
          </div>
        </form>

        <div className="flex items-center gap-3 pt-2">
          {isAuthenticated ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push("/dashboard")}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Go to Dashboard
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push("/commitments/new")}
              >
                Create Commitment
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push("/login")}
              >
                Sign In
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="w-full px-4 py-20 bg-[#F2F3F7] border-t border-[#F2F3F7]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="space-y-2 text-center max-w-2xl mx-auto">
            <h2 className="text-section text-[#16161A]">
              How it works
            </h2>
            <p className="text-[16px] text-[#16161A]/70 font-body">
              The closed-loop protocol combining stake deposits, continuous code proof, and automated settlement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PIPELINE_STEPS.map((step) => (
              <div
                key={step.num}
                className="p-6 space-y-4 bg-white rounded-[12px] border border-[#F2F3F7] flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div
                    className="h-10 w-10 rounded-[12px] flex items-center justify-center text-[16px] font-bold text-white font-display"
                    style={{ backgroundColor: step.accent }}
                  >
                    {step.num}
                  </div>
                  <h3 className="text-subhead text-[#16161A]">
                    {step.label}
                  </h3>
                  <p className="text-[14px] text-[#16161A]/70 leading-relaxed font-body">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full px-4 py-20 bg-white border-t border-[#F2F3F7]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[12px] bg-[#FF3D71]/10 text-[#FF3D71] text-[14px] font-bold font-body">
                <Heart className="h-4 w-4" />
                <span>Verified Beneficiary Causes</span>
              </div>
              <h2 className="text-section text-[#16161A]">
                Missed targets create real-world impact.
              </h2>
              <p className="text-[16px] text-[#16161A]/70 font-body max-w-xl">
                Every commitment is paired with an accredited cause. If you fail to hit your milestone, your entire stake transfers directly to their vetted relief account.
              </p>
            </div>
            <Link
              href="/commitments/new"
              className="text-[16px] font-bold text-[#FF3D71] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>Explore all partners</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BENEFICIARY_CAUSES.map((cause) => (
              <div
                key={cause.name}
                className="p-8 rounded-[12px] bg-white border-2 border-[#FF3D71] flex flex-col justify-between space-y-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] px-3 py-1 rounded-[12px] bg-[#FF3D71] text-white font-bold font-body">
                      {cause.category}
                    </span>
                    <Heart className="h-5 w-5 text-[#FF3D71]" />
                  </div>
                  <h3 className="text-subhead text-[#16161A]">
                    {cause.name}
                  </h3>
                  <p className="text-[14px] text-[#16161A]/70 leading-relaxed font-body">
                    {cause.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#F2F3F7] flex items-center gap-2 text-[14px] font-medium text-[#16161A] font-body">
                  <CheckCircle2 className="h-4 w-4 text-[#00C896] shrink-0" />
                  <span>{cause.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full px-4 py-6 bg-[#16161A] text-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[14px] font-body">
          <div className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 rounded-[12px] shrink-0"
              style={{ backgroundColor: health?.status === "ok" ? "#00C896" : "#FF6B35" }}
            />
            <span className="text-white/80">
              {health?.status === "ok" ? "Protocol status: All services operational" : "Protocol status: Degraded"}
            </span>
          </div>
          <span className="text-white/50">
            Automated verification via GitHub API &middot; Settled on Razorpay Escrow
          </span>
        </div>
      </section>
    </div>
  );
}
