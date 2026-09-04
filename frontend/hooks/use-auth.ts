"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { apiClient, setAuthToken, getAuthToken, RegisterInput, LoginInput } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

const emptySubscribe = () => () => {};

export function useAuth() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: storeLoading, setUser, logout: storeLogout } = useAuthStore();

  const token = useSyncExternalStore(
    emptySubscribe,
    () => getAuthToken(),
    () => null
  );

  const hasToken = !!token;

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const currentToken = getAuthToken();
      if (!currentToken) return null;
      try {
        const data = await apiClient.auth.getMe();
        return data.user;
      } catch {
        setAuthToken(null);
        return null;
      }
    },
    enabled: hasToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!hasToken) {
      setUser(null);
    } else if (!meQuery.isLoading) {
      setUser(meQuery.data || null);
    }
  }, [hasToken, meQuery.data, meQuery.isLoading, setUser]);

  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const res = await apiClient.auth.login(input);
      setAuthToken(res.token);
      return res.user;
    },
    onSuccess: (newUser) => {
      queryClient.clear();
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
      queryClient.clear();
      setUser(newUser);
      queryClient.setQueryData(["auth", "me"], newUser);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await storeLogout();
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(["auth", "me"], null);
    },
  });

  return {
    user,
    isAuthenticated,
    isLoading: hasToken ? (meQuery.isLoading || storeLoading) : false,
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
