import { supabase, todayUtc } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabase) return Response.json({ entries: [] });

  const day = todayUtc();

  // Best score per player today (finished runs only)
  const { data } = await supabase
    .from("runs")
    .select("player,score,correct_count,ended_at")
    .eq("game_id", 1)
    .eq("day_utc", day)
    .eq("status", "finished")
    .order("score", { ascending: false })
    .order("ended_at", { ascending: true })
    .limit(100);

  const rows = (data ?? []) as Array<{
    player: string;
    score: number;
    correct_count: number;
    ended_at: string;
  }>;

  // Deduplicate: keep best run per player
  const seen = new Map<string, (typeof rows)[0]>();
  for (const row of rows) {
    if (!seen.has(row.player)) seen.set(row.player, row);
  }

  const entries = Array.from(seen.values())
    .sort((a, b) => b.score - a.score || a.ended_at.localeCompare(b.ended_at))
    .slice(0, 50)
    .map((e, i) => ({
      rank: i + 1,
      player: e.player,
      score: e.score,
      correctCount: e.correct_count,
    }));

  return Response.json({ entries, dayUtc: day });
}
