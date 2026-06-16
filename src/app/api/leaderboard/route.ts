import { supabase, todayUtc } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };

export async function GET() {
  if (!supabase) return Response.json({ entries: [] }, { headers: NO_STORE });

  const day = todayUtc();

  const { data: runs } = await supabase
    .from("runs")
    .select("player,score,correct_count,ended_at")
    .eq("game_id", 1)
    .eq("day_utc", day)
    .eq("status", "finished")
    .order("score", { ascending: false })
    .order("ended_at", { ascending: true })
    .limit(500);

  const rows = (runs ?? []) as Array<{
    player: string;
    score: number;
    correct_count: number;
    ended_at: string;
  }>;

  // Best run per player
  const seen = new Map<string, (typeof rows)[0]>();
  for (const row of rows) {
    if (!seen.has(row.player)) seen.set(row.player, row);
  }

  const sorted = Array.from(seen.values())
    .sort((a, b) => b.score - a.score || a.ended_at.localeCompare(b.ended_at))
    .slice(0, 50);

  if (sorted.length === 0) return Response.json({ entries: [], dayUtc: day }, { headers: NO_STORE });

  // Fetch player profiles in one query
  const addresses = sorted.map(r => r.player);
  const { data: players } = await supabase
    .from("players")
    .select("address,username,show_username")
    .in("address", addresses);

  const playerMap = new Map(
    ((players ?? []) as Array<{ address: string; username: string; show_username: boolean }>)
      .map(p => [p.address, p])
  );

  const entries = sorted.map((e, i) => {
    const p = playerMap.get(e.player);
    const showName = p?.show_username !== false && p?.username;
    return {
      rank: i + 1,
      player: e.player,
      displayName: showName ? p!.username : null, // null = show wallet address
      score: e.score,
      correctCount: e.correct_count,
    };
  });

  return Response.json({ entries, dayUtc: day }, { headers: NO_STORE });
}
