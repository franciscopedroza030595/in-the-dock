"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useGameStore, MOCK_LEADERBOARD } from "@/store/gameStore";
import BottomNav from "@/components/BottomNav";
import { Flame, Trophy, Zap, Brain, ChevronRight } from "lucide-react";

export default function HomePage() {
  const { username, todayScore, todayCorrect, todayAttempted, streak, resetIfNewDay } = useGameStore();
  const [timeLeft, setTimeLeft] = useState("");

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

  // Find user rank in mock leaderboard based on score
  const myRank = MOCK_LEADERBOARD.filter(e => e.score > todayScore).length + 1;
  const accuracy = todayAttempted > 0 ? Math.round((todayCorrect / todayAttempted) * 100) : 0;

  return (
    <div className="min-h-svh pb-24 px-4 pt-6">

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
              <p className="text-5xl font-black text-white">#{myRank}</p>
              <p className="text-muted text-xs mt-1">{todayScore} points earned</p>
            </div>
            <div className="text-right">
              <p className="label mb-1">Prize resets in</p>
              <p className="text-gold font-black text-sm">{timeLeft}</p>
            </div>
          </div>
          {/* Progress bar toward leader */}
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-muted mb-1">
              <span>You: {todayScore}</span>
              <span>Leader: {MOCK_LEADERBOARD[0].score}</span>
            </div>
            <div className="h-2 rounded-full bg-surface overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all" style={{width:`${Math.min(100,(todayScore/MOCK_LEADERBOARD[0].score)*100)}%`}} />
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
        <div className="flex flex-col gap-2">
          {MOCK_LEADERBOARD.slice(0,3).map((e, i) => (
            <div key={e.username} className="flex items-center gap-3">
              <span className="text-lg w-6 text-center">{["🥇","🥈","🥉"][i]}</span>
              <span className="text-sm font-semibold flex-1">{e.country} {e.username}</span>
              <span className="text-sm font-black text-white">{e.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily limit */}
      <div className="card p-4">
        <div className="flex justify-between mb-2">
          <p className="text-sm font-semibold">Daily challenges</p>
          <p className="text-sm font-bold">{todayAttempted} / 120</p>
        </div>
        <div className="h-2 rounded-full bg-surface overflow-hidden">
          <div className="h-full bg-brand rounded-full" style={{width:`${(todayAttempted/120)*100}%`}} />
        </div>
        <p className="text-xs text-muted mt-2">{Math.max(0,120-todayAttempted)} challenges remaining today</p>
      </div>

      <BottomNav />
    </div>
  );
}
