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

export interface Charity {
  id: string;
  name: string;
  category: string;
  description: string;
  logo_url?: string;
  is_active: boolean;
  razorpayx_fund_account_id?: string;
}

export interface StructuredGoal {
  goal: string;
  target: number;
  duration: number;
  unit: string;
  evidence: string;
}

export interface QualityAnalysis {
  specificity: number;
  measurability: number;
  realism: number;
  evidence: number;
  overall: number;
  issues: string[];
  suggested_commitment: StructuredGoal;
}

export interface CharitySuggestion {
  charity_id: string;
  charity?: Charity;
  rationale: string;
}

export interface AnalyzeCombinedResponse {
  structured: StructuredGoal;
  quality: QualityAnalysis;
  charities: CharitySuggestion[];
}

export interface CommitmentRule {
  id: string;
  commitment_id: string;
  rule_type: string;
  rule_config: Record<string, unknown>;
  created_at: string;
}

export interface Commitment {
  id: string;
  user_id: string;
  charity_id?: string;
  title: string;
  description?: string;
  target_count: number;
  unit: string;
  duration_days: number;
  start_date: string;
  end_date: string;
  evidence_type: string;
  amount_paise: number;
  status: "DRAFT" | "PAYMENT_PENDING" | "ACTIVE" | "VERIFYING" | "COMPLETED" | "FAILED";
  quality_score?: number;
  created_at: string;
  updated_at: string;
  charity?: Charity;
  rules?: CommitmentRule[];
}

export interface CreateCommitmentInput {
  title: string;
  description?: string;
  target_count: number;
  unit: string;
  duration_days: number;
  evidence_type?: string;
  amount_paise: number;
  quality_score?: number;
  charity_id: string;
}

export interface CreateOrderResponse {
  commitment_id: string;
  razorpay_order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
  is_mock?: boolean;
  mock_payment_id?: string;
  mock_signature?: string;
}

export interface VerifyPaymentInput {
  commitment_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
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

  ai: {
    structureGoal: (text: string) =>
      request<StructuredGoal>("/api/v1/ai/structure-goal", {
        method: "POST",
        body: JSON.stringify({ text }),
      }),

    analyzeQuality: (params: {
      text: string;
      goal?: string;
      target?: number;
      duration?: number;
      unit?: string;
      evidence?: string;
    }) =>
      request<QualityAnalysis>("/api/v1/ai/analyze-quality", {
        method: "POST",
        body: JSON.stringify(params),
      }),

    suggestCharities: (params: {
      goal: string;
      category?: string;
      evidence_type?: string;
    }) =>
      request<{ suggestions: CharitySuggestion[] }>(
        "/api/v1/ai/suggest-charities",
        {
          method: "POST",
          body: JSON.stringify(params),
        }
      ),

    analyzeCombined: (text: string) =>
      request<AnalyzeCombinedResponse>("/api/v1/ai/analyze-combined", {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
  },

  charities: {
    list: () =>
      request<{ charities: Charity[] }>("/api/v1/charities", {
        method: "GET",
      }),
  },

  commitments: {
    create: (input: CreateCommitmentInput) =>
      request<{ commitment: Commitment }>("/api/v1/commitments", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    list: () =>
      request<{ commitments: Commitment[] }>("/api/v1/commitments", {
        method: "GET",
      }),

    getById: (id: string) =>
      request<{ commitment: Commitment }>(`/api/v1/commitments/${id}`, {
        method: "GET",
      }),
  },

  payments: {
    createOrder: (commitmentId: string) =>
      request<CreateOrderResponse>("/api/v1/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ commitment_id: commitmentId }),
      }),

    verify: (input: VerifyPaymentInput) =>
      request<{ status: string; commitment: Commitment }>(
        "/api/v1/payments/verify",
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      ),
  },
};
