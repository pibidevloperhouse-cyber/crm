import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const supabase = await createClient();
    const { leadId, score, reasoning } = body;

    if (!leadId || score === undefined) {
      return NextResponse.json(
        { error: "leadId and score are required" },
        { status: 400 }
      );
    }

    // Update fields
    const { data, error } = await supabase
      .from("leads")
      .update({
        lead_score: score,
        lead_score_reason: reasoning || null,
      })
      .eq("id", leadId)
      .select();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: data[0] }, { status: 200 });
  } catch (err) {
    console.error("Update score API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
