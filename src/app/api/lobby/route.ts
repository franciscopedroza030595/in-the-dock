import { supabase, todayUtc } from "@/lib/supabase";
import { readCurrentDay, readPotAmount } from "@/lib/onchain";

export const dynamic = "force-dynamic";

export async function GET() {
  const day = todayUtc();

  // On-chain pot amount (source of truth)
  let potAmount = "0";
  let dayNumber = 1;
  try {
    const currentDay = await readCurrentDay();
    dayNumber = Number(currentDay);
    const raw = await readPotAmount(currentDay);
    potAmount = raw.toString();
  } catch {
    // Fallback to DB mirror if RPC fails
    if (supabase) {
      const { data } = await supabase
        .from("pots")
        .select("amount_units,day_number")
        .eq("game_id", 1)
        .eq("day_utc", day)
        .maybeSingle();
      if (data) {
        const row = data as { amount_units: string; day_number: number };
        potAmount = row.amount_units;
        dayNumber = row.day_number;
      }
    }
  }

  // Player count from DB
  let playerCount = 0;
  if (supabase) {
    const { count } = await supabase
      .from("runs")
      .select("*", { count: "exact", head: true })
      .eq("game_id", 1)
      .eq("day_utc", day);
    playerCount = count ?? 0;
  }

  return Response.json({ potAmount, playerCount, dayNumber, dayUtc: day });
}
