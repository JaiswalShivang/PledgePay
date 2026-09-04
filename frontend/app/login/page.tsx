"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { AuthSplitLayout } from "@/components/auth-split-layout";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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
    <AuthSplitLayout
      title="Welcome back"
      subtitle="Sign in to monitor your active commitments and evidence status."
      footerText="Don't have an account?"
      footerLinkText="Create one"
      footerLinkHref="/register"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {errorMessage && (
          <Alert variant="destructive" title="Authentication failed">
            {errorMessage}
          </Alert>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="text-[14px] font-medium text-[#16161A] font-body"
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
            className="text-[14px] font-medium text-[#16161A] font-body"
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
          variant="primary"
          size="lg"
          className="w-full mt-2"
          isLoading={isLoggingIn}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Sign In
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
