"use client";

import { Badge } from "@/components/ui";
import { Heart } from "lucide-react";
import { Charity } from "@/lib/api-client";

interface CharityCardProps {
  charity: Charity;
}

export function CharityCard({ charity }: CharityCardProps) {
  return (
    <div className="p-4 rounded-[8px] bg-white border border-[#E4E7EB] space-y-2">
      <div className="flex items-center justify-between pb-2 border-b border-[#E4E7EB]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#18181B]">
          <Heart className="h-3.5 w-3.5 text-[#C2410C]" />
          <span>Beneficiary Cause</span>
        </div>
        <Badge variant="impact" size="sm">
          {charity.category}
        </Badge>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-[#18181B]">{charity.name}</h4>
        <p className="text-xs text-[#52525B] leading-relaxed">
          {charity.description}
        </p>
      </div>
    </div>
  );
}
