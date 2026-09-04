"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiClient,
  AdminStats,
  AdminTransaction,
  AdminPayoutResult,
} from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import {
  ShieldCheck,
  Lock,
  RefreshCw,
  Search,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Heart,
  Send,
  KeyRound,
  Building2,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import { Button, Badge, Alert } from "@/components/ui";

export default function AdminPage() {
  const { user, login } = useAuth();
  const queryClient = useQueryClient();

  // Admin login form state
  const [adminEmail, setAdminEmail] = useState("admin@admin.com");
  const [adminPassword, setAdminPassword] = useState("admin123");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Table filter & search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedCharityFilter, setSelectedCharityFilter] = useState("");
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "destructive";
    text: string;
    utr?: string;
  } | null>(null);

  const isAdmin =
    user?.email === "admin@admin.com" ||
    user?.role === "admin";

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      await login({ email: adminEmail, password: adminPassword });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in as admin";
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  // Queries for stats and transactions
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => apiClient.admin.getStats(),
    enabled: isAdmin,
    refetchInterval: 10000,
  });

  const {
    data: txData,
    isLoading: txLoading,
    refetch: refetchTx,
  } = useQuery<{ transactions: AdminTransaction[]; count: number }>({
    queryKey: ["admin", "transactions"],
    queryFn: () => apiClient.admin.getTransactions(),
    enabled: isAdmin,
    refetchInterval: 10000,
  });

  // Payout mutation
  const payoutMutation = useMutation({
    mutationFn: ({
      commitmentId,
      action,
    }: {
      commitmentId: string;
      action: "donate" | "refund" | "auto";
    }) => apiClient.admin.releasePayout(commitmentId, action),
    onSuccess: (data: AdminPayoutResult) => {
      setActionMessage({
        type: "success",
        text: data.message,
        utr: data.payout_id,
      });
      refetchStats();
      refetchTx();
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["commitments"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to release payout";
      setActionMessage({
        type: "destructive",
        text: msg,
      });
    },
  });

  // Charity management state & mutations
  const [showAddCharity, setShowAddCharity] = useState(false);
  const [newCharityName, setNewCharityName] = useState("");
  const [newCharityCategory, setNewCharityCategory] = useState("Education");
  const [newCharityDesc, setNewCharityDesc] = useState("");
  const [newCharityWebsite, setNewCharityWebsite] = useState("");

  const createCharityMutation = useMutation({
    mutationFn: (data: {
      name: string;
      category: string;
      description: string;
      website_url?: string;
    }) => apiClient.admin.createCharity(data),
    onSuccess: (data) => {
      setActionMessage({
        type: "success",
        text: `Charity "${data.charity.name}" added successfully to the protocol.`,
      });
      setShowAddCharity(false);
      setNewCharityName("");
      setNewCharityDesc("");
      setNewCharityWebsite("");

      // Optimistically update admin stats cache immediately
      queryClient.setQueryData<AdminStats>(["admin", "stats"], (old) => {
        if (!old) return old;
        const newBreakdownItem = {
          charity_id: data.charity.id,
          name: data.charity.name,
          category: data.charity.category,
          website_url: data.charity.website_url || undefined,
          logo_url: data.charity.logo_url || undefined,
          total_received_paise: 0,
          pending_disbursal_paise: 0,
          total_pledges_count: 0,
          disbursed_pledges_count: 0,
        };
        return {
          ...old,
          charity_breakdown: [...(old.charity_breakdown || []), newBreakdownItem],
        };
      });

      refetchStats();
      refetchTx();
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["charities"] });
    },
    onError: (err: unknown) => {
      setActionMessage({
        type: "destructive",
        text: err instanceof Error ? err.message : "Failed to create charity",
      });
    },
  });

  const deleteCharityMutation = useMutation({
    mutationFn: (charityId: string) => apiClient.admin.deleteCharity(charityId),
    onMutate: async (charityId: string) => {
      // Optimistically remove the charity from screen immediately
      queryClient.setQueryData<AdminStats>(["admin", "stats"], (old) => {
        if (!old) return old;
        return {
          ...old,
          charity_breakdown: (old.charity_breakdown || []).filter(
            (c) => c.charity_id !== charityId
          ),
        };
      });
    },
    onSuccess: (data, charityId) => {
      setActionMessage({
        type: "success",
        text: data.message || "Charity deleted successfully from the protocol.",
      });

      queryClient.setQueryData<AdminStats>(["admin", "stats"], (old) => {
        if (!old) return old;
        return {
          ...old,
          charity_breakdown: (old.charity_breakdown || []).filter(
            (c) => c.charity_id !== charityId
          ),
        };
      });

      refetchStats();
      refetchTx();
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["charities"] });
    },
    onError: (err: unknown) => {
      refetchStats();
      setActionMessage({
        type: "destructive",
        text: err instanceof Error ? err.message : "Failed to delete charity",
      });
    },
  });

  // If not logged in as admin, show admin login with split-pane style
  if (!isAdmin) {
    return (
      <div
        className="min-h-[80vh] flex items-center justify-center p-4"
        style={{ backgroundColor: "#F5F6F8" }}
      >
        <div
          className="w-full max-w-md rounded-[14px] overflow-hidden"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
        >
          {/* Dark header */}
          <div
            className="px-7 py-6 text-center space-y-2"
            style={{ backgroundColor: "#0F1117", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="inline-flex h-12 w-12 items-center justify-center rounded-full mb-1"
              style={{ backgroundColor: "rgba(10,102,64,0.2)" }}
            >
              <ShieldCheck className="h-6 w-6 text-[#0A6640]" />
            </div>
            <h1
              className="text-lg font-bold text-white"
              style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
            >
              Treasury Console
            </h1>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Restricted escrow settlement &amp; payout portal.
            </p>
          </div>

          {/* Form panel */}
          <div className="px-7 py-6 space-y-5" style={{ backgroundColor: "#FFFFFF" }}>
            {loginError && (
              <Alert variant="destructive" title="Access Denied">{loginError}</Alert>
            )}

            <div
              className="rounded-[8px] p-3 space-y-1"
              style={{ backgroundColor: "rgba(30,79,216,0.06)", border: "1px solid rgba(30,79,216,0.15)" }}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1E3A8A]">
                <KeyRound className="h-3.5 w-3.5" />
                Admin Credentials
              </div>
              <p className="text-[11px] text-[#1E3A8A]">
                Email: <code className="font-data bg-[#DBEAFE] px-1 rounded">admin@admin.com</code>
                {" "}&bull;{" "}
                Password: <code className="font-data bg-[#DBEAFE] px-1 rounded">admin123</code>
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#4B5263]">Admin Email</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-[8px] outline-none transition-all"
                  style={{
                    border: "1px solid #D8DBE0",
                    backgroundColor: "white",
                    color: "#111318",
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#4B5263]">Admin Password</label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-[8px] outline-none transition-all"
                  style={{
                    border: "1px solid #D8DBE0",
                    backgroundColor: "white",
                    color: "#111318",
                  }}
                />
              </div>
              <Button
                type="submit"
                variant="escrow"
                size="md"
                className="w-full"
                isLoading={loginLoading}
              >
                Sign In to Treasury
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Filtered transactions
  const transactions = txData?.transactions || [];
  const filtered = transactions.filter((tx) => {
    if (statusFilter !== "ALL" && tx.status !== statusFilter) return false;
    if (selectedCharityFilter && tx.charity?.name !== selectedCharityFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = tx.title.toLowerCase().includes(q);
      const matchUser = tx.user?.email.toLowerCase().includes(q) || tx.user?.name.toLowerCase().includes(q);
      const matchCharity = tx.charity?.name.toLowerCase().includes(q);
      if (!matchTitle && !matchUser && !matchCharity) return false;
    }
    return true;
  });

  return (
    <div className="w-full" style={{ backgroundColor: "#F5F6F8", minHeight: "calc(100vh - 56px)" }}>
      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4" style={{ borderBottom: "1px solid #E8EAED" }}>
        <div>
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded"
              style={{ backgroundColor: "#0A6640", color: "white" }}
            >
              Admin
            </span>
            <h1
              className="text-2xl font-bold text-[#111318]"
              style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
            >
              Escrow Treasury &amp; Payout Console
            </h1>
          </div>
          <p className="text-xs text-[#6B7485] mt-1">
            Real-time custody ledger, settlement routing, and charity payouts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { refetchStats(); refetchTx(); }}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Ledger
          </Button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <Alert
          variant={actionMessage.type}
          title={actionMessage.type === "success" ? "Payout Dispatched" : "Payout Error"}
        >
          <div className="flex items-center justify-between">
            <span>{actionMessage.text}</span>
            {actionMessage.utr && (
              <span className="font-numeric text-xs font-bold bg-white/70 px-2 py-0.5 rounded border">
                UTR: {actionMessage.utr}
              </span>
            )}
          </div>
        </Alert>
      )}

      {/* Escrow Treasury Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-[12px] space-y-2" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E8EAED" }}>
          <div className="flex items-center justify-between text-[#6B7485] text-xs">
            <span>Total Escrow Inflow</span>
            <DollarSign className="h-4 w-4 text-[#0A6640]" />
          </div>
          <div className="text-2xl font-bold font-data text-[#0A6640]" style={{ fontFamily: "var(--font-data)" }}>
            {statsLoading ? "…" : `₹${((stats?.total_escrow_paise || 0) / 100).toLocaleString("en-IN")}`}
          </div>
          <p className="text-[11px] text-[#6B7485]">Across {stats?.total_commitments || 0} commitments</p>
        </div>

        <div className="p-5 rounded-[12px] space-y-2" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E8EAED" }}>
          <div className="flex items-center justify-between text-[#6B7485] text-xs">
            <span>Active Escrow Custody</span>
            <Lock className="h-4 w-4 text-[#1E4FD8]" />
          </div>
          <div className="text-2xl font-bold font-data text-[#1E4FD8]" style={{ fontFamily: "var(--font-data)" }}>
            {statsLoading ? "…" : `₹${((stats?.active_escrow_paise || 0) / 100).toLocaleString("en-IN")}`}
          </div>
          <p className="text-[11px] text-[#6B7485]">{stats?.active_count || 0} commitments under verification</p>
        </div>

        <div className="p-5 rounded-[12px] space-y-2" style={{ backgroundColor: "rgba(196,75,10,0.05)", border: "1px solid rgba(196,75,10,0.2)" }}>
          <div className="flex items-center justify-between text-[#6B7485] text-xs">
            <span>Disbursed to Charities</span>
            <Heart className="h-4 w-4 text-[#C44B0A]" />
          </div>
          <div className="text-2xl font-bold font-data text-[#C44B0A]" style={{ fontFamily: "var(--font-data)" }}>
            {statsLoading ? "…" : `₹${((stats?.donated_paise || 0) / 100).toLocaleString("en-IN")}`}
          </div>
          <p className="text-[11px] text-[#6B7485]">Via RazorpayX payout gateway</p>
        </div>

        <div className="p-5 rounded-[12px] space-y-2" style={{ backgroundColor: "rgba(10,102,64,0.05)", border: "1px solid rgba(10,102,64,0.2)" }}>
          <div className="flex items-center justify-between text-[#6B7485] text-xs">
            <span>Refunded to Developers</span>
            <TrendingUp className="h-4 w-4 text-[#0A6640]" />
          </div>
          <div className="text-2xl font-bold font-data text-[#0A6640]" style={{ fontFamily: "var(--font-data)" }}>
            {statsLoading ? "…" : `₹${((stats?.refunded_paise || 0) / 100).toLocaleString("en-IN")}`}
          </div>
          <p className="text-[11px] text-[#6B7485]">{stats?.completed_count || 0} goals achieved</p>
        </div>
      </div>

      {/* Charity Impact Breakdown & Treasury Balances */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#18181B] flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#047857]" />
              <span>Charity Impact Breakdown &amp; Treasury Balances</span>
            </h2>
            <p className="text-xs text-[#71717A]">
              Live breakdown of protocol funds received and pending for non-profit beneficiaries. Admin can add new charities or delete them.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedCharityFilter && (
              <button
                onClick={() => setSelectedCharityFilter("")}
                className="text-xs font-semibold text-[#047857] hover:underline"
              >
                ✕ Clear Filter ({selectedCharityFilter})
              </button>
            )}
            <Button
              onClick={() => setShowAddCharity(!showAddCharity)}
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Add Charity
            </Button>
          </div>
        </div>

        {/* Add Charity Inline Form */}
        {showAddCharity && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCharityName.trim() || !newCharityDesc.trim()) return;
              createCharityMutation.mutate({
                name: newCharityName.trim(),
                category: newCharityCategory,
                description: newCharityDesc.trim(),
                website_url: newCharityWebsite.trim() || undefined,
              });
            }}
            className="p-4 rounded-[8px] bg-white border border-[#047857] shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EB]">
              <h3 className="text-xs font-bold text-[#18181B] uppercase tracking-wider">
                Add New Beneficiary Charity
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCharity(false)}
                className="text-xs text-[#71717A] hover:text-[#18181B]"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#71717A]">Charity / NGO Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Save The Children India"
                  value={newCharityName}
                  onChange={(e) => setNewCharityName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-[6px] border border-[#E4E7EB] text-xs focus:outline-none focus:border-[#047857]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#71717A]">Category *</label>
                <select
                  value={newCharityCategory}
                  onChange={(e) => setNewCharityCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-[6px] border border-[#E4E7EB] text-xs bg-white focus:outline-none focus:border-[#047857]"
                >
                  <option value="Education">Education</option>
                  <option value="Poverty Relief">Poverty Relief</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Open Source">Open Source</option>
                  <option value="Environment">Environment</option>
                  <option value="Child Welfare">Child Welfare</option>
                  <option value="Animal Welfare">Animal Welfare</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-medium text-[#71717A]">Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe the cause, mission, and how funds will be used..."
                  value={newCharityDesc}
                  onChange={(e) => setNewCharityDesc(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-[6px] border border-[#E4E7EB] text-xs focus:outline-none focus:border-[#047857]"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-medium text-[#71717A]">Website URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://example.org"
                  value={newCharityWebsite}
                  onChange={(e) => setNewCharityWebsite(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-[6px] border border-[#E4E7EB] text-xs focus:outline-none focus:border-[#047857]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E7EB]">
              <Button
                type="button"
                onClick={() => setShowAddCharity(false)}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={createCharityMutation.isPending}
              >
                Create Charity
              </Button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(stats?.charity_breakdown || []).map((charity) => {
            const isSelected = selectedCharityFilter === charity.name;
            const receivedINR = charity.total_received_paise / 100;
            const pendingINR = charity.pending_disbursal_paise / 100;
            return (
              <div
                key={charity.charity_id}
                onClick={() => setSelectedCharityFilter(isSelected ? "" : charity.name)}
                className={`p-4 rounded-[8px] bg-white border cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#047857] ring-2 ring-[#047857]/20 shadow-sm"
                    : "border-[#E4E7EB] hover:border-[#9CA3AF]"
                } space-y-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-[#18181B]">
                      {charity.name}
                    </h3>
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-[#F4F4F5] text-[#71717A]">
                      {charity.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {charity.website_url && (
                      <a
                        href={charity.website_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-[#71717A] hover:text-[#18181B] rounded hover:bg-[#F4F4F5]"
                        title="Visit website"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete "${charity.name}" from the protocol?`)) {
                          deleteCharityMutation.mutate(charity.charity_id);
                        }
                      }}
                      className="p-1 text-[#EF4444] hover:text-[#DC2626] rounded hover:bg-[#FEE2E2] transition-colors"
                      title="Delete Charity"
                      disabled={deleteCharityMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E4E7EB] text-xs">
                  <div>
                    <div className="text-[11px] text-[#71717A]">Total Received</div>
                    <div className="text-base font-bold font-numeric text-[#DC2626]">
                      ₹{receivedINR.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#71717A]">Active In Custody</div>
                    <div className="text-base font-bold font-numeric text-[#2563EB]">
                      ₹{pendingINR.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#71717A] font-numeric pt-1 border-t border-[#E4E7EB]">
                  <span>{charity.disbursed_pledges_count} payouts completed</span>
                  <span>{charity.total_pledges_count} total pledges</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transactions & Settlement Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#18181B]">
              Escrow Settlement Ledger
            </h2>
            <p className="text-xs text-[#71717A]">
              Inspect developer stakes, payment IDs, charity destinations, and payout receipts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input
                type="text"
                placeholder="Search user, goal, charity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-[6px] border border-[#E4E7EB] bg-white text-[#18181B] focus:outline-none focus:border-[#047857] w-52"
              />
            </div>

            {/* Charity Filter Dropdown */}
            <select
              value={selectedCharityFilter}
              onChange={(e) => setSelectedCharityFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs rounded-[6px] border border-[#E4E7EB] bg-white text-[#18181B] focus:outline-none focus:border-[#047857]"
            >
              <option value="">All Charities</option>
              {(stats?.charity_breakdown || []).map((ch) => (
                <option key={ch.charity_id} value={ch.name}>
                  {ch.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs rounded-[6px] border border-[#E4E7EB] bg-white text-[#18181B] focus:outline-none focus:border-[#047857]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Escrow</option>
              <option value="FAILED">Failed / Donated</option>
              <option value="COMPLETED">Completed / Refunded</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="rounded-[12px] overflow-hidden" style={{ backgroundColor: "white", border: "1px solid #E8EAED" }}>
          {txLoading ? (
            <div className="p-8 text-center text-xs text-[#6B7485]">Loading treasury transactions…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6B7485]">No transactions match the selected filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ backgroundColor: "#1A1F2E", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-body, Inter, sans-serif)" }}>
                    <th className="p-3.5 font-medium">Commitment Goal</th>
                    <th className="p-3.5 font-medium">Developer</th>
                    <th className="p-3.5 font-medium">Stake</th>
                    <th className="p-3.5 font-medium">Beneficiary</th>
                    <th className="p-3.5 font-medium">Status</th>
                    <th className="p-3.5 font-medium">Payout / UTR</th>
                    <th className="p-3.5 font-medium text-right">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EB]">
                  {filtered.map((tx) => {
                    const stakeINR = tx.amount_paise / 100;
                    const isPendingAction =
                      payoutMutation.isPending &&
                      payoutMutation.variables?.commitmentId === tx.id;

                    return (
                      <tr key={tx.id} className="hover:bg-[#F8F9FA] transition-colors">
                        {/* Goal & Details */}
                        <td className="p-3.5 max-w-xs">
                          <div className="font-semibold text-[#18181B] truncate">
                            {tx.title}
                          </div>
                          <div className="text-[11px] text-[#71717A] mt-0.5">
                            Target: {tx.target_count} {tx.unit} &bull; {tx.evidence_type}
                          </div>
                        </td>

                        {/* Developer / User */}
                        <td className="p-3.5">
                          <div className="font-medium text-[#18181B]">
                            {tx.user?.name || "Anonymous User"}
                          </div>
                          <div className="text-[11px] text-[#71717A]">
                            {tx.user?.email || "—"}
                          </div>
                        </td>

                        {/* Escrow Stake */}
                        <td className="p-3.5 font-bold font-numeric text-[#18181B]">
                          ₹{stakeINR.toLocaleString("en-IN")}
                        </td>

                        {/* Beneficiary */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <Heart className="h-3 w-3 text-[#DC2626]" />
                            <span className="font-medium text-[#18181B]">
                              {tx.charity?.name || "Charity"}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#71717A]">
                            {tx.charity?.category || "Non-Profit"}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3.5">
                          {tx.status === "ACTIVE" ? (
                            <Badge variant="active" size="sm">
                              Active Escrow
                            </Badge>
                          ) : tx.status === "COMPLETED" ? (
                            <Badge variant="completed" size="sm">
                              Refunded
                            </Badge>
                          ) : tx.status === "FAILED" ? (
                            <Badge variant="failed" size="sm">
                              Donated
                            </Badge>
                          ) : (
                            <Badge variant="default" size="sm">
                              {tx.status}
                            </Badge>
                          )}
                        </td>

                        {/* Payout Details */}
                        <td className="p-3.5">
                          {tx.donation?.razorpayx_payout_id ? (
                            <span className="font-numeric text-[11px] bg-[#EFF6FF] text-[#1E40AF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                              {tx.donation.razorpayx_payout_id}
                            </span>
                          ) : tx.status === "COMPLETED" ? (
                            <span className="text-[11px] text-[#047857] flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Refunded to Card
                            </span>
                          ) : tx.status === "ACTIVE" ? (
                            <span className="text-[11px] text-[#71717A]">
                              Locked in Escrow
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#71717A]">—</span>
                          )}
                        </td>

                        {/* Settlement Action */}
                        <td className="p-3.5 text-right">
                          {tx.status === "ACTIVE" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="primary"
                                size="sm"
                                isLoading={isPendingAction}
                                onClick={() =>
                                  payoutMutation.mutate({
                                    commitmentId: tx.id,
                                    action: "donate",
                                  })
                                }
                                leftIcon={<Send className="h-3 w-3" />}
                              >
                                Send to Charity
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                isLoading={isPendingAction}
                                onClick={() =>
                                  payoutMutation.mutate({
                                    commitmentId: tx.id,
                                    action: "refund",
                                  })
                                }
                              >
                                Refund
                              </Button>
                            </div>
                          ) : tx.status === "FAILED" && !tx.donation?.razorpayx_payout_id ? (
                            <Button
                              variant="primary"
                              size="sm"
                              isLoading={isPendingAction}
                              onClick={() =>
                                payoutMutation.mutate({
                                  commitmentId: tx.id,
                                  action: "donate",
                                })
                              }
                              leftIcon={<Send className="h-3 w-3" />}
                            >
                              Dispatch Payout
                            </Button>
                          ) : (
                            <span className="text-[11px] text-[#047857] font-semibold flex items-center justify-end gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
