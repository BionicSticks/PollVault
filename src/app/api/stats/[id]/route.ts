import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { wilsonScore, marginOfError } from "@/lib/stats/confidence";
import { assessSampleSize } from "@/lib/stats/sample-size";
import { chiSquared } from "@/lib/stats/significance";
import { weightResults } from "@/lib/stats/weighting";
import type { VoteDemographic } from "@/lib/supabase/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch poll with options
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("*, options(id, label, position, vote_count)")
    .eq("id", id)
    .single();

  if (pollError || !poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  // Fetch demographic tallies
  const { data: demographics } = await supabase
    .from("vote_demographics")
    .select("*")
    .eq("poll_id", id);

  const options = (poll.options || []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  );
  const totalVotes = options.reduce(
    (sum: number, opt: { vote_count: number }) => sum + opt.vote_count,
    0
  );

  // Calculate per-option statistics
  const optionStats = options.map(
    (opt: { id: string; label: string; vote_count: number }) => {
      const proportion = totalVotes > 0 ? opt.vote_count / totalVotes : 0;
      const ci = wilsonScore(opt.vote_count, totalVotes);
      const moe = marginOfError(proportion, totalVotes);

      return {
        id: opt.id,
        label: opt.label,
        votes: opt.vote_count,
        proportion,
        percentage: (proportion * 100).toFixed(1),
        confidenceInterval: {
          lower: (ci.lower * 100).toFixed(1),
          upper: (ci.upper * 100).toFixed(1),
        },
        marginOfError: (moe * 100).toFixed(1),
      };
    }
  );

  // Sample size assessment
  const sampleAssessment = assessSampleSize(totalVotes, options.length);

  // Demographic breakdowns
  const tallies = (demographics || []) as VoteDemographic[];
  const demographicBreakdowns: Record<string, Record<string, Record<string, number>>> = {};

  // Build breakdown: { dimension: { group: { optionId: count } } }
  for (const dim of ["age_range", "gender", "country"] as const) {
    const breakdown: Record<string, Record<string, number>> = {};
    for (const row of tallies) {
      const group = row[dim];
      if (!breakdown[group]) breakdown[group] = {};
      breakdown[group][row.option_id] = (breakdown[group][row.option_id] || 0) + row.count;
    }
    demographicBreakdowns[dim] = breakdown;
  }

  // Chi-squared tests for each demographic dimension
  const significanceTests: Record<
    string,
    { statistic: number; pValue: number; significant: boolean }
  > = {};

  for (const dim of ["age_range", "gender"] as const) {
    const breakdown = demographicBreakdowns[dim];
    const groups = Object.keys(breakdown).filter((g) => g !== "unspecified");
    if (groups.length >= 2 && options.length >= 2) {
      const table = options.map(
        (opt: { id: string }) =>
          groups.map((group) => breakdown[group]?.[opt.id] || 0)
      );
      const result = chiSquared(table);
      significanceTests[dim] = {
        statistic: parseFloat(result.statistic.toFixed(3)),
        pValue: parseFloat(result.pValue.toFixed(4)),
        significant: result.significant,
      };
    }
  }

  // Weighted results
  const weightedByAge = weightResults(
    tallies.map((t) => ({ ...t, option_id: t.option_id })),
    "age_range"
  );
  const weightedByGender = weightResults(
    tallies.map((t) => ({ ...t, option_id: t.option_id })),
    "gender"
  );

  return NextResponse.json({
    poll: {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      type: poll.type,
      status: poll.status,
    },
    totalVotes,
    options: optionStats,
    sampleAssessment,
    demographics: demographicBreakdowns,
    significanceTests,
    weighted: {
      byAge: weightedByAge,
      byGender: weightedByGender,
    },
  });
}
