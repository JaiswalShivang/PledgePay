"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";
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
    <div
      className="flex-1 flex items-center justify-center px-6 py-12"
      style={{ backgroundColor: "#F5F6F8", minHeight: "calc(100vh - 56px)" }}
    >
      <div className="w-full max-w-[380px] space-y-6">
        <div className="space-y-1.5 text-center">
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
  );
}
