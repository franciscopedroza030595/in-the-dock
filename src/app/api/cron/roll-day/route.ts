import type { NextRequest } from "next/server";
import { createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { supabase, todayUtc } from "@/lib/supabase";
import { ACTIVE_CHAIN, POT_ADDRESS } from "@/lib/chain";
import { ITD_ABI, readCurrentDay } from "@/lib/onchain";

export const dynamic = "force-dynamic";

// Vercel cron sends GET with Authorization: Bearer <CRON_SECRET>
// Also accept POST with x-cron-secret for manual triggers
export async function GET(req: NextRequest) {
  return handleRollDay(req);
}
export async function POST(req: NextRequest) {
  return handleRollDay(req);
}

async function handleRollDay(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const xSecret = req.headers.get("x-cron-secret") ?? "";
  const cronSecret = process.env.CRON_SECRET ?? "";
  const authorized =
    xSecret === cronSecret ||
    authHeader === `Bearer ${cronSecret}`;
  if (!authorized)
    return Response.json({ error: "unauthorized" }, { status: 401 });

  if (!supabase) return Response.json({ error: "db-unconfigured" }, { status: 503 });

  const operatorKey = process.env.OPERATOR_PRIVATE_KEY as `0x${string}` | undefined;
  if (!operatorKey) return Response.json({ error: "no-operator-key" }, { status: 503 });

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Find today's winner: highest score among finished runs yesterday
  const { data: runs } = await supabase
    .from("runs")
    .select("player,score,ended_at")
    .eq("game_id", 1)
    .eq("day_utc", yesterdayStr)
    .eq("status", "finished")
    .order("score", { ascending: false })
    .order("ended_at", { ascending: true })
    .limit(100);

  const allRuns = (runs ?? []) as Array<{ player: string; score: number; ended_at: string }>;

  // Bot check: skip flagged wallets
  let winner: string | null = null;
  let winnerScore = 0;
  if (allRuns.length > 0) {
    const { data: bots } = await supabase.from("bot_wallets").select("player");
    const botSet = new Set(((bots ?? []) as Array<{ player: string }>).map((b) => b.player));

    // Deduplicate by player, keep best score
    const best = new Map<string, { score: number; ended_at: string }>();
    for (const r of allRuns) {
      const existing = best.get(r.player);
      if (!existing || r.score > existing.score) best.set(r.player, r);
    }

    const ranked = Array.from(best.entries())
      .filter(([p]) => !botSet.has(p))
      .sort(([, a], [, b]) => b.score - a.score || a.ended_at.localeCompare(b.ended_at));

    if (ranked.length > 0) {
      winner = ranked[0][0];
      winnerScore = ranked[0][1].score;
    }
  }

  // Call rollDay on contract
  const account = privateKeyToAccount(operatorKey);
  const walletClient = createWalletClient({
    account,
    chain: ACTIVE_CHAIN,
    transport: http(),
  });

  let txHash: string;
  try {
    txHash = await walletClient.writeContract({
      address: POT_ADDRESS,
      abi: ITD_ABI,
      functionName: "rollDay",
      args: [winner ?? "0x0000000000000000000000000000000000000000"],
    });
  } catch (err) {
    return Response.json({ error: "contract-call-failed", detail: String(err) }, { status: 500 });
  }

  const dayNumber = Number(await readCurrentDay()) - 1; // closed day
  const today = todayUtc();

  // Update pots table for closed day
  await supabase.from("pots").upsert({
    game_id: 1,
    day_utc: yesterdayStr,
    day_number: dayNumber,
    winner: winner ?? null,
    winner_score: winnerScore || null,
    rolled_tx: txHash,
    closed: true,
  }, { onConflict: "game_id,day_utc" });

  // Record win
  if (winner) {
    const { data: potRow } = await supabase
      .from("pots")
      .select("amount_units")
      .eq("game_id", 1)
      .eq("day_utc", yesterdayStr)
      .maybeSingle();

    const amount = (potRow as { amount_units: string } | null)?.amount_units ?? "0";
    await supabase.from("wins").upsert({
      game_id: 1,
      day_utc: yesterdayStr,
      player: winner,
      amount_units: amount,
      score: winnerScore,
    }, { onConflict: "game_id,day_utc,player" });
  }

  // Bootstrap today's pot row
  const newDay = await readCurrentDay();
  await supabase.from("pots").upsert({
    game_id: 1,
    day_utc: today,
    day_number: Number(newDay),
    amount_units: "0",
    closed: false,
  }, { onConflict: "game_id,day_utc", ignoreDuplicates: true });

  return Response.json({ ok: true, winner, winnerScore, txHash });
}
