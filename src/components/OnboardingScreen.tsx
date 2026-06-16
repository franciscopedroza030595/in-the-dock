"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useGameStore } from "@/store/gameStore";
import { useCurrentPlayer } from "@/lib/wallet";
import { savePlayer, getPlayer } from "@/lib/player";

export default function OnboardingScreen() {
  const { setUsername, setShowUsername, setWallet, completeOnboarding } = useGameStore();
  const { isConnected, address } = useCurrentPlayer();
  const router = useRouter();

  const [name, setName] = useState("");
  // true once we've checked the DB for this address and found no username yet
  const [needsName, setNeedsName] = useState(false);
  const [checking, setChecking] = useState(false);

  // When wallet connects, look up THIS address in the DB — never trust stale
  // local state, since a different wallet may have connected this session.
  useEffect(() => {
    if (!isConnected || !address) return;
    let active = true;
    setChecking(true);
    getPlayer(address).then((record) => {
      if (!active) return;
      setChecking(false);
      setWallet(address);
      if (record && record.username) {
        setUsername(record.username);
        setShowUsername(record.show_username);
        completeOnboarding();
        router.replace("/home");
      } else {
        setNeedsName(true);
      }
    });
    return () => { active = false; };
  }, [isConnected, address]);

  function finish() {
    const finalName = name.trim() || `Player${Math.floor(Math.random() * 9999)}`;
    setUsername(finalName);
    completeOnboarding();
    if (address) savePlayer(address, { username: finalName, show_username: true });
    router.replace("/home");
  }

  // ── Step 1: Connect wallet ─────────────────────────────────────────────
  if (!isConnected || !needsName) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center px-6 gap-8 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4">
          <span className="text-7xl">⚖️</span>
          <h1 className="text-4xl font-black text-white leading-tight">
            In The Dock
          </h1>
          <p className="text-muted text-sm max-w-xs leading-relaxed">
            Daily reasoning challenges. Top scorer at midnight wins the USDC pot — paid on-chain.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col gap-3 w-full max-w-xs">
          <div className="card p-4 flex flex-col gap-3 text-sm">
            <p className="text-muted text-xs">✅ First play every day is <span className="text-emerald-400 font-semibold">free</span></p>
            <p className="text-muted text-xs">💰 Pay <span className="text-gold font-semibold">0.10 USDC</span> to play again and beat your score</p>
            <p className="text-muted text-xs">🏆 Best score at midnight wins <span className="text-white font-semibold">1 USDC</span></p>
          </div>

          {/* RainbowKit ConnectButton styled to match */}
          <ConnectButton.Custom>
            {({ openConnectModal, connectModalOpen }) => (
              <button
                onClick={openConnectModal}
                disabled={connectModalOpen || checking}
                className="btn-brand py-5 text-lg font-black w-full"
              >
                {checking ? "Checking your account…" : connectModalOpen ? "Connecting…" : "Connect wallet to play →"}
              </button>
            )}
          </ConnectButton.Custom>

          <p className="text-xs text-muted">Celo Sepolia Testnet · MetaMask, Rabby, MiniPay</p>
        </motion.div>
      </div>
    );
  }

  // ── Step 2: Choose username ────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-svh flex flex-col justify-center px-6 gap-6"
      >
        <div className="text-center">
          <p className="text-5xl mb-4">🎯</p>
          <h2 className="text-3xl font-black text-white">Pick your name</h2>
          <p className="text-muted text-sm mt-2">Shows on the leaderboard · one time only</p>
        </div>

        <div className="card p-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value.slice(0, 20))}
            onKeyDown={e => e.key === "Enter" && finish()}
            placeholder="e.g. mariag_col"
            maxLength={20}
            autoFocus
            className="w-full bg-transparent text-white text-xl font-bold outline-none placeholder:text-muted text-center"
          />
        </div>

        <p className="text-xs text-muted text-center">Max 20 chars · you can skip to use a random name</p>

        <button onClick={finish} className="btn-brand py-4 text-base font-black">
          Start competing →
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
