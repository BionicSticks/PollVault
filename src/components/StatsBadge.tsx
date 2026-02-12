"use client";

import { Badge } from "@/components/ui/badge";
import type { SampleAdequacy } from "@/lib/stats/sample-size";

const adequacyColors: Record<SampleAdequacy, string> = {
  excellent: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  good: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  fair: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  insufficient: "bg-red-500/20 text-red-300 border-red-500/30",
};

interface StatsBadgeProps {
  adequacy: SampleAdequacy;
  label: string;
  description: string;
}

export function StatsBadge({ adequacy, label, description }: StatsBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge className={`${adequacyColors[adequacy]} border text-xs`}>
        {label}
      </Badge>
      <span className="text-xs text-muted-foreground">{description}</span>
    </div>
  );
}
