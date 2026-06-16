import type { NextRequest } from "next/server";
import { supabase, computeRank } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const QUESTIONS_PER_RUN = 10;
const POINTS: Record<string, number> = { EASY: 5, MEDIUM: 10, HARD: 20, EXPERT: 40 };

type ChallengeRow = {
  id: string;
  category: string;
  difficulty: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!supabase) return Response.json({ error: "db-unconfigured" }, { status: 503 });

  const { id: runId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    choice?: string;
    timeMsec?: number;
  };
  const choice = body.choice;
  if (!choice) return Response.json({ error: "choice-required" }, { status: 400 });

  // Load run
  const { data: runRow } = await supabase
    .from("runs")
    .select("id,player,score,correct_count,total_questions,status,day_utc")
    .eq("id", runId)
    .maybeSingle();

  if (!runRow) return Response.json({ error: "not-found" }, { status: 404 });
  const run = runRow as { id: string; player: string; score: number; correct_count: number; total_questions: number; status: string; day_utc: string };
  if (run.status !== "open") return Response.json({ error: "run-closed" }, { status: 409 });

  // Load current unanswered question
  const { data: rcRow } = await supabase
    .from("run_challenges")
    .select("id,challenge_id,q_index,answered_at")
    .eq("run_id", runId)
    .order("q_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!rcRow) return Response.json({ error: "no-question" }, { status: 409 });
  const rc = rcRow as { id: string; challenge_id: string; q_index: number; answered_at: string | null };
  if (rc.answered_at) return Response.json({ error: "already-answered" }, { status: 409 });

  // Load correct answer from DB (never trust client)
  const { data: qRow } = await supabase
    .from("challenges")
    .select("answer,difficulty")
    .eq("id", rc.challenge_id)
    .single();

  if (!qRow) return Response.json({ error: "challenge-missing" }, { status: 500 });
  const q = qRow as { answer: string; difficulty: string };

  const isCorrect = choice === q.answer;
  const pts = isCorrect ? (POINTS[q.difficulty] ?? 0) : 0;
  const newScore = run.score + pts;
  const newCorrect = run.correct_count + (isCorrect ? 1 : 0);
  const newTotal = run.total_questions + 1;

  // Record the answer
  await supabase.from("run_challenges").update({
    answered_at: new Date().toISOString(),
    answer_correct: isCorrect,
    answer_choice: choice,
    time_ms: body.timeMsec ?? null,
  }).eq("id", rc.id);

  // Update score
  await supabase.from("runs").update({
    score: newScore,
    correct_count: newCorrect,
    total_questions: newTotal,
  }).eq("id", runId);

  // Check if run is complete
  const isLastQuestion = rc.q_index + 1 >= QUESTIONS_PER_RUN;

  if (isLastQuestion) {
    await supabase.from("runs").update({
      status: "finished",
      ended_at: new Date().toISOString(),
    }).eq("id", runId);

    const rank = await computeRank(run.day_utc, run.player, newScore);
    return Response.json({
      correct: isCorrect,
      points: pts,
      score: newScore,
      ended: true,
      reason: "complete",
      correctCount: newCorrect,
      totalQuestions: newTotal,
      rank,
    });
  }

  // Pick next question not already seen in this run
  const [{ data: allQ }, { data: seenQ }] = await Promise.all([
    supabase.from("challenges").select("*").eq("active", true),
    supabase.from("run_challenges").select("challenge_id").eq("run_id", runId),
  ]);

  const seenIds = new Set(
    ((seenQ ?? []) as Array<{ challenge_id: string }>).map((r) => r.challenge_id),
  );
  const available = ((allQ ?? []) as ChallengeRow[]).filter((c) => !seenIds.has(c.id));

  // If we've exhausted the question bank, cycle from full pool
  const pool = available.length > 0 ? available : ((allQ ?? []) as ChallengeRow[]);
  const next = pool[Math.floor(Math.random() * pool.length)];

  await supabase.from("run_challenges").insert({
    run_id: runId,
    challenge_id: next.id,
    q_index: rc.q_index + 1,
  });

  return Response.json({
    correct: isCorrect,
    points: pts,
    score: newScore,
    ended: false,
    nextQuestion: {
      id: next.id,
      category: next.category,
      difficulty: next.difficulty,
      prompt: next.prompt,
      options: next.options,
      explanation: next.explanation,
    },
    qIndex: rc.q_index + 1,
    totalQuestions: QUESTIONS_PER_RUN,
  });
}
