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

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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
    <div
      className="flex-1 flex items-center justify-center px-6 py-12"
      style={{ backgroundColor: "#F5F6F8", minHeight: "calc(100vh - 56px)" }}
    >
      <div className="w-full max-w-[360px] space-y-7">
        {/* Heading */}
        <div className="space-y-1.5 text-center">
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
  );
}
