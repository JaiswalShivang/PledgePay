"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient, HealthResponse } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Target,
  Zap,
  Bot,
  Heart,
  GitBranch,
  Cpu,
  Lock,
} from "lucide-react";
import Image from "next/image";

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

  const sampleGoals = [
    "Solve 20 DSA algorithmic challenges in 20 days",
    "Merge 10 open-source pull requests in 14 days",
    "Build and ship 3 production microservices in Go in 30 days",
  ];

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-10 -z-10 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-80 right-10 -z-10 h-80 w-80 rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      <section className="w-full max-w-6xl px-4 pt-12 pb-20 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-xs font-semibold text-emerald-300 shadow-lg shadow-emerald-500/10 animate-fade-in">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>Proof-of-Commitment Escrow • Real Stakes for Real Impact</span>
        </div>

        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
            Stake on your goals. <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Prove with code.
            </span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Turn ambitious targets into verifiable milestones. Lock financial stakes in automated escrow, verify daily progress from GitHub activity, and let AI keep you on track.
          </p>
        </div>

        <div className="max-w-2xl mx-auto glass-panel glow-emerald rounded-3xl border border-white/15 p-2.5 sm:p-3 shadow-2xl">
          <form onSubmit={handleStartWithGoal} className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full flex items-center">
              <Target className="absolute left-4 h-5 w-5 text-emerald-400 pointer-events-none" />
              <input
                type="text"
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                placeholder="What do you want to achieve? e.g. Solve 20 DSA problems in 20 days"
                className="w-full rounded-2xl bg-zinc-900/90 border border-white/10 py-3.5 pl-12 pr-4 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-400 transition"
              />
            </div>
            <button
              type="submit"
              className="glow-emerald w-full sm:w-auto flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-xs sm:text-sm font-extrabold text-zinc-950 transition hover:bg-emerald-400 active:scale-95"
            >
              <span>Structure Goal</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3 pb-1 text-left">
            <span className="text-[11px] font-mono uppercase text-zinc-400 mr-1">Try:</span>
            {sampleGoals.map((sample) => (
              <button
                key={sample}
                onClick={() => setGoalText(sample)}
                className="rounded-lg border border-white/5 bg-zinc-900/60 px-2.5 py-1 text-[11px] text-zinc-300 hover:text-white hover:border-emerald-500/40 hover:bg-zinc-800 transition truncate max-w-[280px] sm:max-w-none"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="glow-emerald inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-zinc-950 transition hover:bg-emerald-400"
            >
              <span>Go to Command Center</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="glow-emerald inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-zinc-950 transition hover:bg-emerald-400"
              >
                <span>Create Commitment</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/80 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                <span>Sign In to Account</span>
              </Link>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10 text-left">
          <div className="glass-panel rounded-2xl border border-white/10 p-4 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-mono font-bold uppercase">Parallel Pipeline</span>
            </div>
            <div className="text-lg font-black text-white font-mono">errgroup Concurrency</div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Concurrent commit, PR, and issue polling with worker pool fan-out.
            </p>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 p-4 space-y-1">
            <div className="flex items-center gap-2 text-blue-400">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-mono font-bold uppercase">Smart Escrow</span>
            </div>
            <div className="text-lg font-black text-white font-mono">HMAC-SHA256</div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Server-side signature verification and immutable amount protection.
            </p>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 p-4 space-y-1">
            <div className="flex items-center gap-2 text-purple-400">
              <Bot className="h-4 w-4" />
              <span className="text-xs font-mono font-bold uppercase">Groq AI Verifier</span>
            </div>
            <div className="text-lg font-black text-white font-mono">Llama 3.3 Engine</div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Temporal clustering analysis and grounded conversational coach.
            </p>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 p-4 space-y-1">
            <div className="flex items-center gap-2 text-rose-400">
              <Heart className="h-4 w-4" />
              <span className="text-xs font-mono font-bold uppercase">Win or Lose Impact</span>
            </div>
            <div className="text-lg font-black text-white font-mono">RazorpayX Payouts</div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Stakes always route to verified charities upon commitment resolution.
            </p>
          </div>
        </div>
      </section>

      <section className="w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            How PledgePay Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            The Proof-of-Commitment Execution Loop
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            A closed-loop system combining mathematical rule verification, low-latency AI quality analysis, and automated escrow payouts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-4 relative group hover:border-emerald-500/40 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-lg">
              01
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <Target className="h-4 w-4 text-emerald-400" />
                <span>AI Goal Structurer</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Groq AI transforms loose natural language goals into quantitative, SMART commitments with real-time quality scoring.
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-4 relative group hover:border-blue-500/40 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 font-mono font-bold text-lg">
              02
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-blue-400" />
                <span>Pledge & Escrow</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Stake real funds into Razorpay escrow and lock in a verified non-profit cause before work begins.
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-4 relative group hover:border-purple-500/40 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 font-mono font-bold text-lg">
              03
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <GitBranch className="h-4 w-4 text-purple-400" />
                <span>Parallel Verification</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                GitHub activity is synced concurrently via errgroup. The deterministic rule engine evaluates pace and flags temporal clustering anomalies.
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-4 relative group hover:border-rose-500/40 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 font-mono font-bold text-lg">
              04
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-rose-400" />
                <span>Guaranteed Impact</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Achieve milestone → Verified celebration. Miss deadline → Positive impact framing. Payout dispatches automatically via RazorpayX.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 space-y-8">
        <div className="glass-panel glow-emerald rounded-3xl border border-white/10 p-8 sm:p-12 space-y-8 bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-zinc-900/90">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/10 pb-8">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                Verified Cause Beneficiaries
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Your Code Creates Real World Outcomes
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
                Every commitment is paired with active non-profit organizations across Education, Poverty Alleviation, Healthcare, and Environment.
              </p>
            </div>

            <Link
              href="/commitments/new"
              className="glow-emerald inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-extrabold text-zinc-950 transition hover:bg-emerald-400"
            >
              <span>Choose Cause & Pledge</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: "Educate Girls India",
                category: "Education",
                desc: "Mobilizes rural communities for girls' primary education across backward districts.",
                logo: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=128&q=80",
              },
              {
                name: "Akshaya Patra Foundation",
                category: "Poverty Alleviation",
                desc: "Eliminates classroom hunger through government school mid-day meal programs.",
                logo: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=128&q=80",
              },
              {
                name: "Sankara Eye Foundation",
                category: "Healthcare",
                desc: "Provides high-quality, free eye surgeries to eradicate curable blindness across rural India.",
                logo: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=128&q=80",
              },
              {
                name: "FreeCodeCamp Foundation",
                category: "Developer Access",
                desc: "Creates free coding curricula and open learning resources for millions of developers worldwide.",
                logo: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=128&q=80",
              },
              {
                name: "Grow-Trees India",
                category: "Environment",
                desc: "Combats deforestation by planting trees in rural communities to support biodiversity.",
                logo: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=128&q=80",
              },
            ].map((charity) => (
              <div
                key={charity.name}
                className="rounded-2xl border border-white/5 bg-zinc-900/60 p-4 flex items-start gap-3.5 hover:bg-zinc-900 transition"
              >
                <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-zinc-800 border border-white/10">
                  <Image
                    src={charity.logo}
                    alt={charity.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white truncate max-w-[150px]">
                      {charity.name}
                    </h4>
                    <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400 border border-emerald-500/20">
                      {charity.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {charity.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950/80 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>System Infrastructure Telemetry</span>
                <span className={`h-2 w-2 rounded-full ${health?.status === "ok" ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
              </div>
              <p className="text-[11px] text-zinc-400">
                Go API ({health?.status === "ok" ? "200 OK" : "Connecting..."}) • PostgreSQL ({health?.db || "connected"}) • Redis Queue ({health?.redis || "connected"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
            <span className="rounded-lg bg-zinc-900 border border-white/5 px-2.5 py-1 text-emerald-300 font-semibold">
              Next.js 16 + Go/Gin
            </span>
            <span className="rounded-lg bg-zinc-900 border border-white/5 px-2.5 py-1 text-teal-300 font-semibold">
              Groq Llama 3.3
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
