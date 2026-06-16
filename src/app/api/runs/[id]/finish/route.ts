import type { NextRequest } from "next/server";
import { supabase, computeRank } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!supabase) return Response.json({ error: "db-unconfigured" }, { status: 503 });

  const { id: runId } = await params;
  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const status = body.reason === "abandoned" ? "abandoned" : "finished";

  const { data: runRow } = await supabase
    .from("runs")
    .select("player,score,correct_count,total_questions,status,day_utc")
    .eq("id", runId)
    .maybeSingle();

  if (!runRow) return Response.json({ error: "not-found" }, { status: 404 });
  const run = runRow as { player: string; score: number; correct_count: number; total_questions: number; status: string; day_utc: string };

  if (run.status === "open") {
    await supabase.from("runs").update({
      status,
      ended_at: new Date().toISOString(),
    }).eq("id", runId);
  }

  const rank = await computeRank(run.day_utc, run.player, run.score);
  return Response.json({
    score: run.score,
    correctCount: run.correct_count,
    totalQuestions: run.total_questions,
    rank,
  });
}
