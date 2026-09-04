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
  codeforces_username?: string;
  role?: string;
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
  codeforces_username?: string;
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
  website_url?: string;
  is_active: boolean;
  razorpayx_fund_account_id?: string;
}

export interface StructuredGoal {
  goal: string;
  target: number;
  duration: number;
  unit: string;
  evidence: string;
  timeframe_text?: string;
  duration_minutes?: number;
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

export interface EvidenceItem {
  id: string;
  commitment_id: string;
  source: string;
  source_ref: string;
  raw_payload: {
    sha?: string;
    message?: string;
    author?: string;
    repo?: string;
    url?: string;
    number?: number;
    title?: string;
    state?: string;
    merged?: boolean;
    name?: string;
    handle?: string;
    problem_name?: string;
    verdict?: string;
    [key: string]: unknown;
  };
  occurred_at: string;
  ingested_at: string;
}


export type PaceStatus = "ON_TRACK" | "AT_RISK" | "BEHIND";

export interface ProgressCalculation {
  target: number;
  verified: number;
  progress_pct: number;
  days_remaining: number;
  status: PaceStatus;
  evidence_count: number;
  daily_pace_actual: number;
  daily_pace_required: number;
}

export interface VerificationResult {
  id: string;
  commitment_id: string;
  evidence_count: number;
  verified_count: number;
  progress_pct: number;
  anomaly_flag: boolean;
  anomaly_reason?: string;
  ai_confidence?: number;
  ai_summary?: {
    evidence_quality?: "HIGH" | "MEDIUM" | "LOW";
    anomaly?: string;
    summary?: string;
  };
  created_at: string;
}

export interface Donation {
  id: string;
  commitment_id: string;
  charity_id: string;
  amount_paise: number;
  outcome: "SUCCESS" | "FAILURE";
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED";
  razorpayx_payout_id?: string;
  failure_reason?: string;
  created_at: string;
  charity?: Charity;
}

export interface ResolutionResult {
  commitment: Commitment;
  donation?: Donation;
  progress: ProgressCalculation;
  verification?: VerificationResult;
  is_resolved: boolean;
  state: "ACTIVE" | "COMPLETED" | "FAILED" | "DONATION_PENDING" | "DONATED";
}

export interface Commitment {
  id: string;
  user_id: string;
  charity_id?: string;
  github_repo?: string;
  codeforces_username?: string;
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
  evidence?: EvidenceItem[];
  donation?: Donation;
}

export interface DashboardStats {
  total_pledged_paise: number;
  active_commitments_count: number;
  completed_count: number;
  total_donated_paise: number;
  average_progress_pct: number;
}

export interface DashboardItem {
  commitment: Commitment;
  progress: ProgressCalculation;
  donation?: Donation;
  verification?: VerificationResult;
}

export interface DashboardResponse {
  stats: DashboardStats;
  items: DashboardItem[];
}

export interface CreateCommitmentInput {
  title: string;
  description?: string;
  target_count: number;
  unit: string;
  duration_days: number;
  duration_minutes?: number;
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

export interface GitHubRepoItem {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string;
  html_url: string;
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

