"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Zap, Flame, Trophy, Loader2, X } from "lucide-react";
import clsx from "clsx";
import { useCurrentPlayer } from "@/lib/wallet";
import { useGameStore } from "@/store/gameStore";
import WalletSection from "@/components/WalletSection";
import PayAndPlayButton from "@/components/PayAndPlayButton";
import BottomNav from "@/components/BottomNav";
import { CAT_META, POINTS } from "@/lib/challenges";
import type { Difficulty, Category } from "@/lib/challenges";

const TIMER_SECS = 30;

interface ServerQuestion {
  id: string;
  category: Category;
  difficulty: Difficulty;
  prompt: string;
  options: string[];
  explanation: string;
}

type Phase = "lobby" | "question" | "feedback" | "done";

export default function PlayPage() {
  const router = useRouter();
  const { isConnected } = useCurrentPlayer();
  const { username } = useGameStore();

  const [runId, setRunId]         = useState<string | null>(null);
  const [question, setQuestion]   = useState<ServerQuestion | null>(null);
  const [qIndex, setQIndex]       = useState(0);
  const [totalQ, setTotalQ]       = useState(10);
  const [phase, setPhase]         = useState<Phase>("lobby");
  const [selected, setSelected]   = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [pts, setPts]             = useState(0);
  const [score, setScore]         = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak]       = useState(0);
  const [rank, setRank]           = useState<number | null>(null);
  const [timeLeft, setTimeLeft]   = useState(TIMER_SECS);
  const [timerRef, setTimerRef]   = useState<ReturnType<typeof setInterval> | null>(null);
  const [startTs, setStartTs]     = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [exiting, setExiting]     = useState(false);

  function startTimer() {
    setTimeLeft(TIMER_SECS);
    setStartTs(Date.now());
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          handleAnswer("__timeout__");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    setTimerRef(id);
  }

  function stopTimer() {
    if (timerRef) { clearInterval(timerRef); setTimerRef(null); }
  }

  function onRunStarted(newRunId: string, firstQ: unknown) {
    setRunId(newRunId);
    setQuestion(firstQ as ServerQuestion);
    setQIndex(0);
    setScore(0);
    setCorrectCount(0);
    setStreak(0);
    setRank(null);
    setPhase("question");
    startTimer();
  }

  async function handleAnswer(choice: string) {
    if (phase !== "question" || !runId || !question || submitting) return;
    stopTimer();
    const timeMsec = Date.now() - startTs;
    setSelected(choice);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/runs/${runId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, timeMsec }),
      });
      const data = await res.json();

      const correct = data.correct ?? false;
      setIsCorrect(correct);
      setPts(data.points ?? 0);
      setScore(data.score ?? score);
      setCorrectCount((c) => c + (correct ? 1 : 0));
      setStreak((s) => (correct ? s + 1 : 0));
      setPhase("feedback");

      if (data.ended) {
        setRank(data.rank ?? null);
        setTotalQ(data.totalQuestions ?? totalQ);
      } else if (data.nextQuestion) {
        setTimeout(() => {
          setQuestion(data.nextQuestion);
          setQIndex(data.qIndex ?? qIndex + 1);
        }, 0);
      }
    } catch {
      setPhase("feedback");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExitGame() {
    if (!runId || exiting) return;
    stopTimer();
    setExiting(true);
    try {
      await fetch(`/api/runs/${runId}/finish`, { method: "POST" });
    } catch { /* score already saved question by question */ }
    setExiting(false);
    setPhase("lobby");
  }

  function next() {
    if (rank !== null) {
      setPhase("done");
      return;
    }
    setSelected(null);
    setPhase("question");
    startTimer();
  }

  const cat = question ? CAT_META[question.category] : null;
  const timerPct = (timeLeft / TIMER_SECS) * 100;
  const urgent = timeLeft <= 5;
  const warn   = timeLeft <= 10 && !urgent;
  const timerColor = urgent ? "#EF4444" : warn ? "#F59E0B" : "#7C3AED";
  const r = 18, circ = 2 * Math.PI * r;

  // ── Lobby ────────────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <div className="min-h-svh flex flex-col px-4 pt-10 pb-28 gap-6">
        <div className="text-center">
          <p className="text-3xl font-black text-white mb-1">In The Dock</p>
          <p className="text-muted text-sm">Hey {username} · 10 questions · Best score wins the daily pot</p>
        </div>

        <div className="card p-5 flex flex-col gap-4">
          <WalletSection />
          {isConnected ? (
            <PayAndPlayButton onRunStarted={onRunStarted} />
          ) : (
            <p className="text-xs text-center text-muted">Connect your wallet to play</p>
          )}
        </div>

        <div className="card p-4 flex flex-col gap-2 text-sm">
          <p className="font-bold text-white">How it works</p>
          <p className="text-muted text-xs">1. First play of the day is <span className="text-emerald-400 font-semibold">free</span></p>
          <p className="text-muted text-xs">2. Extra plays cost <span className="text-gold font-semibold">0.10 USDC</span> — 80% goes to the pot</p>
          <p className="text-muted text-xs">3. Highest score at midnight wins the entire pot</p>
          <p className="text-muted text-xs">4. Prize paid on-chain to your wallet</p>
        </div>

        <BottomNav />
      </div>
    );
  }

  // ── Done screen ──────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center px-4 gap-6 text-center pb-28">
        <Trophy size={56} className="text-gold" />
        <div>
          <p className="text-3xl font-black text-white">{score} pts</p>
          <p className="text-muted mt-1">{correctCount} / {totalQ} correct</p>
          {rank && <p className="text-xl font-black text-brand-light mt-3">Rank #{rank} today</p>}
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={() => setPhase("lobby")} className="btn-brand py-4 font-black">
            Play again
          </button>
          <button onClick={() => router.push("/leaderboard")} className="py-3 text-sm text-muted border border-border rounded-2xl">
            See leaderboard
          </button>
          <button onClick={() => router.push("/home")} className="py-3 text-sm text-muted border border-border rounded-2xl">
            Back to home
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Question / Feedback ──────────────────────────────────────────────────
  return (
    <div className="min-h-svh flex flex-col px-4 pt-4 pb-8">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="card px-3 py-1.5 flex items-center gap-1.5">
            <Zap size={13} className="text-gold" />
            <span className="font-black text-gold text-sm">{score}</span>
          </div>
          {streak >= 2 && (
            <div className="card px-2.5 py-1.5 flex items-center gap-1">
              <Flame size={12} className="text-orange-400" />
              <span className="text-xs font-bold text-orange-400">{streak}🔥</span>
            </div>
          )}
        </div>

        <span className="text-xs text-muted">{qIndex + 1} / {totalQ}</span>

        <button
          onClick={handleExitGame}
          disabled={exiting}
          className="card p-2 text-muted hover:text-white transition-colors disabled:opacity-40"
          title="Exit game (saves your score)"
        >
          {exiting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {phase === "question" && question && (
          <motion.div key={`q-${qIndex}`} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}} transition={{duration:0.2}} className="flex flex-col gap-4 flex-1">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{cat?.emoji}</span>
                <div>
                  <p className="text-[10px] text-muted">{cat?.label}</p>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-brand-light">
                    {question.difficulty} · +{POINTS[question.difficulty]} pts
                  </span>
                </div>
              </div>
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                  <circle cx="22" cy="22" r={r} fill="none" stroke={timerColor}
                    strokeWidth="3.5" strokeDasharray={circ}
                    strokeDashoffset={circ - (timerPct/100)*circ} strokeLinecap="round"
                    style={{transition:"stroke-dashoffset 0.9s linear,stroke 0.3s"}} />
                </svg>
                <span className={clsx("absolute inset-0 flex items-center justify-center text-xs font-black",
                  urgent?"text-red-400":warn?"text-gold":"text-brand-light")}>
                  {timeLeft}
                </span>
              </div>
            </div>

            <div className="card p-5 flex-1 flex items-center justify-center">
              <p className="font-mono text-xl font-bold text-white whitespace-pre-wrap text-center leading-relaxed">{question.prompt}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {question.options.map((opt) => (
                <button key={opt} onClick={() => handleAnswer(opt)} disabled={submitting}
                  className="option min-h-[72px] flex items-center justify-center text-center disabled:opacity-50">
                  {submitting && selected === opt
                    ? <Loader2 size={18} className="animate-spin" />
                    : <span className="font-black text-lg leading-tight">{opt}</span>}
                </button>
              ))}
            </div>

            <p className="text-center text-xs text-muted">Pick one · Timer auto-submits · Tap ✕ to exit anytime</p>
          </motion.div>
        )}

        {phase === "feedback" && question && (
          <motion.div key={`f-${qIndex}`} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{duration:0.25}} className="flex flex-col gap-4 flex-1">

            <div className={clsx("rounded-2xl p-5 flex items-center gap-4 border-2",
              isCorrect ? "bg-correct/10 border-correct/40" : "bg-wrong/10 border-wrong/40")}>
              {isCorrect
                ? <CheckCircle size={40} className="text-correct flex-shrink-0" />
                : <XCircle    size={40} className="text-wrong   flex-shrink-0" />}
              <div className="flex-1">
                <p className="text-lg font-black">
                  {isCorrect ? "Correct! 🎉" : selected === "__timeout__" ? "Time's up! ⏰" : "Wrong answer"}
                </p>
                {isCorrect
                  ? <p className="text-correct text-sm mt-0.5">+{pts} points!</p>
                  : <p className="text-sm text-white/70 mt-0.5">No points this round</p>}
              </div>
              <span className={clsx("text-3xl font-black", isCorrect ? "text-correct" : "text-wrong")}>
                {isCorrect ? `+${pts}` : "+0"}
              </span>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💡</span>
                <p className="font-bold text-sm">Explanation</p>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">{question.explanation}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {question.options.map((opt) => (
                <div key={opt} className={clsx("option min-h-[60px] flex items-center justify-center text-center",
                  isCorrect && opt === selected ? "opt-correct"
                  : !isCorrect && opt === selected ? "opt-wrong"
                  : "opt-dim")}>
                  <span className="font-black leading-tight">{opt}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-auto">
              <button
                onClick={handleExitGame}
                disabled={exiting}
                className="flex-none px-4 py-4 rounded-2xl border border-border text-muted hover:text-white transition-colors disabled:opacity-40 flex items-center gap-2 text-sm font-semibold"
              >
                {exiting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Exit
              </button>

              {rank !== null ? (
                <button onClick={() => setPhase("done")} className="btn-brand py-4 text-base font-black flex-1">
                  See final score →
                </button>
              ) : (
                <button onClick={next} className="btn-brand py-4 text-base font-black flex-1">
                  Next question →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
