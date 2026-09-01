"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, HealthResponse } from "@/lib/api-client";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Sparkles,
  Zap,
} from "lucide-react";

export default function Home() {
  const {
    data: health,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: () => apiClient.getHealth(),
    refetchInterval: 10000,
  });

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Background glow effects */}
      <div className="absolute top-24 -z-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-24 -z-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="w-full max-w-4xl space-y-8">
        {/* Header Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Prompt 0 — Infrastructure & Monorepo Scaffolding</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Pledge<span className="text-emerald-400">Pay</span> Monorepo
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            High-concurrency proof-of-commitment escrow platform backed by Go,
            Gin, PostgreSQL, Redis, Groq AI, and Next.js.
          </p>
        </div>

        {/* Live Health & Acceptance Criteria Card */}
        <div className="glass-panel glow-emerald rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <Server className="h-5 w-5 text-emerald-400" />
                Backend Status & Healthz
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Real-time API probe verifying connectivity and service health
              </p>
            </div>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 border border-zinc-700 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
              />
              <span>Refresh Probe</span>
            </button>
          </div>

          {/* Health status banner */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center gap-3">
              {isLoading ? (
                <div className="h-5 w-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              ) : health?.status === "ok" ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              ) : (
                <XCircle className="h-6 w-6 text-rose-500" />
              )}
              <div>
                <div className="text-sm font-semibold text-white">
                  {isLoading
                    ? "Probing Backend..."
                    : isError
                      ? "Backend: Offline"
                      : "Backend: OK"}
                </div>
                <div className="text-xs text-zinc-400">
                  {isLoading
                    ? "Fetching GET /healthz"
                    : isError
                      ? (error as Error)?.message || "Failed to reach backend API"
                      : `Response received from ${health?.service || "API"}`}
                </div>
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <span
                className={`inline-block px-2.5 py-1 rounded-md font-bold uppercase ${health?.status === "ok"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : isError
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
              >
                {health?.status === "ok" ? "200 OK" : isError ? "ERROR" : "WAITING"}
              </span>
            </div>
          </div>

          {/* Subsystem Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-blue-400" />
                  PostgreSQL
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${health?.db === "connected" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                />
              </div>
              <div className="text-sm font-semibold text-white capitalize">
                {health?.db || "idle"}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Redis
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${health?.redis === "connected" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                />
              </div>
              <div className="text-sm font-semibold text-white capitalize">
                {health?.redis || "idle"}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-purple-400" />
                  Environment
                </span>
              </div>
              <div className="text-sm font-semibold text-white font-mono capitalize">
                {health?.env || "development"}
              </div>
            </div>
          </div>
        </div>

        {/* Stack Architecture Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 text-zinc-300">
            <span className="font-semibold block text-white">Next.js 16</span>
            <span className="text-zinc-500">App Router & Tailwind</span>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 text-zinc-300">
            <span className="font-semibold block text-white">Go + Gin</span>
            <span className="text-zinc-500">Goroutine Concurrency</span>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 text-zinc-300">
            <span className="font-semibold block text-white">PostgreSQL & Redis</span>
            <span className="text-zinc-500">ACID + Asynq Queue</span>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 text-zinc-300">
            <span className="font-semibold block text-white">Groq AI</span>
            <span className="text-zinc-500">Llama 3.3 Structured JSON</span>
          </div>
        </div>
      </div>
    </div>
  );
}
