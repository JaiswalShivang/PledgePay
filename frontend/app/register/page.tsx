"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, User as UserIcon, ArrowRight, Heart } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  github_username: z.string().optional(),
  codeforces_username: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const CAUSES = [
  { name: "Educate Girls India", category: "Education", color: "#1E4FD8" },
  { name: "Akshaya Patra", category: "Poverty Relief", color: "#0A6640" },
  { name: "Sankara Eye Foundation", category: "Healthcare", color: "#C44B0A" },
  { name: "FreeCodeCamp", category: "Open Education", color: "#6B7485" },
];

// ── Left Panel ───────────────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div
      className="hidden lg:flex flex-col justify-between h-full p-10"
      style={{ backgroundColor: "#0F1117" }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="text-lg font-semibold text-white"
          style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
        >
          PledgePay
        </span>
      </div>

      <div className="space-y-8">
        <div className="space-y-2">
          <p
            className="text-xs font-medium tracking-widest uppercase"
            style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-data)" }}
          >
            Your first pledge
          </p>
          <h2
            className="text-3xl font-bold text-white leading-tight"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
          >
            Every missed goal
            <br />
            funds a cause.
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            You choose the beneficiary upfront. Win or lose, your commitment drives real-world impact.
          </p>
        </div>

        {/* Cause cards */}
        <div className="space-y-2">
          <p
            className="text-[11px] uppercase tracking-widest mb-3"
            style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-data)" }}
          >
            Verified beneficiary causes
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CAUSES.map((c) => (
              <div
                key={c.name}
                className="rounded-[8px] p-3 space-y-1"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderLeft: `3px solid ${c.color}`,
                }}
              >
                <p
                  className="text-[11px] font-semibold text-white leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {c.name}
                </p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {c.category}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-center gap-2">
        <Heart className="h-3.5 w-3.5 text-[#C44B0A]" />
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          100% of missed stakes go to your chosen cause
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const { register: registerAuth, isRegistering, isAuthenticated, isLoading } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", github_username: "", codeforces_username: "" },
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, isLoading, router]);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setErrorMessage(null);
      const gh = values.github_username?.trim();
      const cf = values.codeforces_username?.trim();
      await registerAuth({
        name: values.name,
        email: values.email,
        password: values.password,
        github_username: gh || undefined,
        codeforces_username: cf || undefined,
      });
      router.push(!gh || !cf ? "/dashboard?onboarding=true" : "/dashboard");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create account");
    }
  };

  return (
    <div className="flex-1 flex" style={{ backgroundColor: "#F5F6F8", minHeight: "calc(100vh - 56px)" }}>
      {/* LEFT */}
      <div className="w-full lg:w-[44%] lg:max-w-[520px] shrink-0">
        <LeftPanel />
      </div>

      {/* RIGHT */}
      <div className="flex-1 flex items-start justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-[380px] space-y-6">
          <div className="space-y-1.5">
            <h1
              className="text-2xl font-bold text-[#111318]"
              style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
            >
              Create an account
            </h1>
            <p className="text-sm text-[#4B5263]">
              Join PledgePay to structure and stake on code milestones.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {errorMessage && (
              <Alert variant="destructive" title="Registration failed">
                {errorMessage}
              </Alert>
            )}

            {/* Credentials */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="reg-name" className="text-xs font-medium text-[#4B5263]">Full Name</label>
                <Input
                  id="reg-name"
                  {...register("name")}
                  type="text"
                  placeholder="Alex Rivers"
                  leftIcon={<UserIcon className="h-4 w-4" />}
                  error={errors.name?.message}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reg-email" className="text-xs font-medium text-[#4B5263]">Email address</label>
                <Input
                  id="reg-email"
                  {...register("email")}
                  type="email"
                  placeholder="name@example.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={errors.email?.message}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reg-password" className="text-xs font-medium text-[#4B5263]">Password (min 8 chars)</label>
                <Input
                  id="reg-password"
                  {...register("password")}
                  type="password"
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                  error={errors.password?.message}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Integrations — visually separated */}
            <div
              className="rounded-[10px] p-4 space-y-3"
              style={{ backgroundColor: "rgba(10,102,64,0.04)", border: "1px solid rgba(10,102,64,0.15)" }}
            >
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-[#111318]">Code platform integrations</p>
                <p className="text-[11px] text-[#6B7485]">
                  Optional — you can connect these later from your profile.
                </p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reg-github" className="text-xs font-medium text-[#4B5263]">GitHub username</label>
                <Input
                  id="reg-github"
                  {...register("github_username")}
                  type="text"
                  placeholder="octocat"
                  leftIcon={<GithubIcon className="h-4 w-4" />}
                  error={errors.github_username?.message}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reg-codeforces" className="text-xs font-medium text-[#4B5263]">Codeforces handle</label>
                <Input
                  id="reg-codeforces"
                  {...register("codeforces_username")}
                  type="text"
                  placeholder="tourist"
                  error={errors.codeforces_username?.message}
                />
              </div>
            </div>

            <Button
              id="register-submit"
              type="submit"
              variant="escrow"
              size="lg"
              className="w-full"
              isLoading={isRegistering}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Create Account
            </Button>
          </form>

          <p className="text-center text-xs text-[#6B7485]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#0A6640] font-medium hover:underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
