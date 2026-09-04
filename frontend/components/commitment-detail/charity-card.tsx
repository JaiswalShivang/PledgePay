"use client";

import { Heart, ExternalLink } from "lucide-react";
import { Charity } from "@/lib/api-client";

interface CharityCardProps {
  charity: Charity;
}

export function CharityCard({ charity }: CharityCardProps) {
  return (
    <div className="rounded-[12px] bg-white border-2 border-[#FF3D71] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#F2F3F7]">
        <div className="flex items-center gap-2.5">
          <Heart className="h-5 w-5 text-[#FF3D71] shrink-0" />
          <span className="text-[14px] font-bold text-[#FF3D71] font-display">
            Fallback Beneficiary
          </span>
        </div>
        <span className="text-[14px] px-3 py-1 rounded-[12px] font-medium bg-[#FF3D71] text-white font-body">
          {charity.category}
        </span>
      </div>

      <div className="px-6 py-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-subhead text-[#16161A]">
            {charity.name}
          </h4>
          {charity.website_url && (
            <a
              href={charity.website_url}
              target="_blank"
              rel="noreferrer"
              className="text-[#FF3D71] hover:text-[#e6295d] transition-colors shrink-0"
              aria-label={`Visit ${charity.name} website`}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
        {charity.description && (
          <p className="text-[14px] text-[#16161A]/70 leading-relaxed font-body">
            {charity.description}
          </p>
        )}
        <p className="text-[14px] text-[#FF3D71] font-medium font-body pt-1">
          If you miss your goal, 100% of your stake transfers directly to this accredited non-profit.
        </p>
      </div>
    </div>
  );
}
