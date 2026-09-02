"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button, Input, Card, CardContent, Alert } from "@/components/ui";

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
    defaultValues: {
      email: "",
      password: "",
    },
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
      const msg =
        err instanceof Error ? err.message : "Invalid email or password";
      setErrorMessage(msg);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#18181B]">
            Sign in to PledgePay
          </h1>
          <p className="text-xs text-[#52525B]">
            Manage your escrow commitments and code verification.
          </p>
        </div>

        <Card variant="default" padding="md">
          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive" title="Authentication failed">
                {errorMessage}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#52525B]">
                  Email Address
                </label>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="name@example.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={errors.email?.message}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#52525B]">
                  Password
                </label>
                <Input
                  {...register("password")}
                  type="password"
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                  error={errors.password?.message}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2"
                isLoading={isLoggingIn}
              >
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-[#52525B]">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-[#047857] font-medium hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
