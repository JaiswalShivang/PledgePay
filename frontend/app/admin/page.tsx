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
  Heart,
  KeyRound,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Button,
  Badge,
  Alert,
  Input,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogCloseButton,
} from "@/components/ui";

export default function AdminPage() {
  const { user, login } = useAuth();
  const queryClient = useQueryClient();

  const [adminEmail, setAdminEmail] = useState("admin@admin.com");
  const [adminPassword, setAdminPassword] = useState("admin123");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
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
      setLoginError(err instanceof Error ? err.message : "Failed to sign in as admin");
    } finally {
      setLoginLoading(false);
    }
  };

  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => apiClient.admin.getStats(),
    enabled: isAdmin,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const {
    data: txData,
    isLoading: isTxLoading,
    refetch: refetchTx,
  } = useQuery<{ transactions: AdminTransaction[]; count: number }>({
    queryKey: ["admin", "transactions"],
    queryFn: () => apiClient.admin.getTransactions(),
    enabled: isAdmin,
    staleTime: 30000,
    refetchInterval: 30000,
  });

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
      setActionMessage({
        type: "destructive",
        text: err instanceof Error ? err.message : "Failed to release payout",
      });
    },
  });

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
        text: `Charity "${data.charity.name}" added successfully.`,
      });
      setShowAddCharity(false);
      setNewCharityName("");
      setNewCharityDesc("");
      setNewCharityWebsite("");
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
    onSuccess: (data) => {
      setActionMessage({
        type: "success",
        text: data.message || "Charity deleted successfully.",
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

  if (!isAdmin) {
    return (
      <div className="w-full bg-white min-h-[calc(100vh-64px)] flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 rounded-[12px] bg-white border border-[#F2F3F7] space-y-6">
          <div className="space-y-2 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#16161A] text-white mx-auto">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-section text-[#16161A]">Treasury Console</h1>
            <p className="text-[14px] text-[#16161A]/60 font-body">
              Restricted escrow settlement and payout portal.
            </p>
          </div>

          {loginError && (
            <Alert variant="destructive" title="Access Denied">{loginError}</Alert>
          )}

          <div className="p-4 rounded-[12px] bg-[#F2F3F7] space-y-1 text-[14px] font-body text-[#16161A]">
            <p className="font-bold flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-[#3D5AFE]" />
              Default Credentials
            </p>
            <p className="text-[14px] text-[#16161A]/80">
              Email: <strong className="text-[#3D5AFE]">admin@admin.com</strong> &bull; Password: <strong className="text-[#3D5AFE]">admin123</strong>
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[14px] font-medium text-[#16161A] font-body">Email</label>
              <Input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[14px] font-medium text-[#16161A] font-body">Password</label>
              <Input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loginLoading}
            >
              Sign In to Treasury
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const transactions = txData?.transactions || [];
  const filtered = transactions.filter((tx) => {
    if (statusFilter !== "ALL" && tx.status !== statusFilter) return false;
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
    <div className="w-full bg-white min-h-[calc(100vh-64px)]">
      <div className="container mx-auto max-w-5xl px-4 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3F7]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="primary" size="sm">Admin</Badge>
              <h1 className="text-section text-[#16161A]">Treasury Console</h1>
            </div>
            <p className="text-[14px] text-[#16161A]/70 font-body">
              Real-time escrow custody ledger, payout routing, and beneficiary management.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchStats();
              refetchTx();
            }}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh Ledger
          </Button>
        </div>

        {actionMessage && (
          <Alert
            variant={actionMessage.type}
            title={actionMessage.type === "success" ? "Operation Succeeded" : "Operation Error"}
          >
            {actionMessage.text}
            {actionMessage.utr && (
              <p className="mt-1 font-display font-bold">UTR: {actionMessage.utr}</p>
            )}
          </Alert>
        )}

        {isStatsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-6 rounded-[12px] bg-[#F2F3F7] animate-pulse h-32" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-[12px] bg-white border border-[#F2F3F7] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-[#16161A]/60 font-body">Total Escrow</span>
                <Lock className="h-4 w-4 text-[#FF6B35]" />
              </div>
              <div className="text-[32px] font-bold font-display text-[#FF6B35]">
                ₹{(stats.total_escrow_paise / 100).toLocaleString("en-IN")}
              </div>
              <p className="text-[14px] text-[#16161A]/50 font-body">
                {stats.total_commitments} commitments total
              </p>
            </div>

            <div className="p-6 rounded-[12px] bg-white border border-[#F2F3F7] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-[#16161A]/60 font-body">Active Custody</span>
                <RefreshCw className="h-4 w-4 text-[#3D5AFE]" />
              </div>
              <div className="text-[32px] font-bold font-display text-[#3D5AFE]">
                ₹{(stats.active_escrow_paise / 100).toLocaleString("en-IN")}
              </div>
              <p className="text-[14px] text-[#16161A]/50 font-body">
                {stats.active_count} active pledges
              </p>
            </div>

            <div className="p-6 rounded-[12px] bg-white border border-[#F2F3F7] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-[#16161A]/60 font-body">Refunded Principal</span>
                <CheckCircle2 className="h-4 w-4 text-[#00C896]" />
              </div>
              <div className="text-[32px] font-bold font-display text-[#00C896]">
                ₹{(stats.refunded_paise / 100).toLocaleString("en-IN")}
              </div>
              <p className="text-[14px] text-[#16161A]/50 font-body">
                {stats.completed_count} verified completed
              </p>
            </div>

            <div className="p-6 rounded-[12px] bg-white border border-[#F2F3F7] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-[#16161A]/60 font-body">Donated Impact</span>
                <Heart className="h-4 w-4 text-[#FF3D71]" />
              </div>
              <div className="text-[32px] font-bold font-display text-[#FF3D71]">
                ₹{(stats.donated_paise / 100).toLocaleString("en-IN")}
              </div>
              <p className="text-[14px] text-[#16161A]/50 font-body">
                {stats.failed_count} missed commitments
              </p>
            </div>
          </div>
        ) : null}

        <div className="rounded-[12px] bg-white border border-[#F2F3F7] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-subhead text-[#16161A]">Charities &amp; Impact Partners</h2>
              <p className="text-[14px] text-[#16161A]/60 font-body">
                Manage vetted 501(c)(3) and Section 8 partner accounts.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddCharity(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Charity
            </Button>
          </div>

          <div className="space-y-3">
            {stats?.charity_breakdown && stats.charity_breakdown.length > 0 ? (
              stats.charity_breakdown.map((c) => (
                <div
                  key={c.charity_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[12px] bg-[#F2F3F7]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-bold text-[#16161A] font-display">{c.name}</span>
                      <span className="text-[14px] px-2.5 py-0.5 rounded-[12px] bg-white text-[#FF3D71] font-bold font-body">
                        {c.category}
                      </span>
                    </div>
                    <div className="text-[14px] text-[#16161A]/60 font-body">
                      Received: ₹{(c.total_received_paise / 100).toLocaleString("en-IN")} &bull; Pledges: {c.total_pledges_count}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.website_url && (
                      <a
                        href={c.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#16161A]/50 hover:text-[#16161A]"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCharityMutation.mutate(c.charity_id)}
                      className="text-[#FF3D71] hover:bg-[#FF3D71]/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[14px] text-[#16161A]/50 font-body text-center py-4">No charities configured.</p>
            )}
          </div>
        </div>

        <div className="rounded-[12px] bg-white border border-[#F2F3F7] p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-subhead text-[#16161A]">Custody Ledger &amp; Manual Payouts</h2>
            <p className="text-[14px] text-[#16161A]/60 font-body">
              Inspect all pledge transactions, evidence logs, and execute manual resolution overrides.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#16161A]/40" />
              <input
                type="text"
                placeholder="Search by title, user, or charity…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 text-[14px] rounded-[12px] border border-[#D8DBE0] bg-white text-[#16161A] outline-none focus:border-[#3D5AFE] font-body"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 text-[14px] rounded-[12px] border border-[#D8DBE0] bg-white text-[#16161A] font-body focus:outline-none focus:border-[#3D5AFE]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
              <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
            </select>
          </div>

          <div className="space-y-3">
            {isTxLoading && filtered.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="p-5 rounded-[12px] bg-[#F2F3F7] animate-pulse h-20" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-[14px] text-[#16161A]/50 font-body">
                No transactions match the selected filters.
              </p>
            ) : (
              filtered.map((tx) => (
                <div
                  key={tx.id}
                  className="p-5 rounded-[12px] bg-white border border-[#F2F3F7] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          tx.status === "COMPLETED" ? "verified" :
                            tx.status === "FAILED" ? "charity" :
                              tx.status === "ACTIVE" ? "active" : "stake"
                        }
                        size="sm"
                      >
                        {tx.status}
                      </Badge>
                      <span className="text-[16px] font-bold text-[#16161A] truncate font-display">
                        {tx.title}
                      </span>
                    </div>
                    <div className="text-[14px] text-[#16161A]/60 font-body">
                      User: {tx.user?.name || tx.user?.email || "Unknown"} &bull; Cause: {tx.charity?.name || "None"}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[20px] font-bold font-display text-[#FF6B35]">
                      ₹{(tx.amount_paise / 100).toLocaleString("en-IN")}
                    </span>

                    {tx.status === "ACTIVE" && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="verified"
                          size="sm"
                          onClick={() => payoutMutation.mutate({ commitmentId: tx.id, action: "refund" })}
                          isLoading={payoutMutation.isPending}
                        >
                          Refund
                        </Button>
                        <Button
                          variant="charity"
                          size="sm"
                          onClick={() => payoutMutation.mutate({ commitmentId: tx.id, action: "donate" })}
                          isLoading={payoutMutation.isPending}
                        >
                          Donate
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <Dialog open={showAddCharity} onOpenChange={setShowAddCharity}>
          <DialogHeader>
            <DialogTitle>Add Accredited Charity</DialogTitle>
            <DialogDescription>
              Register a new beneficiary organization for missed commitment routing.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCharityMutation.mutate({
                name: newCharityName,
                category: newCharityCategory,
                description: newCharityDesc,
                website_url: newCharityWebsite || undefined,
              });
            }}
            className="space-y-4 pt-4"
          >
            <div className="space-y-1.5">
              <label className="text-[14px] font-medium text-[#16161A] font-body">Organization Name</label>
              <Input
                required
                value={newCharityName}
                onChange={(e) => setNewCharityName(e.target.value)}
                placeholder="e.g. Clean Water Action"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[14px] font-medium text-[#16161A] font-body">Category</label>
              <select
                value={newCharityCategory}
                onChange={(e) => setNewCharityCategory(e.target.value)}
                className="w-full rounded-[12px] border border-[#D8DBE0] bg-white px-3.5 py-2.5 text-[14px] text-[#16161A] font-body focus:outline-none focus:border-[#3D5AFE]"
              >
                <option value="Education">Education</option>
                <option value="Poverty Relief">Poverty Relief</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Environment">Environment</option>
                <option value="Open Education">Open Education</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[14px] font-medium text-[#16161A] font-body">Mission Description</label>
              <Input
                required
                value={newCharityDesc}
                onChange={(e) => setNewCharityDesc(e.target.value)}
                placeholder="Brief description of charitable work"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[14px] font-medium text-[#16161A] font-body">Website URL</label>
              <Input
                value={newCharityWebsite}
                onChange={(e) => setNewCharityWebsite(e.target.value)}
                placeholder="https://example.org"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setShowAddCharity(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={createCharityMutation.isPending}
              >
                Register Charity
              </Button>
            </DialogFooter>
          </form>

          <DialogCloseButton onClose={() => setShowAddCharity(false)} />
        </Dialog>
      </div>
    </div>
  );
}
