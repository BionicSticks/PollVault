"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import type { Poll } from "@/lib/supabase/types";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = "Search polls..." }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Poll[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.polls || []);
        setOpen(true);
      }
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onSearch) {
      onSearch(query);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="pl-9 pr-8 bg-white/5 border-white/10 h-10"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
              onSearch?.("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-2 w-full glass-strong rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {results.map((poll) => {
                const totalVotes = poll.options?.reduce((sum, opt) => sum + opt.vote_count, 0) || 0;
                return (
                  <Link
                    key={poll.id}
                    href={`/polls/${poll.id}`}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                  >
                    <p className="text-sm font-medium line-clamp-1">{poll.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {poll.categories && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                          {poll.categories.name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No polls found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
