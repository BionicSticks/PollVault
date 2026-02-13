import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const featured = searchParams.get("featured");
  const status = searchParams.get("status") || "active";
  const category = searchParams.get("category");
  const org = searchParams.get("org");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  const supabase = await createClient();

  let query = supabase
    .from("polls")
    .select(
      "*, profiles(username, display_name), options(id, label, position, vote_count), categories(id, name, slug), organisations(id, name, slug)",
      { count: "exact" }
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (featured === "true") {
    query = query.eq("featured", true);
  }

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

  if (org) {
    const { data: orgData } = await supabase
      .from("organisations")
      .select("id")
      .eq("slug", org)
      .single();
    if (orgData) {
      query = query.eq("org_id", orgData.id);
    }
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ polls: data, total: count });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, type, options, closes_at, require_verified, category_id, org_id, tags } =
    body;

  if (!title || !options || options.length < 2) {
    return NextResponse.json(
      { error: "Title and at least 2 options are required" },
      { status: 400 }
    );
  }

  // Duplicate prevention: check similarity server-side
  const { data: similar } = await supabase.rpc("check_poll_similarity", {
    p_title: title,
  });

  if (similar && similar.length > 0) {
    return NextResponse.json(
      {
        error: "A similar poll already exists",
        similar: similar.map((s: { id: string; title: string; similarity_score: number }) => ({
          id: s.id,
          title: s.title,
          similarity: s.similarity_score,
        })),
      },
      { status: 409 }
    );
  }

  // Create poll
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      creator_id: user.id,
      title,
      description: description || null,
      type: type || "single",
      closes_at: closes_at || null,
      require_verified: require_verified || false,
      category_id: category_id || null,
      org_id: org_id || null,
    })
    .select()
    .single();

  if (pollError) {
    return NextResponse.json({ error: pollError.message }, { status: 500 });
  }

  // Create options
  const optionRows = options.map((label: string, index: number) => ({
    poll_id: poll.id,
    label,
    position: index,
  }));

  const { error: optionsError } = await supabase
    .from("options")
    .insert(optionRows);

  if (optionsError) {
    return NextResponse.json({ error: optionsError.message }, { status: 500 });
  }

  // Link tags if provided
  if (tags && Array.isArray(tags) && tags.length > 0) {
    const tagRows = tags.map((tagId: string) => ({
      poll_id: poll.id,
      tag_id: tagId,
    }));
    await supabase.from("poll_tags").insert(tagRows);
  }

  return NextResponse.json({ poll }, { status: 201 });
}
