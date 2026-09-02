import { create } from "zustand";
import { apiClient, setAuthToken, User } from "./api-client";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: async () => {
    try {
      await apiClient.auth.logout();
    } catch {
    } finally {
      setAuthToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
