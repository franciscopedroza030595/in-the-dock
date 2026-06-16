"use client";

import { useState } from "react";
import { useWriteContract, useReadContract, usePublicClient } from "wagmi";
import { parseAbi, isAddressEqual, zeroAddress } from "viem";
import { POT_ADDRESS, USDC_ADDRESS, ENTRY_FEE_UNITS } from "@/lib/chain";
import { ITD_ABI } from "@/lib/onchain";
import { useCurrentPlayer } from "@/lib/wallet";
import { useTxOverrides } from "@/lib/minipay";
import { Brain, Loader2, AlertTriangle, Droplets } from "lucide-react";

const ERC20_APPROVE_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const ERC20_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function mint(address to, uint256 amount) external",
]);

// 10 USDC (6 decimals)
const MINT_AMOUNT = BigInt(10_000_000);

interface Props {
  onRunStarted: (runId: string, firstQuestion: unknown) => void;
}

type Step = "idle" | "approving" | "playing" | "creating" | "error";

const contractsConfigured =
  !isAddressEqual(POT_ADDRESS, zeroAddress) &&
  !isAddressEqual(USDC_ADDRESS, zeroAddress);

export default function PayAndPlayButton({ onRunStarted }: Props) {
  const { address, isConnected } = useCurrentPlayer();
  const txOverrides = useTxOverrides();
  const publicClient = usePublicClient();
  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [minting, setMinting] = useState(false);

  // Read USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: isConnected && !!address && contractsConfigured },
  });

  // Check if free play available — only if contracts are configured
  const { data: hasFreePlay, isLoading: checkingFree, isError: readError } = useReadContract({
    address: POT_ADDRESS,
    abi: ITD_ABI,
    functionName: "hasFreePlayToday",
    args: [address as `0x${string}`],
    query: { enabled: isConnected && !!address && contractsConfigured },
  });

  const { writeContractAsync } = useWriteContract();

  async function handleMint() {
    if (!address || minting) return;
    setMinting(true);
    try {
      const hash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "mint",
        args: [address as `0x${string}`, MINT_AMOUNT],
        ...txOverrides,
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      await refetchBalance();
    } catch { /* user rejected */ }
    setMinting(false);
  }

  async function handlePlay() {
    if (!isConnected || !address) return;
    if (!contractsConfigured) return;
    setStep("idle");
    setErrorMsg("");

    try {
      let txHash: `0x${string}`;

      // Treat undefined (read failed / still loading) as needing free check — default to free
      // Only go paid if we got an explicit false back from the contract
      const isFree = hasFreePlay === true || hasFreePlay === undefined;

      if (isFree) {
        setStep("playing");
        txHash = await writeContractAsync({
          address: POT_ADDRESS,
          abi: ITD_ABI,
          functionName: "play",
          args: [],
          ...txOverrides,
        });
      } else {
        // Paid play — approve USDC first, then WAIT for it to be mined.
        // writeContractAsync only resolves once the tx is broadcast, not
        // confirmed — calling play() immediately after races the allowance
        // update and fails with SafeERC20FailedOperation on MiniPay/mobile
        // wallets where block propagation is slower.
        setStep("approving");
        const approveHash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: ERC20_APPROVE_ABI,
          functionName: "approve",
          args: [POT_ADDRESS, ENTRY_FEE_UNITS],
          ...txOverrides,
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1 });
        }

        setStep("playing");
        txHash = await writeContractAsync({
          address: POT_ADDRESS,
          abi: ITD_ABI,
          functionName: "play",
          args: [],
          ...txOverrides,
        });
      }

      // Wait for 1 confirmation so the server's RPC can find the receipt
      setStep("creating");
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
      }
      // Create run on server
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player: address, txHash }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "server-error");

      onRunStarted(data.runId, data.question);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("rejected") && !msg.includes("denied")) {
        setErrorMsg(msg);
        setStep("error");
      } else {
        setStep("idle");
      }
    }
  }

  if (!isConnected) return null;

  // Contracts not configured — show clear error instead of broken button
  if (!contractsConfigured) {
    return (
      <div className="flex flex-col gap-2 items-center text-center p-4 card border-red-500/30">
        <AlertTriangle size={20} className="text-red-400" />
        <p className="text-red-400 text-sm font-bold">Contracts not configured</p>
        <p className="text-xs text-muted">
          Set <code>NEXT_PUBLIC_POT_ADDRESS</code> and <code>NEXT_PUBLIC_USDT_ADDRESS</code> in Vercel env vars and redeploy.
        </p>
      </div>
    );
  }

  const loading = step !== "idle" && step !== "error";

  // If read errored, show free (contract will reject if already played)
  const showFree = hasFreePlay === true || hasFreePlay === undefined;

  const label =
    step === "approving" ? "Approving USDC…"
    : step === "playing"  ? "Sending play tx…"
    : step === "creating" ? "Starting game…"
    : checkingFree        ? "Checking eligibility…"
    : showFree            ? "Play free →"
    : "Pay 0.10 USDC to play again →";

  const balanceUsdc = usdcBalance !== undefined ? Number(usdcBalance as bigint) / 1_000_000 : null;
  const needsUsdc = !showFree && balanceUsdc !== null && balanceUsdc < 0.1;

  return (
    <div className="flex flex-col gap-2">
      {/* USDC balance row */}
      {balanceUsdc !== null && (
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-muted">USDC balance: <span className="text-white font-semibold">{balanceUsdc.toFixed(2)} USDC</span></span>
          <button
            onClick={handleMint}
            disabled={minting}
            className="flex items-center gap-1 text-brand-light font-semibold hover:underline disabled:opacity-50"
          >
            {minting ? <Loader2 size={11} className="animate-spin" /> : <Droplets size={11} />}
            {minting ? "Minting…" : "Get test USDC"}
          </button>
        </div>
      )}

      {needsUsdc && (
        <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 text-center">
          You need at least 0.10 USDC to play again. Tap "Get test USDC" above to mint some free testnet tokens.
        </div>
      )}

      <button
        onClick={handlePlay}
        disabled={loading || needsUsdc}
        className="btn-brand flex items-center justify-center gap-3 w-full py-5 text-lg disabled:opacity-60"
      >
        {loading
          ? <Loader2 size={20} className="animate-spin" />
          : <Brain size={22} />}
        {label}
      </button>
      {step === "error" && (
        <p className="text-xs text-center text-red-400">{errorMsg}</p>
      )}
      {!showFree && !loading && !needsUsdc && (
        <p className="text-xs text-center text-muted">0.10 USDC to try to beat your score</p>
      )}
      {showFree && !loading && !checkingFree && (
        <p className="text-xs text-center text-emerald-400/70">Your first play today is free ✓</p>
      )}
    </div>
  );
}
