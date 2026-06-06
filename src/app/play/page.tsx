"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Zap, Flame } from "lucide-react";
import clsx from "clsx";
import { useGameStore } from "@/store/gameStore";
import { getChallengeBatch, CAT_META, POINTS, Challenge } from "@/lib/challenges";

const DIFF_CLASS: Record<string,string> = { EASY:"diff-easy", MEDIUM:"diff-medium", HARD:"diff-hard", EXPERT:"diff-expert" };
const TIMER_SECS = 30;

type Phase = "loading" | "question" | "feedback";

export default function PlayPage() {
  const router = useRouter();
  const store = useGameStore();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [idx, setIdx]               = useState(0);
  const [phase, setPhase]           = useState<Phase>("loading");
  const [selected, setSelected]     = useState<string|null>(null);
  const [timeLeft, setTimeLeft]     = useState(TIMER_SECS);
  const [shakeKey, setShakeKey]     = useState(0);
  const startRef   = useRef(0);
  const timerRef   = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (store.todayAttempted >= 120) { router.replace("/home"); return; }
    const batch = getChallengeBatch(10, store.todayAttempts.map(a => a.challengeId));
    setChallenges(batch);
    setIdx(0);
    setPhase("question");
  }, []);

  useEffect(() => {
    if (phase !== "question") return;
    setTimeLeft(TIMER_SECS);
    startRef.current = Date.now();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleAnswer("__timeout__"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [idx, phase]);

  const challenge = challenges[idx];
  if (!challenge && phase !== "loading") {
    // Session complete
    router.replace("/home");
    return null;
  }

  function handleAnswer(opt: string) {
    if (phase !== "question" || !challenge) return;
    clearInterval(timerRef.current);
    const ms = Date.now() - startRef.current;
    const correct = opt === challenge.answer;
    if (!correct && opt !== "__timeout__") setShakeKey(k => k+1);
    setSelected(opt);
    setPhase("feedback");
    store.recordAttempt(challenge.id, correct, ms);
  }

  function next() {
    const nextIdx = idx + 1;
    if (nextIdx >= challenges.length || store.todayAttempted >= 120) {
      router.replace("/home");
      return;
    }
    setIdx(nextIdx);
    setSelected(null);
    setPhase("question");
  }

  if (phase === "loading" || !challenge) return (
    <div className="min-h-svh flex items-center justify-center">
      <Brain className="text-brand animate-pulse" size={40} />
    </div>
  );

  const isCorrect = selected === challenge.answer;
  const cat = CAT_META[challenge.category];
  const timerPct = (timeLeft / TIMER_SECS) * 100;
  const urgent = timeLeft <= 5;
  const warn   = timeLeft <= 10 && !urgent;
  const timerColor = urgent ? "#EF4444" : warn ? "#F59E0B" : "#7C3AED";
  const r = 18, circ = 2 * Math.PI * r;

  return (
    <div className="min-h-svh flex flex-col px-4 pt-4 pb-8">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="card px-3 py-1.5 flex items-center gap-1.5">
            <Zap size={13} className="text-gold" />
            <span className="font-black text-gold text-sm">{store.todayScore}</span>
          </div>
          {store.streak >= 2 && (
            <div className="card px-2.5 py-1.5 flex items-center gap-1">
              <Flame size={12} className="text-orange-400" />
              <span className="text-xs font-bold text-orange-400">{store.streak}🔥</span>
            </div>
          )}
        </div>
        <span className="text-xs text-muted">{store.todayAttempted} / 120</span>
      </div>

      <AnimatePresence mode="wait">
        {phase === "question" && (
          <motion.div key={`q-${idx}`} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}} transition={{duration:0.2}} className="flex flex-col gap-4 flex-1">

            {/* Challenge meta + timer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{cat.emoji}</span>
                <div>
                  <p className="text-[10px] text-muted">{cat.label}</p>
                  <span className={DIFF_CLASS[challenge.difficulty]}>{challenge.difficulty} · +{POINTS[challenge.difficulty]} pts</span>
                </div>
              </div>
              {/* SVG timer ring */}
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                  <circle cx="22" cy="22" r={r} fill="none" stroke={timerColor}
                    strokeWidth="3.5" strokeDasharray={circ}
                    strokeDashoffset={circ - (timerPct/100)*circ} strokeLinecap="round"
                    style={{transition:"stroke-dashoffset 0.9s linear,stroke 0.3s"}} />
                </svg>
                <span className={clsx("absolute inset-0 flex items-center justify-center text-xs font-black", urgent?"text-wrong":warn?"text-gold":"text-brand-light")}>
                  {timeLeft}
                </span>
              </div>
            </div>

            {/* Prompt */}
            <div className="card p-5 flex-1 flex items-center justify-center">
              <p className="font-mono text-xl font-bold text-white whitespace-pre-wrap text-center leading-relaxed">{challenge.prompt}</p>
            </div>

            {/* Options — 2×2 grid */}
            <div key={shakeKey} className={clsx("grid grid-cols-2 gap-3", shakeKey > 0 && "animate-shake")}>
              {challenge.options.map(opt => (
                <button key={opt} onClick={() => handleAnswer(opt)} className="option min-h-[72px] flex items-center justify-center text-center">
                  <span className="font-black text-lg leading-tight">{opt}</span>
                </button>
              ))}
            </div>

            <p className="text-center text-xs text-muted">Pick one · No retries · Timer auto-submits</p>
          </motion.div>
        )}

        {phase === "feedback" && (
          <motion.div key={`f-${idx}`} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{duration:0.25}} className="flex flex-col gap-4 flex-1">

            {/* Result banner */}
            <div className={clsx("rounded-2xl p-5 flex items-center gap-4 border-2",
              isCorrect ? "bg-correct/10 border-correct/40" : "bg-wrong/10 border-wrong/40")}>
              {isCorrect
                ? <CheckCircle size={40} className="text-correct flex-shrink-0" />
                : <XCircle    size={40} className="text-wrong   flex-shrink-0" />}
              <div className="flex-1">
                <p className="text-lg font-black">{isCorrect ? "Correct! 🎉" : selected === "__timeout__" ? "Time's up! ⏰" : "Wrong answer"}</p>
                {isCorrect
                  ? <p className="text-correct text-sm mt-0.5">+{POINTS[challenge.difficulty]} points!</p>
                  : <p className="text-sm text-white/70 mt-0.5">Answer: <span className="text-white font-black">{challenge.answer}</span></p>}
              </div>
              <span className={clsx("text-3xl font-black", isCorrect ? "text-correct" : "text-wrong")}>
                {isCorrect ? `+${POINTS[challenge.difficulty]}` : "+0"}
              </span>
            </div>

            {/* Explanation */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💡</span>
                <p className="font-bold text-sm">Explanation</p>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">{challenge.explanation}</p>
            </div>

            {/* Options recap */}
            <div className="grid grid-cols-2 gap-2.5">
              {challenge.options.map(opt => (
                <div key={opt} className={clsx("option min-h-[60px] flex items-center justify-center text-center",
                  opt === challenge.answer ? "opt-correct" : opt === selected ? "opt-wrong" : "opt-dim")}>
                  <span className="font-black leading-tight">{opt}</span>
                </div>
              ))}
            </div>

            <button onClick={next} className="btn-brand py-4 text-base font-black mt-auto">
              {idx + 1 >= challenges.length ? "Back to home →" : "Next challenge →"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Brain({ className, size }: { className?: string; size?: number }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size||24} height={size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>;
}
