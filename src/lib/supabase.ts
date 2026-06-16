import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_KEY;

// Client-side: use anon key (RLS enforced)
export const supabaseClient =
  url && anon ? createClient(url, anon) : null;

// Server-side: use service key (bypasses RLS for API routes)
export const supabase =
  url && service
    ? createClient(url, service)
    : url && anon
    ? createClient(url, anon)
    : null;

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function computeRank(
  dayUtc: string,
  player: string,
  score: number,
): Promise<number> {
  if (!supabase) return 0;
  const { count } = await supabase
    .from("runs")
    .select("*", { count: "exact", head: true })
    .eq("game_id", 1)
    .eq("day_utc", dayUtc)
    .eq("status", "finished")
    .gt("score", score);
  return (count ?? 0) + 1;
}

export async function getBestRunToday(
  dayUtc: string,
  player: string,
): Promise<{ score: number; id: string } | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("runs")
    .select("id,score")
    .eq("game_id", 1)
    .eq("day_utc", dayUtc)
    .eq("player", player)
    .eq("status", "finished")
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { score: number; id: string } | null;
}
