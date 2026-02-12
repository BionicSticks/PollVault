import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { poll_id, option_id, age_range, gender, country } = body;

  if (!poll_id || !option_id) {
    return NextResponse.json(
      { error: "poll_id and option_id are required" },
      { status: 400 }
    );
  }

  // Use the atomic Postgres function
  const { error } = await supabase.rpc("cast_vote_with_demographics", {
    p_user_id: user.id,
    p_poll_id: poll_id,
    p_option_id: option_id,
    p_age_range: age_range || null,
    p_gender: gender || null,
    p_country: country || null,
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate")) {
      return NextResponse.json(
        { error: "You have already voted on this poll" },
        { status: 409 }
      );
    }
    if (error.message.includes("not active")) {
      return NextResponse.json(
        { error: "This poll is no longer active" },
        { status: 400 }
      );
    }
    if (error.message.includes("verified")) {
      return NextResponse.json(
        { error: "This poll requires verified voters" },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
