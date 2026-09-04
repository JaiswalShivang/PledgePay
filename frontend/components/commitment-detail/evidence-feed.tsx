"use client";

import { Button } from "@/components/ui";
import {
  GitBranch,
  RefreshCw,
  ExternalLink,
  Trophy,
  CheckCircle2,
} from "lucide-react";
import { EvidenceItem, GitHubRepoItem, Commitment } from "@/lib/api-client";

interface EvidenceFeedProps {
  commitment: Commitment;
  evidenceData?: EvidenceItem[];
  userRepos?: GitHubRepoItem[];
  activeRepo: string;
  isLinkingRepo: boolean;
  isSyncing: boolean;
  onRepoChange: (repo: string) => void;
  onLinkRepo: () => void;
  onSyncNow: () => void;
}

export function EvidenceFeed({
  commitment,
  evidenceData,
  userRepos = [],
  activeRepo,
  isLinkingRepo,
  isSyncing,
  onRepoChange,
  onLinkRepo,
  onSyncNow,
}: EvidenceFeedProps) {
  const isCodeforces = commitment.evidence_type === "codeforces_submissions";

  return (
    <div className="p-8 rounded-[12px] bg-white border border-[#F2F3F7] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3F7]">
        <div className="space-y-1">
          <h2 className="text-subhead text-[#16161A] flex items-center gap-2">
            {isCodeforces ? (
              <Trophy className="h-5 w-5 text-[#FF6B35]" />
            ) : (
              <GitBranch className="h-5 w-5 text-[#3D5AFE]" />
            )}
            <span>
              {isCodeforces
                ? "Codeforces Verification & Solved Problems"
                : "GitHub Repository & Evidence Feed"}
            </span>
          </h2>
          <p className="text-[14px] text-[#16161A]/70 font-body">
            {isCodeforces
              ? "Automated continuous polling of accepted problem submissions from Codeforces."
              : "Automated daily polling of commits, PRs, and closed milestones."}
          </p>
        </div>

        <Button
          onClick={onSyncNow}
          variant="outline"
          size="sm"
          isLoading={isSyncing}
          leftIcon={<RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />}
        >
          {isSyncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {isCodeforces ? (
        <div className="flex items-center justify-between p-4 rounded-[12px] bg-[#F2F3F7] text-[14px] font-body text-[#16161A]">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-4 w-4 text-[#FF6B35]" />
            <span className="font-medium">
              Verified Codeforces Polling Active
            </span>
          </div>
          <a
            href="https://codeforces.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-[#3D5AFE] hover:underline font-medium"
          >
            <span>Open Codeforces</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full">
            {userRepos.length > 0 ? (
              <select
                value={activeRepo}
                onChange={(e) => onRepoChange(e.target.value)}
                className="w-full rounded-[12px] border border-[#D8DBE0] bg-white px-4 py-2.5 text-[14px] font-body text-[#16161A] focus:outline-none focus:border-[#3D5AFE]"
              >
                <option value="" disabled>Select a repository...</option>
                {userRepos.map((repo) => (
                  <option key={repo.id} value={repo.full_name}>
                    {repo.full_name} {repo.private ? "(Private)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="e.g. username/repository"
                value={activeRepo}
                onChange={(e) => onRepoChange(e.target.value)}
                className="w-full rounded-[12px] border border-[#D8DBE0] bg-white px-4 py-2.5 text-[14px] font-body text-[#16161A] focus:outline-none focus:border-[#3D5AFE]"
              />
            )}
          </div>
          <Button
            onClick={onLinkRepo}
            variant="primary"
            size="md"
            isLoading={isLinkingRepo}
            disabled={!activeRepo}
            className="w-full sm:w-auto shrink-0"
          >
            Link Repository
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-medium text-[#16161A]/70 font-body">
            Polled Evidence {evidenceData ? `(${evidenceData.length})` : ""}
          </h3>
          {isSyncing && (
            <span className="inline-flex items-center gap-1.5 text-[14px] text-[#3D5AFE] font-body">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Polling…
            </span>
          )}
        </div>

        {evidenceData === undefined ? (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 rounded-[12px] bg-[#F2F3F7] animate-pulse" />
            ))}
          </div>
        ) : evidenceData.length === 0 ? (
          <div className="p-8 text-center rounded-[12px] bg-[#F2F3F7] text-[14px] text-[#16161A]/60 font-body">
            No evidence events synced yet. Sync manually or push commits to trigger polling.
          </div>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {evidenceData.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between p-4 rounded-[12px] bg-white border border-[#F2F3F7] hover:border-[#3D5AFE] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-[12px] bg-[#00C896] text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[#16161A] truncate font-body">
                      {ev.raw_payload?.title || ev.raw_payload?.message || ev.raw_payload?.problem_name || "Verified Submission"}
                    </p>
                    <p className="text-[14px] text-[#16161A]/50 font-body">
                      {new Date(ev.occurred_at || ev.ingested_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
                <span className="text-[14px] px-2.5 py-1 rounded-[12px] font-medium bg-[#00C896] text-white shrink-0 font-body">
                  +1 {commitment.unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
