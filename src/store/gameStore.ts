import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Challenge, POINTS } from "@/lib/challenges";

export interface AttemptRecord {
  challengeId: string;
  correct: boolean;
  points: number;
  ms: number;
  at: number;
}

interface GameState {
  // Identity
  username: string;
  walletAddress: string | null;
  isOnboarded: boolean;

  // Today's session (resets at midnight)
  todayDate: string;
  todayScore: number;
  todayCorrect: number;
  todayAttempted: number;
  todayAttempts: AttemptRecord[];
  streak: number;
  bestStreak: number;

  // All-time
  allTimeScore: number;
  allTimeSolved: number;
  daysPlayed: number;
  totalEarned: number; // simulated USDC wins

  // Active challenge session
  currentChallenges: Challenge[];
  currentIdx: number;
  sessionActive: boolean;

  // Actions
  setUsername: (name: string) => void;
  setWallet: (addr: string) => void;
  completeOnboarding: () => void;
  startSession: (challenges: Challenge[]) => void;
  recordAttempt: (challengeId: string, correct: boolean, ms: number) => void;
  endSession: () => void;
  resetIfNewDay: () => void;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      username:        "Player",
      walletAddress:   null,
      isOnboarded:     false,

      todayDate:       todayStr(),
      todayScore:      0,
      todayCorrect:    0,
      todayAttempted:  0,
      todayAttempts:   [],
      streak:          0,
      bestStreak:      0,

      allTimeScore:    0,
      allTimeSolved:   0,
      daysPlayed:      0,
      totalEarned:     0,

      currentChallenges: [],
      currentIdx:        0,
      sessionActive:     false,

      setUsername: (name) => set({ username: name }),
      setWallet:   (addr) => set({ walletAddress: addr }),

      completeOnboarding: () => set({ isOnboarded: true }),

      startSession: (challenges) => set({
        currentChallenges: challenges,
        currentIdx: 0,
        sessionActive: true,
      }),

      recordAttempt: (challengeId, correct, ms) => {
        const s = get();
        s.resetIfNewDay();
        const s2 = get();
        const challenge = s2.currentChallenges.find(c => c.id === challengeId);
        if (!challenge) return;

        const pts = correct ? POINTS[challenge.difficulty] : 0;
        const newStreak = correct ? s2.streak + 1 : 0;
        const record: AttemptRecord = { challengeId, correct, points: pts, ms, at: Date.now() };

        set({
          todayScore:     s2.todayScore + pts,
          todayCorrect:   s2.todayCorrect + (correct ? 1 : 0),
          todayAttempted: s2.todayAttempted + 1,
          todayAttempts:  [...s2.todayAttempts, record],
          streak:         newStreak,
          bestStreak:     Math.max(s2.bestStreak, newStreak),
          allTimeScore:   s2.allTimeScore + pts,
          allTimeSolved:  s2.allTimeSolved + (correct ? 1 : 0),
          currentIdx:     s2.currentIdx + 1,
        });
      },

      endSession: () => set({ sessionActive: false }),

      resetIfNewDay: () => {
        const s = get();
        const today = todayStr();
        if (s.todayDate !== today) {
          set({
            todayDate:      today,
            todayScore:     0,
            todayCorrect:   0,
            todayAttempted: 0,
            todayAttempts:  [],
            streak:         0,
            daysPlayed:     s.daysPlayed + 1,
          });
        }
      },
    }),
    {
      name: "itd-demo-state",
      partialize: (s) => ({
        username: s.username, walletAddress: s.walletAddress, isOnboarded: s.isOnboarded,
        todayDate: s.todayDate, todayScore: s.todayScore, todayCorrect: s.todayCorrect,
        todayAttempted: s.todayAttempted, todayAttempts: s.todayAttempts,
        streak: s.streak, bestStreak: s.bestStreak,
        allTimeScore: s.allTimeScore, allTimeSolved: s.allTimeSolved,
        daysPlayed: s.daysPlayed, totalEarned: s.totalEarned,
      }),
    }
  )
);

// Simulated leaderboard data
export const MOCK_LEADERBOARD = [
  { rank: 1, username: "mariag_col",  score: 2840, solved: 142, streak: 6, country: "🇨🇴" },
  { rank: 2, username: "tokyo_tim",   score: 2310, solved: 118, streak: 4, country: "🇯🇵" },
  { rank: 3, username: "ibrahim_ng",  score: 1990, solved:  99, streak: 3, country: "🇳🇬" },
  { rank: 4, username: "priya_m",     score: 1450, solved:  72, streak: 1, country: "🇮🇳" },
  { rank: 5, username: "carlos_dev",  score: 1200, solved:  60, streak: 0, country: "🇲🇽" },
  { rank: 6, username: "alex_k",      score:  980, solved:  49, streak: 2, country: "🇰🇪" },
  { rank: 7, username: "fatou_s",     score:  760, solved:  38, streak: 0, country: "🇸🇳" },
  { rank: 8, username: "jung_h",      score:  620, solved:  31, streak: 1, country: "🇰🇷" },
];