  dashboard: {
    get: () =>
      request<DashboardResponse>("/api/v1/dashboard", {
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
    getAll: () =>
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

    linkRepo: (id: string, repo: string) =>
      request<{ status: string; commitment: Commitment; github_repo: string }>(
        `/api/v1/commitments/${id}/link-repo`,
        {
          method: "POST",
          body: JSON.stringify({ repo }),
        }
      ),

    syncEvidence: (id: string) =>
      request<{
        synced_count: number;
        total_evidence: number;
        evidence: EvidenceItem[];
      }>(`/api/v1/commitments/${id}/sync-evidence`, {
        method: "POST",
      }),

    getEvidence: (id: string) =>
      request<{ evidence: EvidenceItem[] }>(
        `/api/v1/commitments/${id}/evidence`,
        {
          method: "GET",
        }
      ),

    getProgress: (id: string) =>
      request<{ progress: ProgressCalculation }>(
        `/api/v1/commitments/${id}/progress`,
        {
          method: "GET",
        }
      ),

    verify: (id: string) =>
      request<{
        progress: ProgressCalculation;
        verification: VerificationResult;
      }>(`/api/v1/commitments/${id}/verify`, {
        method: "POST",
      }),

    getVerification: (id: string) =>
      request<{ verification: VerificationResult | null }>(
        `/api/v1/commitments/${id}/verification`,
        {
          method: "GET",
        }
      ),

    getStatus: (id: string) =>
      request<ResolutionResult>(`/api/v1/commitments/${id}/status`, {
        method: "GET",
      }),

    checkResolution: (id: string) =>
      request<ResolutionResult>(`/api/v1/commitments/${id}/check-resolution`, {
        method: "POST",
      }),

    askCoach: (id: string, question: string) =>
      request<{ reply: string; progress: ProgressCalculation }>(
        `/api/v1/commitments/${id}/coach`,
        {
          method: "POST",
          body: JSON.stringify({ question }),
        }
      ),

  },

  dev: {
    resetDemo: () =>
      request<{
        message: string;
        primary_commitment_id: string;
        second_commitment_id: string;
      }>("/api/v1/dev/reset-demo", {
        method: "POST",
      }),

    injectAnomaly: (commitmentId?: string) =>
      request<{
        message: string;
        commitment_id: string;
        anomaly_flag: boolean;
      }>("/api/v1/dev/inject-anomaly", {
        method: "POST",
        body: JSON.stringify({ commitment_id: commitmentId }),
      }),

    forceSuccess: (commitmentId?: string) =>
      request<{
        message: string;
        resolution: ResolutionResult;
      }>("/api/v1/dev/force-success", {
        method: "POST",
        body: JSON.stringify({ commitment_id: commitmentId }),
      }),

    forceFailure: (commitmentId?: string) =>
      request<{
        message: string;
        resolution: ResolutionResult;
      }>("/api/v1/dev/force-failure", {
        method: "POST",
        body: JSON.stringify({ commitment_id: commitmentId }),
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

  integrations: {
    getGitHubConnectUrl: (redirectUri?: string) =>
      request<{ url: string; state: string }>(
        `/api/v1/integrations/github/connect?json=true${
          redirectUri ? `&redirect_uri=${encodeURIComponent(redirectUri)}` : ""
        }`,
        {
          method: "GET",
        }
      ),

    listGitHubRepos: () =>
      request<{ repos: GitHubRepoItem[] }>("/api/v1/integrations/github/repos", {
        method: "GET",
      }),

    connectCodeforces: (handle: string) =>
      request<{ status: string; provider: string; handle: string }>(
        "/api/v1/integrations/codeforces/connect",
        {
          method: "POST",
          body: JSON.stringify({ handle }),
        }
      ),
  },

  admin: {
    getStats: () => request<AdminStats>("/api/v1/admin/stats"),
    getTransactions: () =>
      request<{ transactions: AdminTransaction[]; count: number }>("/api/v1/admin/transactions"),
    releasePayout: (commitment_id: string, action: "donate" | "refund" | "auto" = "auto") =>
      request<AdminPayoutResult>("/api/v1/admin/payout", {
        method: "POST",
        body: JSON.stringify({ commitment_id, action }),
      }),
    createCharity: (data: {
      name: string;
      category: string;
      description: string;
      website_url?: string;
      logo_url?: string;
    }) =>
      request<{ message: string; charity: Charity }>("/api/v1/admin/charities", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    deleteCharity: (id: string) =>
      request<{ status: string; message: string; detail?: string }>(`/api/v1/admin/charities/${id}`, {
        method: "DELETE",
      }),
    listCharities: () =>
      request<{ charities: Charity[] }>("/api/v1/admin/charities"),
  },
};

export interface AdminCharityStat {
  charity_id: string;
  name: string;
  category: string;
  website_url?: string;
  logo_url?: string;
  total_received_paise: number;
  pending_disbursal_paise: number;
  total_pledges_count: number;
  disbursed_pledges_count: number;
}

export interface AdminStats {
  total_escrow_paise: number;
  active_escrow_paise: number;
  donated_paise: number;
  refunded_paise: number;
  total_commitments: number;
  active_count: number;
  completed_count: number;
  failed_count: number;
  draft_count: number;
  charity_breakdown?: AdminCharityStat[];
}

export interface AdminTransaction {
  id: string;
  title: string;
  amount_paise: number;
  status: string;
  target_count: number;
  unit: string;
  duration_days: number;
  evidence_type: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role?: string;
  };
  charity?: {
    id: string;
    name: string;
    logo_url?: string;
    category?: string;
    razorpayx_fund_account_id?: string;
  };
  payment?: {
    id: string;
    razorpay_payment_id?: string;
    status: string;
    amount_paise: number;
  };
  donation?: {
    id: string;
    razorpayx_payout_id?: string;
    status: string;
    outcome: string;
  };
}

export interface AdminPayoutResult {
  status: string;
  action: string;
  commitment_id: string;
  charity_name?: string;
  amount_paise: number;
  payout_id?: string;
  message: string;
}
