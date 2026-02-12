"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsBadge } from "@/components/StatsBadge";
import { motion } from "framer-motion";
import type { SampleAdequacy } from "@/lib/stats/sample-size";

interface OptionStat {
  id: string;
  label: string;
  votes: number;
  proportion: number;
  percentage: string;
  confidenceInterval: { lower: string; upper: string };
  marginOfError: string;
}

interface StatsData {
  poll: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    status: string;
  };
  totalVotes: number;
  options: OptionStat[];
  sampleAssessment: {
    adequacy: SampleAdequacy;
    label: string;
    description: string;
  };
  demographics: Record<string, Record<string, Record<string, number>>>;
  significanceTests: Record<
    string,
    { statistic: number; pValue: number; significant: boolean }
  >;
  weighted: {
    byAge: Array<{
      optionId: string;
      rawProportion: number;
      weightedProportion: number;
    }>;
    byGender: Array<{
      optionId: string;
      rawProportion: number;
      weightedProportion: number;
    }>;
  };
}

// Neon bar colors
const barColors = [
  "from-[oklch(0.7_0.2_280)] to-[oklch(0.6_0.25_280)]",
  "from-[oklch(0.7_0.15_190)] to-[oklch(0.6_0.2_190)]",
  "from-[oklch(0.75_0.15_150)] to-[oklch(0.65_0.2_150)]",
  "from-[oklch(0.65_0.25_310)] to-[oklch(0.55_0.3_310)]",
  "from-[oklch(0.7_0.2_30)] to-[oklch(0.6_0.25_30)]",
];

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/stats/${id}`);
      if (res.ok) {
        setStats(await res.json());
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Poll not found
      </div>
    );
  }

  const optionLabels: Record<string, string> = {};
  stats.options.forEach((o) => {
    optionLabels[o.id] = o.label;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <Card className="glass-strong border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{stats.poll.title}</CardTitle>
                {stats.poll.description && (
                  <CardDescription className="text-base mt-1">
                    {stats.poll.description}
                  </CardDescription>
                )}
              </div>
              <Badge variant="outline" className="border-white/20 text-lg px-4 py-1">
                {stats.totalVotes} votes
              </Badge>
            </div>
            <div className="mt-3">
              <StatsBadge
                adequacy={stats.sampleAssessment.adequacy}
                label={stats.sampleAssessment.label}
                description={stats.sampleAssessment.description}
              />
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      <Tabs defaultValue="results" className="space-y-4">
        <TabsList className="glass border-white/10">
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="weighted">Weighted</TabsTrigger>
        </TabsList>

        {/* Results Tab */}
        <TabsContent value="results">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {stats.options
              .sort((a, b) => b.votes - a.votes)
              .map((option, index) => (
                <Card key={option.id} className="glass border-white/10">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{option.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold gradient-text">
                          {option.percentage}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({option.votes} votes)
                        </span>
                      </div>
                    </div>

                    {/* Animated bar */}
                    <div className="h-3 rounded-full bg-white/5 overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${option.proportion * 100}%`,
                        }}
                        transition={{
                          duration: 1,
                          delay: index * 0.1,
                          ease: "easeOut",
                        }}
                        className={`h-full rounded-full bg-gradient-to-r ${barColors[index % barColors.length]}`}
                      />
                    </div>

                    {/* Stats row */}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        CI: {option.confidenceInterval.lower}% –{" "}
                        {option.confidenceInterval.upper}%
                      </span>
                      <span>MOE: ±{option.marginOfError}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </motion.div>
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics">
          <div className="space-y-6">
            {(["age_range", "gender", "country"] as const).map((dim) => {
              const breakdown = stats.demographics[dim];
              if (!breakdown || Object.keys(breakdown).length === 0) return null;

              const sigTest = stats.significanceTests[dim];
              const dimLabel =
                dim === "age_range"
                  ? "Age Range"
                  : dim.charAt(0).toUpperCase() + dim.slice(1);

              return (
                <Card key={dim} className="glass border-white/10">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{dimLabel}</CardTitle>
                      {sigTest && (
                        <Badge
                          className={`text-xs border ${
                            sigTest.significant
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              : "bg-white/5 text-muted-foreground border-white/10"
                          }`}
                        >
                          {sigTest.significant
                            ? `Significant (p=${sigTest.pValue})`
                            : `Not significant (p=${sigTest.pValue})`}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(breakdown)
                        .filter(([group]) => group !== "unspecified")
                        .map(([group, optionCounts]) => {
                          const groupTotal = Object.values(optionCounts).reduce(
                            (a, b) => a + b,
                            0
                          );
                          return (
                            <div key={group}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium capitalize">
                                  {group.replace("-", " ")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  n={groupTotal}
                                </span>
                              </div>
                              <div className="flex h-6 rounded-full overflow-hidden bg-white/5">
                                {stats.options.map((opt, i) => {
                                  const count = optionCounts[opt.id] || 0;
                                  const pct =
                                    groupTotal > 0
                                      ? (count / groupTotal) * 100
                                      : 0;
                                  if (pct === 0) return null;
                                  return (
                                    <motion.div
                                      key={opt.id}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{
                                        duration: 0.8,
                                        ease: "easeOut",
                                      }}
                                      className={`h-full bg-gradient-to-r ${barColors[i % barColors.length]} flex items-center justify-center`}
                                      title={`${opt.label}: ${pct.toFixed(1)}%`}
                                    >
                                      {pct > 12 && (
                                        <span className="text-[10px] font-medium text-white/90 truncate px-1">
                                          {pct.toFixed(0)}%
                                        </span>
                                      )}
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                      {/* Legend */}
                      <div className="flex flex-wrap gap-3 pt-2">
                        {stats.options.map((opt, i) => (
                          <div
                            key={opt.id}
                            className="flex items-center gap-1.5"
                          >
                            <div
                              className={`w-3 h-3 rounded-sm bg-gradient-to-r ${barColors[i % barColors.length]}`}
                            />
                            <span className="text-xs text-muted-foreground">
                              {opt.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Weighted Tab */}
        <TabsContent value="weighted">
          <Card className="glass border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">
                Demographically Weighted Results
              </CardTitle>
              <CardDescription>
                Results adjusted to account for over/under-representation of
                demographic groups compared to known population distributions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(
                [
                  { key: "byAge", label: "Weighted by Age" },
                  { key: "byGender", label: "Weighted by Gender" },
                ] as const
              ).map(({ key, label }) => {
                const weightedData = stats.weighted[key];
                if (!weightedData || weightedData.length === 0) return null;

                return (
                  <div key={key}>
                    <h4 className="text-sm font-medium mb-3">{label}</h4>
                    <div className="space-y-2">
                      {weightedData.map((item, i) => {
                        const optLabel =
                          optionLabels[item.optionId] || item.optionId;
                        return (
                          <div
                            key={item.optionId}
                            className="flex items-center gap-4"
                          >
                            <span className="text-sm w-32 truncate">
                              {optLabel}
                            </span>
                            <div className="flex-1 flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{
                                    width: `${item.weightedProportion * 100}%`,
                                  }}
                                  transition={{ duration: 0.8 }}
                                  className={`h-full rounded-full bg-gradient-to-r ${barColors[i % barColors.length]}`}
                                />
                              </div>
                              <span className="text-xs font-mono w-16 text-right">
                                {(item.weightedProportion * 100).toFixed(1)}%
                              </span>
                            </div>
                            {Math.abs(
                              item.weightedProportion - item.rawProportion
                            ) > 0.01 && (
                              <span className="text-xs text-muted-foreground">
                                (raw:{" "}
                                {(item.rawProportion * 100).toFixed(1)}%)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {stats.weighted.byAge.length === 0 &&
                stats.weighted.byGender.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Not enough demographic data for weighting. Encourage voters
                    to share optional demographic info.
                  </p>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center">
        <Link href="/">
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5"
          >
            Browse More Polls
          </Button>
        </Link>
      </div>
    </div>
  );
}
