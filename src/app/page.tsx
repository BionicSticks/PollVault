"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PollCard } from "@/components/PollCard";
import { SearchBar } from "@/components/SearchBar";
import { CategoryFilter } from "@/components/CategoryFilter";
import { motion } from "framer-motion";
import type { Poll } from "@/lib/supabase/types";

export default function HomePage() {
  const [featuredPolls, setFeaturedPolls] = useState<Poll[]>([]);
  const [recentPolls, setRecentPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadPolls = useCallback(async (category?: string | null, query?: string) => {
    setLoading(true);

    // If searching, use search API
    if (query) {
      const params = new URLSearchParams({ q: query, limit: "20" });
      if (category) params.set("category", category);
      const res = await fetch(`/api/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecentPolls(data.polls || []);
        setFeaturedPolls([]);
      }
      setLoading(false);
      return;
    }

    // Otherwise load featured + recent with optional category filter
    const catParam = category ? `&category=${category}` : "";
    const [featuredRes, recentRes] = await Promise.all([
      fetch(`/api/polls?featured=true&limit=3${catParam}`),
      fetch(`/api/polls?limit=12${catParam}`),
    ]);

    if (featuredRes.ok) {
      const data = await featuredRes.json();
      setFeaturedPolls(data.polls || []);
    }
    if (recentRes.ok) {
      const data = await recentRes.json();
      setRecentPolls(data.polls || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  useEffect(() => {
    loadPolls(selectedCategory, searchQuery);
  }, [selectedCategory, searchQuery, loadPolls]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center py-16 sm:py-24"
      >
        <p className="text-sm uppercase tracking-widest text-muted-foreground mb-6">
          No hidden samples. No editorial spin. Just numbers.
        </p>
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
          <span className="gradient-text">Your Voice.</span>
          <br />
          <span className="text-foreground">Real Data.</span>
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground mt-6 max-w-6xl mx-auto text-center">
          Most polls hide their sample size, cherry-pick demographics, and exist to push a narrative. PollVault is the opposite — every result shows its confidence interval, margin of error, and demographic breakdown. Your data is used solely for statistical grouping and is never linked to you.
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link href="/polls/create">
            <Button
              size="lg"
              className="bg-gradient-to-r from-[oklch(0.7_0.2_280)] to-[oklch(0.7_0.15_190)] text-white border-0 hover:opacity-90 h-12 px-8 text-lg"
            >
              Create a Poll
            </Button>
          </Link>
          <a href="#polls">
            <Button
              variant="outline"
              size="lg"
              className="border-white/10 hover:bg-white/5 h-12 px-8"
            >
              Browse Polls
            </Button>
          </a>
        </div>

        {/* Feature badges */}
        <div className="flex items-center justify-center gap-8 sm:gap-12 mt-12">
          {[
            { label: "Privacy First", desc: "Aggregate-only data" },
            { label: "Real Statistics", desc: "Wilson CI, chi-squared" },
            { label: "Open Source", desc: "Transparent & auditable" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-sm font-medium text-foreground">
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Search & Filter */}
      <section className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <SearchBar
            onSearch={(q) => setSearchQuery(q)}
            placeholder="Search polls..."
          />
        </div>
        <CategoryFilter
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </section>

      {/* Featured Polls */}
      {featuredPolls.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 gradient-text">
            Featured
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredPolls.map((poll, i) => (
              <PollCard key={poll.id} poll={poll} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Polls */}
      <section id="polls">
        <h2 className="text-xl font-semibold mb-4">Recent Polls</h2>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentPolls.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <p className="text-lg text-muted-foreground mb-4">
              No polls yet. Be the first!
            </p>
            <Link href="/polls/create">
              <Button className="bg-gradient-to-r from-[oklch(0.7_0.2_280)] to-[oklch(0.7_0.15_190)] text-white border-0">
                Create a Poll
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentPolls.map((poll, i) => (
              <PollCard key={poll.id} poll={poll} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
