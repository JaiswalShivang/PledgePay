const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  db: "connected" | "disconnected";
  redis: "connected" | "disconnected";
  env: string;
}

export interface UserIntegration {
  id: string;
  provider: string;
  external_username?: string;
  connected_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  github_username?: string;
  created_at: string;
  integrations?: UserIntegration[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  github_username?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let inMemoryToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  inMemoryToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("pledgepay_token", token);
    } else {
      localStorage.removeItem("pledgepay_token");
    }
  }
};

export const getAuthToken = (): string | null => {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== "undefined") {
    inMemoryToken = localStorage.getItem("pledgepay_token");
    return inMemoryToken;
  }
  return null;
};

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    credentials: "include",
    headers,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }
    const message =
      typeof errorData === "object" &&
      errorData !== null &&
      "message" in errorData &&
      typeof (errorData as { message: unknown }).message === "string"
        ? (errorData as { message: string }).message
        : `API request failed: ${response.status} ${response.statusText}`;
    throw new ApiError(response.status, message, errorData);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),

  getHealth: () => request<HealthResponse>("/healthz"),

  auth: {
    register: (input: RegisterInput) =>
      request<AuthResponse>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    login: (input: LoginInput) =>
      request<AuthResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    logout: () =>
      request<{ status: string; message: string }>("/api/v1/auth/logout", {
        method: "POST",
      }),

    getMe: () =>
      request<{ user: User }>("/api/v1/me", {
        method: "GET",
      }),
  },
};
