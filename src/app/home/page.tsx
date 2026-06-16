"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import BottomNav from "@/components/BottomNav";
import { Flame, Trophy, Zap, Brain, ChevronRight } from "lucide-react";
import { useCurrentPlayer } from "@/lib/wallet";

interface LeaderEntry {
  rank: number;
  player: string;
  score: number;
  correctCount: number;
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export default function HomePage() {
  const { username, todayScore, todayCorrect, todayAttempted, streak, resetIfNewDay } = useGameStore();
  const { address } = useCurrentPlayer();
  const [timeLeft, setTimeLeft] = useState("");
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    resetIfNewDay();
    function tick() {
      const now = new Date();
      const midnight = new Date();
      midnight.setUTCHours(24, 0, 0, 0);
      const ms = midnight.getTime() - now.getTime();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then(r => r.json())
      .then(d => {
        const entries: LeaderEntry[] = d.entries ?? [];
        setLeaders(entries.slice(0, 3));
        if (address) {
          const me = entries.find(e => e.player.toLowerCase() === address.toLowerCase());
          setMyRank(me?.rank ?? entries.length + 1);
        }
      })
      .catch(() => {});
  }, [address]);

  const accuracy = todayAttempted > 0 ? Math.round((todayCorrect / todayAttempted) * 100) : 0;

  function displayName(entry: LeaderEntry) {
    if (address && entry.player.toLowerCase() === address.toLowerCase()) return username;
    return shortAddr(entry.player);
  }

  return (
    <div className="min-h-svh pb-24 px-4 pt-6 overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-muted text-xs">Good to see you,</p>
          <p className="text-xl font-black text-white">{username} 👋</p>
        </div>
        {streak >= 2 && (
          <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1.5">
            <Flame size={14} className="text-orange-400" />
            <span className="text-orange-400 font-bold text-xs">{streak} day streak</span>
          </div>
        )}
      </div>

      {/* Rank hero */}
      <div className="rounded-3xl p-5 mb-4 relative overflow-hidden border border-brand/30" style={{background:"linear-gradient(135deg,rgba(124,58,237,0.15),rgba(124,58,237,0.05))"}}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 rounded-full blur-2xl" />
        <div className="relative">
          <p className="label mb-1">Your rank today</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-5xl font-black text-white">{myRank !== null ? `#${myRank}` : "—"}</p>
              <p className="text-muted text-xs mt-1">{todayScore} points earned</p>
            </div>
            <div className="text-right">
              <p className="label mb-1">Prize resets in</p>
              <p className="text-gold font-black text-sm">{timeLeft}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: <Zap size={16} className="text-gold" />,         label: "Score",    value: todayScore,     color: "text-gold" },
          { icon: <Brain size={16} className="text-brand-light" />, label: "Solved",   value: todayCorrect,   color: "text-brand-light" },
          { icon: <Trophy size={16} className="text-emerald-400" />,label: "Accuracy", value: `${accuracy}%`, color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">{s.icon}</div>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="label mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Play CTA */}
      <Link href="/play" className="btn-brand flex items-center justify-center gap-3 w-full py-5 text-lg mb-4">
        <Brain size={22} />
        Play now
        <ChevronRight size={18} />
      </Link>

      {/* Top 3 preview */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-sm flex items-center gap-2"><Trophy size={14} className="text-gold" /> Today's top 3</p>
          <Link href="/leaderboard" className="text-xs text-brand-light font-semibold">See all →</Link>
        </div>
        {leaders.length === 0 ? (
          <p className="text-xs text-muted text-center py-2">No scores yet — be the first!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {leaders.map((e, i) => (
              <div key={e.player} className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">{["🥇","🥈","🥉"][i]}</span>
                <span className="text-sm font-semibold flex-1 truncate">{displayName(e)}</span>
                <span className="text-sm font-black text-white">{e.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily prize info */}
      <div className="card p-4">
        <p className="text-sm font-semibold mb-1">🏆 Daily prize: 1 USDC</p>
        <p className="text-xs text-muted">Highest score at midnight wins. Prize paid on-chain to winner's wallet.</p>
      </div>

      <BottomNav />
    </div>
  );
}
