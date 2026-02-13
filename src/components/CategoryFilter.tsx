"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/supabase/types";

interface CategoryFilterProps {
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
          selected === null
            ? "bg-gradient-to-r from-[oklch(0.7_0.2_280)] to-[oklch(0.7_0.15_190)] text-white"
            : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-white/10"
        )}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(selected === cat.slug ? null : cat.slug)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
            selected === cat.slug
              ? "bg-gradient-to-r from-[oklch(0.7_0.2_280)] to-[oklch(0.7_0.15_190)] text-white"
              : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-white/10"
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
