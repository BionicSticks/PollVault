"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DemographicPrompt } from "@/components/DemographicPrompt";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { Poll, PollOption } from "@/lib/supabase/types";
import type { User } from "@supabase/supabase-js";

export default function VotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  // Demographics (optional)
  const [ageRange, setAgeRange] = useState("skip");
  const [gender, setGender] = useState("skip");
  const [country, setCountry] = useState("skip");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      const { data: pollData } = await supabase
        .from("polls")
        .select("*, options(id, label, position, vote_count)")
        .eq("id", id)
        .single();

      if (!pollData) {
        router.push("/");
        return;
      }

      setPoll(pollData as Poll);
      setOptions(
        ((pollData.options as PollOption[]) || []).sort(
          (a, b) => a.position - b.position
        )
      );

      // Check if user already voted
      if (user) {
        const { data: existingVote } = await supabase
          .from("votes")
          .select("id")
          .eq("user_id", user.id)
          .eq("poll_id", id)
          .maybeSingle();

        if (existingVote) {
          setHasVoted(true);
        }
      }

      setLoading(false);
    }

    load();
  }, [id, supabase, router]);

  const handleVote = async () => {
    if (!user) {
      router.push(`/login?redirect=/polls/${id}`);
      return;
    }

    if (!selected) {
      toast.error("Please select an option");
      return;
    }

    setVoting(true);

    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poll_id: id,
        option_id: selected,
        age_range: ageRange !== "skip" ? ageRange : null,
        gender: gender !== "skip" ? gender : null,
        country: country !== "skip" ? country : null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error);
      setVoting(false);
      return;
    }

    toast.success("Vote cast!");
    router.push(`/polls/${id}/results`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!poll) return null;

  const totalVotes = options.reduce((sum, opt) => sum + opt.vote_count, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass-strong border-white/10">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              {poll.featured && (
                <Badge variant="secondary" className="text-xs">
                  Featured
                </Badge>
              )}
              {poll.require_verified && (
                <Badge variant="outline" className="text-xs border-white/20">
                  Verified only
                </Badge>
              )}
              <Badge variant="outline" className="text-xs border-white/20">
                {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
              </Badge>
            </div>
            <CardTitle className="text-2xl">{poll.title}</CardTitle>
            {poll.description && (
              <CardDescription className="text-base">
                {poll.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {hasVoted ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-lg text-muted-foreground">
                  You&apos;ve already voted on this poll
                </p>
                <Button
                  onClick={() => router.push(`/polls/${id}/results`)}
                  className="bg-gradient-to-r from-[oklch(0.7_0.2_280)] to-[oklch(0.7_0.15_190)] text-white border-0"
                >
                  View Results
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelected(option.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selected === option.id
                          ? "border-primary bg-primary/10 glow-purple"
                          : "border-white/10 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selected === option.id
                              ? "border-primary"
                              : "border-white/30"
                          }`}
                        >
                          {selected === option.id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2.5 h-2.5 rounded-full bg-primary"
                            />
                          )}
                        </div>
                        <span className="text-sm font-medium">
                          {option.label}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <DemographicPrompt
                  ageRange={ageRange}
                  gender={gender}
                  country={country}
                  onAgeRangeChange={setAgeRange}
                  onGenderChange={setGender}
                  onCountryChange={setCountry}
                />

                <Button
                  onClick={handleVote}
                  disabled={!selected || voting}
                  className="w-full bg-gradient-to-r from-[oklch(0.7_0.2_280)] to-[oklch(0.7_0.15_190)] text-white border-0 hover:opacity-90 h-12 text-lg"
                >
                  {voting ? "Casting vote..." : "Cast Vote"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
