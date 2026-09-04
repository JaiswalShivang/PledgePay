"use client";

import { Heart, ExternalLink } from "lucide-react";
import { Charity } from "@/lib/api-client";

interface CharityCardProps {
  charity: Charity;
}

export function CharityCard({ charity }: CharityCardProps) {
  return (
    <div
      className="rounded-[12px] overflow-hidden"
      style={{
        backgroundColor: "#FFF7ED",
        border: "1px solid #FDBA74",
        borderLeft: "4px solid #C44B0A",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(253,186,116,0.5)" }}
      >
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-[#C44B0A] shrink-0" />
          <span
            className="text-xs font-semibold text-[#9A3412]"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
          >
            Your Safety Net
          </span>
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: "rgba(196,75,10,0.12)", color: "#C44B0A" }}
        >
          {charity.category}
        </span>
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4
            className="text-sm font-semibold text-[#111318]"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
          >
            {charity.name}
          </h4>
          {charity.website_url && (
            <a
              href={charity.website_url}
              target="_blank"
              rel="noreferrer"
              className="text-[#C44B0A] hover:text-[#A33D08] transition-colors shrink-0"
              aria-label={`Visit ${charity.name} website`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        {charity.description && (
          <p className="text-xs text-[#4B5263] leading-relaxed">{charity.description}</p>
        )}
        <p className="text-[11px]" style={{ color: "#C44B0A" }}>
          If you miss your goal, 100% of your stake funds this cause.
        </p>
      </div>
    </div>
  );
}
