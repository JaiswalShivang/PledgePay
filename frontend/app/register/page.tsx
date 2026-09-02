"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, User as UserIcon } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { Button, Input, Card, CardContent, Alert } from "@/components/ui";

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
      router.replace("/dashboard");
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
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create account";
      setErrorMessage(msg);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#18181B]">
            Create an Account
          </h1>
          <p className="text-xs text-[#52525B]">
            Join PledgePay to structure and stake on code milestones.
          </p>
        </div>

        <Card variant="default" padding="md">
          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive" title="Registration failed">
                {errorMessage}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#52525B]">
                  Full Name
                </label>
                <Input
                  {...register("name")}
                  type="text"
                  placeholder="Alex Rivers"
                  leftIcon={<UserIcon className="h-4 w-4" />}
                  error={errors.name?.message}
                />
              </div>

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
                  Password (min 8 chars)
                </label>
                <Input
                  {...register("password")}
                  type="password"
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                  error={errors.password?.message}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#52525B]">
                  GitHub Username (Optional)
                </label>
                <Input
                  {...register("github_username")}
                  type="text"
                  placeholder="octocat"
                  leftIcon={<GithubIcon className="h-4 w-4" />}
                  error={errors.github_username?.message}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2"
                isLoading={isRegistering}
              >
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-[#52525B]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[#047857] font-medium hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
