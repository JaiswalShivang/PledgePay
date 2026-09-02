"use client";

import { Alert } from "@/components/ui";

interface AnomalyBannerProps {
  reason?: string;
}

export function AnomalyBanner({ reason }: AnomalyBannerProps) {
  return (
    <Alert
      variant="warning"
      title="Evidence Anomaly Flagged"
    >
      {reason ||
        "An unusual burst of commits or unexpected timestamp clustering was detected during automatic rule evaluation."}
    </Alert>
  );
}
