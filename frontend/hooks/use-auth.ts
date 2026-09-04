"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiClient, setAuthToken, RegisterInput, LoginInput } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

export function useAuth() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: storeLoading, setUser, logout: storeLogout } = useAuthStore();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const data = await apiClient.auth.getMe();
        return data.user;
      } catch {
        return null;
      }
    },
    staleTime: 30 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!meQuery.isLoading) {
      setUser(meQuery.data || null);
    }
  }, [meQuery.data, meQuery.isLoading, setUser]);

  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const res = await apiClient.auth.login(input);
      setAuthToken(res.token);
      return res.user;
    },
    onSuccess: (newUser) => {
      setUser(newUser);
      queryClient.setQueryData(["auth", "me"], newUser);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const res = await apiClient.auth.register(input);
      setAuthToken(res.token);
      return res.user;
    },
    onSuccess: (newUser) => {
      setUser(newUser);
      queryClient.setQueryData(["auth", "me"], newUser);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await storeLogout();
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.invalidateQueries();
    },
  });

  return {
    user,
    isAuthenticated,
    isLoading: meQuery.isLoading || storeLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    refetchMe: meQuery.refetch,
  };
}
