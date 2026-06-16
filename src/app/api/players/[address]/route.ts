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

  return Response.json({ player: data ?? null });
}
