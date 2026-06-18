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

  showUsername: boolean;

  // Actions
  setUsername: (name: string) => void;
  setShowUsername: (show: boolean) => void;
  setWallet: (addr: string) => void;
  completeOnboarding: () => void;
  startSession: (challenges: Challenge[]) => void;
  recordAttempt: (challengeId: string, correct: boolean, ms: number) => void;
  addScore: (pts: number, correct: boolean, streak: number) => void;
  addEarned: (usdc: number) => void;
  setEarned: (usdc: number) => void;
  endSession: () => void;
  resetIfNewDay: () => void;
  resetIdentity: () => void;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      username:        "Player",
      showUsername:    true,
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
      setShowUsername: (show) => set({ showUsername: show }),
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

      addScore: (pts, correct, newStreak) => {
        const s = get();
        s.resetIfNewDay();
        const s2 = get();
        set({
          todayScore:    s2.todayScore + pts,
          todayCorrect:  s2.todayCorrect + (correct ? 1 : 0),
          todayAttempted: s2.todayAttempted + 1,
          streak:        newStreak,
          bestStreak:    Math.max(s2.bestStreak, newStreak),
          allTimeScore:  s2.allTimeScore + pts,
          allTimeSolved: s2.allTimeSolved + (correct ? 1 : 0),
        });
      },

      addEarned: (usdc) => set((s) => ({ totalEarned: s.totalEarned + usdc })),
      setEarned: (usdc) => set({ totalEarned: usdc }),

      endSession: () => set({ sessionActive: false }),

      // Wipe all local identity/stats — used when disconnecting to switch wallets,
      // since stats are per-wallet (server-side) and shouldn't leak across accounts.
      resetIdentity: () => set({
        username:       "Player",
        showUsername:   true,
        walletAddress:  null,
        isOnboarded:    false,
        todayDate:      todayStr(),
        todayScore:     0,
        todayCorrect:   0,
        todayAttempted: 0,
        todayAttempts:  [],
        streak:         0,
        bestStreak:     0,
        allTimeScore:   0,
        allTimeSolved:  0,
        daysPlayed:     0,
        totalEarned:    0,
      }),

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
        username: s.username, showUsername: s.showUsername, walletAddress: s.walletAddress, isOnboarded: s.isOnboarded,
        todayDate: s.todayDate, todayScore: s.todayScore, todayCorrect: s.todayCorrect,
        todayAttempted: s.todayAttempted, todayAttempts: s.todayAttempts,
        streak: s.streak, bestStreak: s.bestStreak,
        allTimeScore: s.allTimeScore, allTimeSolved: s.allTimeSolved,
        daysPlayed: s.daysPlayed, totalEarned: s.totalEarned,
      }),
    }
  )
);

