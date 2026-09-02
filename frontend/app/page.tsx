"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient, HealthResponse } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import {
  Button,
  Card,
  Badge,
} from "@/components/ui";
import {
  ShieldCheck,
  Target
} from "lucide-react";

const SAMPLE_GOALS = [
  "Solve 20 DSA problems in 20 days",
  "Merge 10 pull requests in 14 days",
  "Ship 3 microservices in 30 days",
];

const BENEFICIARY_CAUSES = [
  {
    name: "Educate Girls India",
    category: "Education",
    desc: "Mobilizes rural communities for primary education across underserved districts.",
  },
  {
    name: "Akshaya Patra Foundation",
    category: "Poverty Relief",
    desc: "Eliminates classroom hunger through mid-day school meal programs.",
  },
  {
    name: "Sankara Eye Foundation",
    category: "Healthcare",
    desc: "Provides free eye surgeries to eliminate curable blindness.",
  },
  {
    name: "FreeCodeCamp Foundation",
    category: "Open Education",
    desc: "Creates free, open-source technical education accessible worldwide.",
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
    if (goalText.trim()) {
      router.push(`/commitments/new?goal=${encodeURIComponent(goalText.trim())}`);
    } else {
      router.push("/commitments/new");
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. HERO SECTION */}
      <section className="w-full max-w-4xl px-4 pt-16 pb-14 text-center space-y-6">
        <div className="inline-flex">
          <Badge variant="active" size="md" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
            Proof-of-Commitment Escrow
          </Badge>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#18181B] leading-tight">
            Stake real funds on your code goals. <br />
            <span className="text-[#047857]">Prove with commits.</span> Donate on miss.
          </h1>
          <p className="text-sm sm:text-base text-[#52525B] max-w-xl mx-auto leading-relaxed">
            Lock financial stakes into automated escrow. Verify daily progress directly from GitHub activity. If you miss your target, your pledge routes directly to a verified charity.
          </p>
        </div>

        {/* Goal Input Form */}
        <div className="max-w-xl mx-auto pt-2">
          <Card variant="default" padding="sm" className="p-2">
            <form onSubmit={handleStartWithGoal} className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full flex items-center">
                <Target className="absolute left-3 h-4 w-4 text-[#71717A] pointer-events-none" />
                <input
                  type="text"
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  placeholder="e.g. Solve 20 DSA problems in 20 days"
                  className="w-full rounded-[6px] bg-white border border-[#E4E7EB] py-2 pl-9 pr-3 text-sm text-[#18181B] placeholder-[#9CA3AF] outline-none focus:border-[#047857]"
                />
              </div>
              <Button type="submit" variant="primary" size="md" className="w-full sm:w-auto shrink-0">
                Structure Goal
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5 pt-2 pb-1 px-1">
              <span className="text-xs text-[#71717A] mr-1">Presets:</span>
              {SAMPLE_GOALS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setGoalText(sample)}
                  className="rounded-[4px] border border-[#E4E7EB] bg-[#F8F9FA] px-2 py-0.5 text-xs text-[#52525B] hover:text-[#18181B] hover:border-[#D1D5DB] transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Auth CTA */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button variant="primary" size="lg">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/commitments/new">
                <Button variant="primary" size="lg">
                  Create Commitment
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* 2. THE 4-STEP PIPELINE */}
      <section className="w-full max-w-4xl px-4 py-12 space-y-6 border-t border-[#E4E7EB]">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-[#18181B]">How it works</h2>
          <p className="text-xs text-[#52525B]">
            A closed-loop protocol combining code proof, AI analysis, and escrow settlement.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-[8px] bg-white border border-[#E4E7EB] space-y-2">
            <div className="text-xs font-semibold text-[#047857]">1. Structure</div>
            <h3 className="text-sm font-semibold text-[#18181B]">Define Milestone</h3>
            <p className="text-xs text-[#52525B] leading-relaxed">
              AI parses your natural language goal into quantitative parameters and an evidence rule.
            </p>
          </div>

          <div className="p-4 rounded-[8px] bg-white border border-[#E4E7EB] space-y-2">
            <div className="text-xs font-semibold text-[#047857]">2. Escrow</div>
            <h3 className="text-sm font-semibold text-[#18181B]">Lock Stake</h3>
            <p className="text-xs text-[#52525B] leading-relaxed">
              Deposit your stake into escrow and pair your goal with an accredited non-profit.
            </p>
          </div>

          <div className="p-4 rounded-[8px] bg-white border border-[#E4E7EB] space-y-2">
            <div className="text-xs font-semibold text-[#047857]">3. Verify</div>
            <h3 className="text-sm font-semibold text-[#18181B]">Sync Code Activity</h3>
            <p className="text-xs text-[#52525B] leading-relaxed">
              Commits and PRs are polled automatically from your linked GitHub repository.
            </p>
          </div>

          <div className="p-4 rounded-[8px] bg-white border border-[#E4E7EB] space-y-2">
            <div className="text-xs font-semibold text-[#047857]">4. Settle</div>
            <h3 className="text-sm font-semibold text-[#18181B]">Refund or Donate</h3>
            <p className="text-xs text-[#52525B] leading-relaxed">
              Complete your goal for a full refund; missed deadlines route to your chosen charity.
            </p>
          </div>
        </div>
      </section>

      {/* 3. CHARITY CAUSES */}
      <section className="w-full max-w-4xl px-4 py-12 space-y-6 border-t border-[#E4E7EB]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-[#18181B]">Verified Beneficiary Causes</h2>
            <p className="text-xs text-[#52525B]">
              Every commitment is backed by an accredited non-profit organization.
            </p>
          </div>

          <Link href="/commitments/new">
            <Button variant="outline" size="sm">
              View All Causes
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BENEFICIARY_CAUSES.map((cause) => (
            <div key={cause.name} className="p-4 rounded-[8px] bg-white border border-[#E4E7EB] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#18181B]">{cause.name}</span>
                <Badge variant="default" size="sm">
                  {cause.category}
                </Badge>
              </div>
              <p className="text-xs text-[#52525B] leading-relaxed">
                {cause.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. TELEMETRY STATUS BAR */}
      <section className="w-full max-w-4xl px-4 pb-14">
        <div className="p-3.5 rounded-[8px] bg-white border border-[#E4E7EB] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#52525B]">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${health?.status === "ok" ? "bg-[#15803D]" : "bg-red-500"
                }`}
            />
            <span>System Status: Go API & Database Operational</span>
          </div>

          <span className="font-numeric text-[11px] text-[#71717A]">
            Next.js + Go/Gin • PostgreSQL • Razorpay Escrow
          </span>
        </div>
      </section>
    </div>
  );
}
