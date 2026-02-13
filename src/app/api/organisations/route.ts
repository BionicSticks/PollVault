import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  const supabase = await createClient();

  if (slug) {
    const { data, error } = await supabase
      .from("organisations")
      .select("*, profiles(username, display_name)")
      .eq("slug", slug)
      .single();

    if (error) {
      return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
    }

    return NextResponse.json({ organisation: data });
  }

  const { data, count, error } = await supabase
    .from("organisations")
    .select("*, profiles(username, display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ organisations: data, total: count });
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
  const { name, description } = body;

  if (!name || name.trim().length < 2) {
    return NextResponse.json(
      { error: "Organisation name must be at least 2 characters" },
      { status: 400 }
    );
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { data: org, error } = await supabase
    .from("organisations")
    .insert({
      name: name.trim(),
      slug,
      description: description || null,
      owner_id: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return NextResponse.json(
        { error: "An organisation with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add owner as admin member
  await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "admin",
  });

  return NextResponse.json({ organisation: org }, { status: 201 });
}
