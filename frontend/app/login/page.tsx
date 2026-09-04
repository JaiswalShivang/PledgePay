"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { apiClient, HealthResponse } from "@/lib/api-client";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ── Left Panel — product mechanic + live stat ─────────────────────────────────
function LeftPanel() {
  const { data: health, isLoading } = useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: () => apiClient.getHealth(),
    refetchInterval: 60_000,
    staleTime: 60_000,
  });

  const steps = [
    {
      label: "Stake",
      desc: "Lock real money into escrow against your goal",
      color: "#0A6640",
    },
    {
      label: "Verify",
      desc: "AI polls your GitHub commits and Codeforces submissions daily",
      color: "#1E4FD8",
    },
    {
      label: "Settle",
      desc: "Hit your target → full refund. Miss it → stake funds your chosen charity",
      color: "#C44B0A",
    },
  ];

  return (
    <div
      className="hidden lg:flex flex-col justify-between h-full p-10"
      style={{ backgroundColor: "#0F1117" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <span
          className="text-lg font-semibold text-white"
          style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
        >
          PledgePay
        </span>
      </div>

      {/* Mechanic */}
      <div className="space-y-8">
        <div className="space-y-2">
          <p
            className="text-xs font-medium tracking-widest uppercase"
            style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-data)" }}
          >
            How it works
          </p>
          <h2
            className="text-3xl font-bold text-white leading-tight"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
          >
            Proof-backed
            <br />
            accountability.
          </h2>
        </div>

        {/* Pipeline steps */}
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={step.label} className="flex gap-4">
              {/* Connector */}
              <div className="flex flex-col items-center">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: step.color, fontFamily: "var(--font-display)" }}
                >
                  {i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="w-px flex-1 my-1"
                    style={{ backgroundColor: "rgba(255,255,255,0.08)", minHeight: "28px" }}
                  />
                )}
              </div>
              {/* Content */}
              <div className="pb-7">
                <p
                  className="text-sm font-semibold text-white mb-0.5"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {step.label}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live stat */}
      <div
        className="rounded-[10px] p-4 space-y-1"
        style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="text-[11px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-data)" }}>
          System Status
        </p>
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{
              backgroundColor: health?.status === "ok" ? "#0A6640" : "#C44B0A",
            }}
          />
          {isLoading ? (
            <span className="skeleton h-4 w-40 rounded" />
          ) : (
            <span
              className="text-sm font-medium text-white animate-fade-in"
              style={{ fontFamily: "var(--font-data)" }}
            >
              {health?.status === "ok" ? "All systems operational" : "Degraded — check back shortly"}
            </span>
          )}
        </div>
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-data)" }}>
          Go API · PostgreSQL · Razorpay Escrow
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggingIn, isAuthenticated, isLoading } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setErrorMessage(null);
      await login(values);
      router.push("/dashboard");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Invalid email or password");
    }
  };

  return (
    <div className="flex-1 flex" style={{ backgroundColor: "#F5F6F8", minHeight: "calc(100vh - 56px)" }}>
      {/* LEFT — dark product panel */}
      <div className="w-full lg:w-[44%] lg:max-w-[520px] shrink-0">
        <LeftPanel />
      </div>

      {/* RIGHT — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px] space-y-7">
          {/* Heading */}
          <div className="space-y-1.5">
            <h1
              className="text-2xl font-bold text-[#111318]"
              style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
            >
              Sign in
            </h1>
            <p className="text-sm text-[#4B5263]">
              Manage your escrow commitments and code verification.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {errorMessage && (
              <Alert variant="destructive" title="Authentication failed">
                {errorMessage}
              </Alert>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="text-xs font-medium text-[#4B5263]"
              >
                Email address
              </label>
              <Input
                id="login-email"
                {...register("email")}
                type="email"
                placeholder="name@example.com"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="text-xs font-medium text-[#4B5263]"
              >
                Password
              </label>
              <Input
                id="login-password"
                {...register("password")}
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                error={errors.password?.message}
                autoComplete="current-password"
              />
            </div>

            <Button
              id="login-submit"
              type="submit"
              variant="escrow"
              size="lg"
              className="w-full mt-1"
              isLoading={isLoggingIn}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-[#6B7485]">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-[#0A6640] font-medium hover:underline underline-offset-4"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
