"use client";
import { useGameStore } from "@/store/gameStore";
import BottomNav from "@/components/BottomNav";
import { Trophy, Clock } from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useCurrentPlayer } from "@/lib/wallet";

const COLORS = ["bg-yellow-500","bg-blue-500","bg-purple-500","bg-pink-500","bg-green-500","bg-orange-500","bg-cyan-500","bg-red-500"];

interface Entry {
  rank: number;
  player: string;
  displayName: string | null;
  score: number;
  correctCount: number;
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export default function LeaderboardPage() {
  const { username, todayScore } = useGameStore();
  const { address } = useCurrentPlayer();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function tick() {
      const midnight = new Date(); midnight.setUTCHours(24,0,0,0);
      const ms = midnight.getTime() - Date.now();
      const h = Math.floor(ms/3600000);
      const m = Math.floor((ms%3600000)/60000);
      setTimeLeft(`${h}h ${m}m`);
    }
    tick(); const id = setInterval(tick,60000); return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then(r => r.json())
      .then(d => { setEntries(d.entries ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const myEntry = entries.find(e => address && e.player.toLowerCase() === address.toLowerCase());
  const myRank = myEntry?.rank ?? (entries.length + 1);
  const top3 = entries.slice(0,3);
  const rest = entries.slice(3);

  function displayName(entry: Entry) {
    if (address && entry.player.toLowerCase() === address.toLowerCase()) return username;
    return entry.displayName ?? shortAddr(entry.player);
  }

  return (
    <div className="min-h-svh pb-24 px-4 pt-5 overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black flex items-center gap-2"><Trophy size={20} className="text-gold" /> Leaderboard</h1>
        <div className="flex items-center gap-1.5 text-xs text-muted"><Clock size={12} /> Resets in <span className="text-white font-semibold ml-1">{timeLeft}</span></div>
      </div>

      {/* Prize + rank */}
      <div className="rounded-2xl p-4 mb-4 border border-gold/30 flex items-center gap-3" style={{background:"linear-gradient(135deg,rgba(245,158,11,0.1),rgba(245,158,11,0.02))"}}>
        <span className="text-3xl">🏆</span>
        <div className="flex-1">
          <p className="font-black text-white">Daily prize: 1 USDC</p>
          <p className="text-xs text-muted mt-0.5">Paid on-chain to winner's wallet at midnight</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Your rank</p>
          <p className="text-2xl font-black text-gold">#{myRank}</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="card p-6 text-center text-muted text-sm">
          No scores yet today. Be the first to play!
        </div>
      )}

      {!loading && entries.length > 0 && (
        <>
          {/* Podium */}
          <div className="flex items-end justify-center gap-3 mb-5">
            {/* 2nd */}
            {top3[1] && (
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="relative"><div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black", COLORS[1])}>{displayName(top3[1])[0].toUpperCase()}</div><span className="absolute -bottom-1 -right-1 text-base">🥈</span></div>
                <p className="text-xs font-bold truncate w-20 text-center">{displayName(top3[1])}</p>
                <div className="w-full bg-slate-500/15 border border-slate-500/20 rounded-xl p-2 text-center" style={{height:"60px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <p className="font-black text-slate-300 text-base">{top3[1].score.toLocaleString()}</p>
                </div>
              </div>
            )}
            {/* 1st */}
            {top3[0] && (
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="relative"><div className="absolute -inset-1 bg-gold/20 rounded-2xl blur-sm" /><div className={clsx("relative w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl", COLORS[0])}>{displayName(top3[0])[0].toUpperCase()}</div><span className="absolute -bottom-1 -right-1 text-lg">🥇</span></div>
                <p className="text-xs font-bold truncate w-24 text-center">{displayName(top3[0])}</p>
                <div className="w-full bg-gold/10 border border-gold/30 rounded-xl p-2 text-center" style={{height:"80px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <p className="font-black text-gold text-lg">{top3[0].score.toLocaleString()}</p>
                </div>
              </div>
            )}
            {/* 3rd */}
            {top3[2] && (
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="relative"><div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black", COLORS[2])}>{displayName(top3[2])[0].toUpperCase()}</div><span className="absolute -bottom-1 -right-1 text-base">🥉</span></div>
                <p className="text-xs font-bold truncate w-20 text-center">{displayName(top3[2])}</p>
                <div className="w-full bg-amber-700/10 border border-amber-700/20 rounded-xl p-2 text-center" style={{height:"50px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <p className="font-black text-amber-600 text-base">{top3[2].score.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          {/* Rest of list */}
          {rest.length > 0 && (
            <div className="card overflow-hidden mb-4">
              {rest.map((entry) => {
                const isMe = address && entry.player.toLowerCase() === address.toLowerCase();
                return (
                  <div key={entry.player} className={clsx("flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0",
                    isMe ? "bg-brand/8 border-l-2 border-l-brand" : "")}>
                    <span className="text-muted text-sm font-bold w-6">#{entry.rank}</span>
                    <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0", COLORS[(entry.rank-1)%8])}>
                      {displayName(entry)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx("text-sm font-bold truncate", isMe && "text-brand-light")}>
                        {displayName(entry)}{isMe && " (you)"}
                      </p>
                      <p className="text-xs text-muted">{entry.correctCount} correct</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-white text-sm">{entry.score.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <BottomNav />
    </div>
  );
}
