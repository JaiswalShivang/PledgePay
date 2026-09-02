"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ShieldCheck, ArrowRight, Lock, Mail, User as UserIcon, AlertCircle, Loader2 } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  github_username: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

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
    defaultValues: {
      name: "",
      email: "",
      password: "",
      github_username: "",
    },
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/profile");
    }
  }, [isAuthenticated, isLoading, router]);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setErrorMessage(null);
      await registerAuth({
        name: values.name,
        email: values.email,
        password: values.password,
        github_username: values.github_username?.trim() || undefined,
      });
      router.push("/profile");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create account";
      setErrorMessage(msg);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="glass-panel relative rounded-2xl border border-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Create Account</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Join PledgePay and stake on your developer milestones
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-300">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <input
                  {...register("name")}
                  type="text"
                  placeholder="Alex Rivers"
                  className="w-full rounded-lg border border-white/10 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="name@example.com"
                  className="w-full rounded-lg border border-white/10 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-300">
                Password (min 8 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <input
                  {...register("password")}
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/10 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-300">
                GitHub Username (Optional)
              </label>
              <div className="relative">
                <GithubIcon className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <input
                  {...register("github_username")}
                  type="text"
                  placeholder="octocat"
                  className="w-full rounded-lg border border-white/10 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {errors.github_username && (
                <p className="mt-1.5 text-xs text-red-400">{errors.github_username.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isRegistering}
              className="glow-emerald mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
