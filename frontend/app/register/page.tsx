"use client";

import { useState, useEffect } from "react";
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
import { AuthSplitLayout } from "@/components/auth-split-layout";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  github_username: z.string().optional(),
  codeforces_username: z.string().optional(),
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
      codeforces_username: "",
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
    <AuthSplitLayout
      title="Create an account"
      subtitle="Join PledgePay to structure, stake, and execute your engineering goals."
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkHref="/login"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {errorMessage && (
          <Alert variant="destructive" title="Registration failed">
            {errorMessage}
          </Alert>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="reg-name"
            className="text-[14px] font-medium text-[#16161A] font-body"
          >
            Full Name
          </label>
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
          <label
            htmlFor="reg-email"
            className="text-[14px] font-medium text-[#16161A] font-body"
          >
            Email address
          </label>
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
          <label
            htmlFor="reg-password"
            className="text-[14px] font-medium text-[#16161A] font-body"
          >
            Password
          </label>
          <Input
            id="reg-password"
            {...register("password")}
            type="password"
            placeholder="At least 8 characters"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            autoComplete="new-password"
          />
        </div>

        <div className="pt-2 border-t border-[#F2F3F7] space-y-3">
          <p className="text-[14px] text-[#16161A]/60 font-body">
            Optional developer handles for auto-verification
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="reg-github"
              {...register("github_username")}
              placeholder="GitHub handle"
              leftIcon={<GithubIcon className="h-4 w-4" />}
            />
            <Input
              id="reg-codeforces"
              {...register("codeforces_username")}
              placeholder="Codeforces handle"
            />
          </div>
        </div>

        <Button
          id="register-submit"
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          isLoading={isRegistering}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Create Account
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
