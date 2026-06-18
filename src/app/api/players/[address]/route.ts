import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/players/[address] — fetch player record
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  if (!supabase) return Response.json({ player: null });

  const { address } = await params;
  const addr = address?.toLowerCase();

  const { data } = await supabase
    .from("players")
    .select("address,username,show_username")
    .eq("address", addr)
    .maybeSingle();

  // Sum all-time USDC wins for this player
  const { data: wins } = await supabase
    .from("wins")
    .select("amount_units")
    .eq("player", addr);

  const totalEarnedUnits = (wins ?? []).reduce(
    (sum: number, w: { amount_units: string }) => sum + Number(w.amount_units ?? 0),
    0
  );

  return Response.json({
    player: data ? { ...data, totalEarned: totalEarnedUnits / 1_000_000 } : null,
    v: 2,
  });
}
