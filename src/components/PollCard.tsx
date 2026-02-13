"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { Poll } from "@/lib/supabase/types";

interface PollCardProps {
  poll: Poll;
  index?: number;
}

export function PollCard({ poll, index = 0 }: PollCardProps) {
  const totalVotes =
    poll.options?.reduce((sum, opt) => sum + opt.vote_count, 0) || 0;
  const topOption = poll.options?.reduce(
    (max, opt) => (opt.vote_count > (max?.vote_count || 0) ? opt : max),
    poll.options[0]
  );
  const topPct =
    totalVotes > 0 && topOption
      ? ((topOption.vote_count / totalVotes) * 100).toFixed(0)
      : null;

  const timeAgo = getTimeAgo(poll.created_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link href={`/polls/${poll.id}`}>
        <div className="glass rounded-2xl p-5 hover:bg-white/[0.07] transition-all cursor-pointer group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-2">
                {poll.title}
              </h3>
              {poll.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {poll.description}
                </p>
              )}
            </div>
            {topPct && (
              <div className="text-right shrink-0">
                <span className="text-2xl font-bold gradient-text">
                  {topPct}%
                </span>
                <p className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                  {topOption?.label}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {poll.featured && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-primary/20 text-primary border-0"
              >
                Featured
              </Badge>
            )}
            {poll.categories && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-[oklch(0.7_0.15_190)]/20 text-[oklch(0.7_0.15_190)] border-0"
              >
                {poll.categories.name}
              </Badge>
            )}
            {poll.organisations && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-[oklch(0.7_0.2_280)]/20 text-[oklch(0.7_0.2_280)] border-0"
              >
                {poll.organisations.name}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {poll.options?.length || 0} options
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            {poll.profiles?.display_name && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  by {poll.profiles.display_name}
                </span>
              </>
            )}
          </div>

          {/* Mini bar preview */}
          {totalVotes > 0 && poll.options && (
            <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5 mt-3">
              {poll.options
                .sort((a, b) => b.vote_count - a.vote_count)
                .map((opt, i) => {
                  const pct = (opt.vote_count / totalVotes) * 100;
                  const colors = [
                    "bg-[oklch(0.7_0.2_280)]",
                    "bg-[oklch(0.7_0.15_190)]",
                    "bg-[oklch(0.75_0.15_150)]",
                    "bg-[oklch(0.65_0.25_310)]",
                    "bg-[oklch(0.7_0.2_30)]",
                  ];
                  return (
                    <div
                      key={opt.id}
                      className={`h-full ${colors[i % colors.length]}`}
                      style={{ width: `${pct}%` }}
                    />
                  );
                })}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function getTimeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
