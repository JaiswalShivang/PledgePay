"use client";

import { Button } from "@/components/ui";
import { GitBranch, GitCommit, GitPullRequest, RefreshCw, ExternalLink, Check } from "lucide-react";
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
  evidenceData = [],
  userRepos = [],
  activeRepo,
  isLinkingRepo,
  isSyncing,
  onRepoChange,
  onLinkRepo,
  onSyncNow,
}: EvidenceFeedProps) {
  return (
    <div className="p-5 rounded-[8px] bg-white border border-[#E4E7EB] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4E7EB]">
        <div>
          <h2 className="text-sm font-semibold text-[#18181B] flex items-center gap-1.5">
            <GitBranch className="h-4 w-4 text-[#52525B]" />
            <span>GitHub Repository & Evidence</span>
          </h2>
          <p className="text-xs text-[#52525B]">
            Automated polling of commits, PRs, and closed issues.
          </p>
        </div>

        <Button
          onClick={onSyncNow}
          variant="secondary"
          size="sm"
          isLoading={isSyncing}
          leftIcon={<RefreshCw className="h-3.5 w-3.5 text-[#52525B]" />}
        >
          {isSyncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {/* Repo Selector */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="w-full">
          {userRepos.length > 0 ? (
            <select
              value={activeRepo}
              onChange={(e) => onRepoChange(e.target.value)}
              className="w-full rounded-[6px] border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-numeric text-[#18181B] outline-none focus:border-[#047857]"
            >
              {userRepos.map((repo) => (
                <option key={repo.id} value={repo.full_name}>
                  {repo.full_name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={activeRepo}
              onChange={(e) => onRepoChange(e.target.value)}
              placeholder="e.g. username/repository-name"
              className="w-full rounded-[6px] border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-numeric text-[#18181B] placeholder-[#9CA3AF] outline-none focus:border-[#047857]"
            />
          )}
        </div>

        <Button
          onClick={onLinkRepo}
          variant={activeRepo === commitment.github_repo ? "outline" : "primary"}
          size="sm"
          isLoading={isLinkingRepo}
          disabled={activeRepo === commitment.github_repo || !activeRepo}
          className="shrink-0 w-full sm:w-auto"
          leftIcon={<Check className="h-3.5 w-3.5" />}
        >
          {activeRepo === commitment.github_repo ? "Linked" : "Link Repo"}
        </Button>
      </div>

      {/* Evidence Stream */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs text-[#71717A]">
          <span className="font-medium text-[#18181B]">
            Evidence Stream ({evidenceData.length})
          </span>
          <span className="font-numeric text-[11px]">Deduplicated</span>
        </div>

        {evidenceData.length > 0 ? (
          <div className="divide-y divide-[#E4E7EB] rounded-[6px] border border-[#E4E7EB] bg-[#F8F9FA]">
            {evidenceData.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 hover:bg-white transition-colors"
              >
                <div className="flex items-start gap-2">
                  {ev.source === "github_commit" ? (
                    <GitCommit className="h-3.5 w-3.5 text-[#047857] mt-0.5 shrink-0" />
                  ) : (
                    <GitPullRequest className="h-3.5 w-3.5 text-[#1D4ED8] mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-medium text-[#18181B]">
                      {ev.raw_payload.message || ev.raw_payload.title || ev.source_ref}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#71717A] mt-0.5 font-numeric">
                      <span>{ev.source_ref}</span>
                      <span>•</span>
                      <span>{new Date(ev.occurred_at).toLocaleDateString()}</span>
                      {ev.raw_payload.author && (
                        <>
                          <span>•</span>
                          <span>@{ev.raw_payload.author}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {ev.raw_payload.url && (
                  <a
                    href={ev.raw_payload.url}
                    target="_blank"
                    rel="noreferrer"
                    className="self-end sm:self-center flex items-center gap-1 text-[11px] text-[#52525B] hover:text-[#18181B] transition-colors"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[6px] border border-dashed border-[#E4E7EB] p-5 text-center text-xs text-[#71717A] space-y-1">
            <div className="font-medium text-[#18181B]">No evidence polled yet</div>
            <p className="text-[11px] text-[#71717A]">
              Push code to your repository or click &quot;Sync Now&quot;.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
