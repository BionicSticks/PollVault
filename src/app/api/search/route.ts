import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const exact = searchParams.get("exact"); // for duplicate check
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  const supabase = await createClient();

  // Duplicate check mode: use pg_trgm similarity
  if (exact && q) {
    const { data, error } = await supabase.rpc("check_poll_similarity", {
      p_title: q,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ similar: data || [] });
  }

  // Regular search mode
  let query = supabase
    .from("polls")
    .select(
      "*, profiles(username, display_name), options(id, label, position, vote_count), categories(id, name, slug), organisations(id, name, slug)",
      { count: "exact" }
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Full-text search
  if (q) {
    const tsquery = q
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => `${word}:*`)
      .join(" & ");
    query = query.textSearch("search_vector", tsquery);
  }

  // Category filter
  if (category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", category)
      .single();

    if (cat) {
      query = query.eq("category_id", cat.id);
    }
  }

  // Tag filter
  if (tag) {
    const { data: tagData } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", tag)
      .single();

    if (tagData) {
      const { data: pollIds } = await supabase
        .from("poll_tags")
        .select("poll_id")
        .eq("tag_id", tagData.id);

      if (pollIds && pollIds.length > 0) {
        query = query.in(
          "id",
          pollIds.map((p) => p.poll_id)
        );
      } else {
        return NextResponse.json({ polls: [], total: 0 });
      }
    }
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ polls: data, total: count });
}
