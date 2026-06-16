import type { NextRequest } from "next/server";
import { isAddressEqual, zeroAddress } from "viem";
import { supabase, todayUtc } from "@/lib/supabase";
import { POT_ADDRESS } from "@/lib/chain";
import { verifyPaymentTx, type VerifyResult } from "@/lib/onchain";

export const dynamic = "force-dynamic";

const QUESTIONS_PER_RUN = 10;

type ChallengeRow = {
  id: string;
  category: string;
  difficulty: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
};

export async function POST(req: NextRequest) {
  if (!supabase)
    return Response.json({ error: "db-unconfigured" }, { status: 503 });
  if (isAddressEqual(POT_ADDRESS, zeroAddress))
    return Response.json({ error: "contract-not-deployed" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    player?: string;
    txHash?: string;
  };
  const player = body.player?.toLowerCase();
  const txHash =
    body.txHash && /^0x[0-9a-f]{64}$/i.test(body.txHash)
      ? body.txHash.toLowerCase()
      : null;

  if (!player || !/^0x[0-9a-f]{40}$/.test(player))
    return Response.json({ error: "invalid-player" }, { status: 400 });
  if (!txHash)
    return Response.json({ error: "tx-required" }, { status: 400 });

  const day = todayUtc();

  // Idempotent: return existing open run for this txHash if not yet started
  const { data: dup } = await supabase
    .from("runs")
    .select("id,status")
    .eq("paid_tx_hash", txHash)
    .maybeSingle();

  if (dup) {
    const d = dup as { id: string; status: string };
    if (d.status !== "open")
      return Response.json({ error: "tx-already-used" }, { status: 400 });

    const { data: rcs } = await supabase
      .from("run_challenges")
      .select("challenge_id,q_index,answered_at")
      .eq("run_id", d.id)
      .order("q_index", { ascending: true });

    const rows = (rcs ?? []) as Array<{ challenge_id: string; q_index: number; answered_at: string | null }>;
    if (rows.some((r) => r.answered_at !== null))
      return Response.json({ error: "tx-already-used" }, { status: 400 });

    const firstId = rows[0]?.challenge_id;
    if (!firstId)
      return Response.json({ error: "tx-already-used" }, { status: 400 });

    const { data: qRow } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", firstId)
      .maybeSingle();
    if (!qRow) return Response.json({ error: "tx-already-used" }, { status: 400 });

    const c = qRow as ChallengeRow;
    return Response.json({
      runId: d.id,
      question: { id: c.id, category: c.category, difficulty: c.difficulty, prompt: c.prompt, options: c.options, explanation: c.explanation },
      qIndex: 0,
      totalQuestions: QUESTIONS_PER_RUN,
    });
  }

  // Verify the on-chain play() call
  let check: VerifyResult;
  try {
    check = await verifyPaymentTx(txHash, player);
  } catch (e) {
    console.error("[runs] verifyPaymentTx threw:", e);
    return Response.json({ error: "rpc-error" }, { status: 503 });
  }
  if (!check.valid)
    return Response.json({ error: check.reason }, { status: 400 });

  const wasFree = check.wasFree;
  const potAfter = check.potAfter;

  // Create the run
  const { data: runRow, error: runErr } = await supabase
    .from("runs")
    .insert({
      game_id: 1,
      day_utc: day,
      player,
      was_free: wasFree,
      paid_tx_hash: txHash,
      status: "open",
    })
    .select("id")
    .single();

  if (runErr || !runRow) {
    console.error("[runs] insert failed:", runErr);
    return Response.json({ error: "failed-to-create-run", detail: runErr?.message }, { status: 500 });
  }

  const runId = (runRow as { id: string }).id;

  // Mirror pot amount
  await supabase
    .from("pots")
    .upsert({ game_id: 1, day_utc: day, day_number: Number(check.dayNumber), amount_units: potAfter.toString() }, { onConflict: "game_id,day_utc", ignoreDuplicates: false });

  // Pick a random first question
  const { data: allQ } = await supabase
    .from("challenges")
    .select("*")
    .eq("active", true);

  const pool = (allQ ?? []) as ChallengeRow[];
  if (pool.length === 0)
    return Response.json({ error: "no-challenges" }, { status: 500 });

  const pick = pool[Math.floor(Math.random() * pool.length)];

  await supabase.from("run_challenges").insert({
    run_id: runId,
    challenge_id: pick.id,
    q_index: 0,
  });

  return Response.json({
    runId,
    question: { id: pick.id, category: pick.category, difficulty: pick.difficulty, prompt: pick.prompt, options: pick.options, explanation: pick.explanation },
    qIndex: 0,
    totalQuestions: QUESTIONS_PER_RUN,
  });
}
