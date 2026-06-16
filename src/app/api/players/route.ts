import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// POST /api/players — upsert username + privacy preference
export async function POST(req: NextRequest) {
  if (!supabase) return Response.json({ error: "db-unconfigured" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    address?: string;
    username?: string;
    show_username?: boolean;
  };

  const address = body.address?.toLowerCase();
  if (!address || !/^0x[0-9a-f]{40}$/.test(address))
    return Response.json({ error: "invalid-address" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.username === "string") update.username = body.username.trim().slice(0, 20);
  if (typeof body.show_username === "boolean") update.show_username = body.show_username;

  const { error } = await supabase.from("players").upsert(
    { address, ...update },
    { onConflict: "address" }
  );

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
