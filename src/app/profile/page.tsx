"use client";
import { useGameStore } from "@/store/gameStore";
import BottomNav from "@/components/BottomNav";
import { Flame, Trophy, Target, Zap, Wallet, Star, Eye, EyeOff } from "lucide-react";
import clsx from "clsx";
import { useCurrentPlayer } from "@/lib/wallet";
import { savePlayer } from "@/lib/player";

const BADGES = [
  { id:"first",    emoji:"🎯", label:"First solve",    check: (s:any) => s.allTimeSolved >= 1 },
  { id:"streak3",  emoji:"🔥", label:"3-day streak",   check: (s:any) => s.bestStreak >= 3 },
  { id:"50pts",    emoji:"⚡", label:"50 points",      check: (s:any) => s.todayScore >= 50 },
  { id:"century",  emoji:"💯", label:"100 solved",     check: (s:any) => s.allTimeSolved >= 100 },
  { id:"perfect5", emoji:"🌟", label:"Perfect 5",      check: (s:any) => s.bestStreak >= 5 },
  { id:"winner",   emoji:"🏆", label:"Champion",       check: (s:any) => s.totalEarned > 0 },
];

export default function ProfilePage() {
  const s = useGameStore();
  const { address } = useCurrentPlayer();

  async function toggleShowUsername() {
    const newVal = !s.showUsername;
    s.setShowUsername(newVal);
    if (address) await savePlayer(address, { show_username: newVal });
  }

  return (
    <div className="min-h-svh pb-24 px-4 pt-5 overflow-y-auto">

      {/* Avatar + name */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-purple-900 flex items-center justify-center text-2xl font-black text-white shadow-lg">
          {s.username[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-xl font-black text-white">{s.username}</p>
          {s.bestStreak >= 2 && (
            <div className="flex items-center gap-1 mt-1">
              <Flame size={13} className="text-orange-400" />
              <span className="text-xs font-semibold text-orange-400">Best streak: {s.bestStreak}</span>
            </div>
          )}
          <p className="text-xs text-muted mt-0.5">{s.daysPlayed} days played</p>
        </div>
      </div>

      {/* Leaderboard identity toggle */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {s.showUsername
              ? <Eye size={15} className="text-brand-light" />
              : <EyeOff size={15} className="text-muted" />}
            <div>
              <p className="text-sm font-bold">Leaderboard display</p>
              <p className="text-xs text-muted mt-0.5">
                {s.showUsername
                  ? `Showing as "${s.username}"`
                  : "Showing as wallet address"}
              </p>
            </div>
          </div>
          <button
            onClick={toggleShowUsername}
            className={clsx(
              "relative w-11 h-6 rounded-full transition-colors",
              s.showUsername ? "bg-brand" : "bg-surface border border-border"
            )}
          >
            <span className={clsx(
              "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
              s.showUsername ? "translate-x-5" : "translate-x-0.5"
            )} />
          </button>
        </div>
      </div>

      {/* All-time stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { icon:<Zap size={15} className="text-gold" />,          label:"All-time pts",   value: s.allTimeScore.toLocaleString(), color:"text-gold" },
          { icon:<Target size={15} className="text-brand-light" />, label:"Total solved",   value: s.allTimeSolved.toLocaleString(), color:"text-brand-light" },
          { icon:<Flame size={15} className="text-orange-400" />,   label:"Best streak",    value: s.bestStreak, color:"text-orange-400" },
          { icon:<Trophy size={15} className="text-emerald-400" />, label:"USDC earned",    value: `${s.totalEarned} USDC`, color:"text-emerald-400" },
        ].map(st => (
          <div key={st.label} className="card p-4">
            <div className="flex items-center gap-1.5 mb-2">{st.icon}<p className="label">{st.label}</p></div>
            <p className={`text-xl font-black ${st.color}`}>{st.value}</p>
          </div>
        ))}
      </div>

      {/* Wallet */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={15} className="text-emerald-400" />
          <p className="text-sm font-bold">Wallet</p>
        </div>
        {s.walletAddress ? (
          <div className="bg-surface rounded-xl px-3 py-2.5 font-mono text-xs text-muted flex items-center justify-between">
            <span>{s.walletAddress.slice(0,6)}...{s.walletAddress.slice(-4)}</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-2 py-0.5">Celo Sepolia</span>
          </div>
        ) : (
          <p className="text-xs text-muted text-center py-2">Connect your wallet to receive prizes</p>
        )}
      </div>

      {/* Badges */}
      <div className="mb-4">
        <p className="text-sm font-bold mb-3 flex items-center gap-2"><Star size={14} className="text-gold" /> Achievements</p>
        <div className="grid grid-cols-3 gap-2.5">
          {BADGES.map(b => {
            const earned = b.check(s);
            return (
              <div key={b.id} className={clsx("card p-3 text-center flex flex-col items-center gap-1.5", !earned && "opacity-30")}>
                <span className="text-2xl">{b.emoji}</span>
                <p className="text-[11px] font-bold leading-tight text-center">{b.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
