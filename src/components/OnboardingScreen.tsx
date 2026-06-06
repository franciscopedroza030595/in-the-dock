"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";

const SLIDES = [
  {
    emoji: "⚖️",
    title: "Welcome to\nIn The Dock",
    desc: "Daily abstract reasoning challenges.\nSharpen your mind every day.",
    color: "from-brand/20 to-transparent",
  },
  {
    emoji: "🧠",
    title: "5 types of\nchallenges",
    desc: "Patterns · Matrices · Symbol logic\nSpatial · Sequences",
    color: "from-purple-600/20 to-transparent",
    preview: (
      <div className="card p-4 text-center mt-4">
        <p className="text-xs text-muted mb-2 label">Pattern Recognition</p>
        <p className="text-2xl font-black font-mono text-white tracking-wider">2, 4, 8, 16, <span className="text-brand-light">?</span></p>
        <p className="text-correct text-sm mt-2 font-bold">→ 32</p>
      </div>
    ),
  },
  {
    emoji: "⚡",
    title: "30 seconds\nto answer",
    desc: "No retries. No cheating.\nFastest + most accurate wins.",
    color: "from-amber-600/20 to-transparent",
    preview: (
      <div className="flex items-center justify-center gap-4 mt-4">
        <div className="card p-3 text-center">
          <p className="text-2xl font-black text-emerald-400">5</p>
          <p className="label mt-1">Easy</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-black text-amber-400">10</p>
          <p className="label mt-1">Medium</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-black text-orange-400">20</p>
          <p className="label mt-1">Hard</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-black text-red-400">40</p>
          <p className="label mt-1">Expert</p>
        </div>
      </div>
    ),
  },
  {
    emoji: "🏆",
    title: "Win 1 USDC\nevery day",
    desc: "Top scorer at midnight wins.\nPaid on-chain to your Celo wallet.",
    color: "from-yellow-600/20 to-transparent",
    preview: (
      <div className="card p-4 mt-4 border-gold/30 bg-gold/5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💰</span>
          <div>
            <p className="font-black text-white">Daily prize: 1 USDC</p>
            <p className="text-xs text-muted mt-0.5">Resets at midnight UTC</p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function OnboardingScreen() {
  const [slide, setSlide] = useState(0);
  const [username, setUsername] = useState("");
  const [step, setStep] = useState<"slides" | "name">("slides");
  const { setUsername: saveUsername, completeOnboarding } = useGameStore();
  const router = useRouter();

  const isLast = slide === SLIDES.length - 1;

  function next() {
    if (isLast) { setStep("name"); return; }
    setSlide(s => s + 1);
  }

  function finish() {
    const name = username.trim() || `Player${Math.floor(Math.random() * 9999)}`;
    saveUsername(name);
    completeOnboarding();
    router.replace("/home");
  }

  return (
    <div className="min-h-svh flex flex-col px-5 pt-12 pb-8">

      {step === "slides" && (
        <>
          {/* Progress */}
          <div className="flex gap-1.5 mb-10">
            {SLIDES.map((_, i) => (
              <div key={i} className={`h-1 rounded-full flex-1 transition-all ${i <= slide ? "bg-brand" : "bg-border"}`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={slide} initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}} transition={{duration:0.2}} className="flex-1 flex flex-col">
              <div className={`rounded-3xl bg-gradient-to-b ${SLIDES[slide].color} p-6 flex-1 flex flex-col justify-center`}>
                <p className="text-6xl mb-4 text-center">{SLIDES[slide].emoji}</p>
                <h1 className="text-3xl font-black text-white text-center whitespace-pre-line leading-tight">{SLIDES[slide].title}</h1>
                <p className="text-muted text-center mt-3 leading-relaxed whitespace-pre-line">{SLIDES[slide].desc}</p>
                {(SLIDES[slide] as any).preview}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3 mt-6">
            {slide > 0 && <button onClick={() => setSlide(s => s-1)} className="btn-ghost flex-1 py-4">← Back</button>}
            <button onClick={next} className="btn-brand flex-1 py-4 text-base">
              {isLast ? "Get started →" : "Next →"}
            </button>
          </div>
        </>
      )}

      {step === "name" && (
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="flex-1 flex flex-col justify-center gap-6">
          <div className="text-center">
            <p className="text-5xl mb-4">🎯</p>
            <h2 className="text-3xl font-black text-white">Choose your\ncompetitor name</h2>
            <p className="text-muted text-sm mt-2">This shows on the leaderboard</p>
          </div>

          <div className="card p-4">
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.slice(0,20))}
              onKeyDown={e => e.key === "Enter" && finish()}
              placeholder="e.g. mariag_col"
              maxLength={20}
              autoFocus
              className="w-full bg-transparent text-white text-xl font-bold outline-none placeholder:text-muted text-center"
            />
          </div>

          <p className="text-xs text-muted text-center">Max 20 chars · Letters, numbers, underscore</p>

          <button onClick={finish} className="btn-brand py-4 text-base font-black">
            Start competing →
          </button>
        </motion.div>
      )}
    </div>
  );
}
