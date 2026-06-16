"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { useCurrentPlayer } from "@/lib/wallet";
import OnboardingScreen from "@/components/OnboardingScreen";

export default function Home() {
  const { isOnboarded, username, resetIfNewDay, completeOnboarding } = useGameStore();
  const { isConnected, address } = useCurrentPlayer();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    resetIfNewDay();
    setReady(true);
  }, []);

  // If wallet connects and we already have a real username → mark onboarded and go home
  useEffect(() => {
    if (!ready) return;
    const hasUsername = username && username !== "Player" && !username.startsWith("Player");
    if (isConnected && address && hasUsername && !isOnboarded) {
      completeOnboarding();
    }
  }, [ready, isConnected, address, username, isOnboarded]);

  useEffect(() => {
    if (ready && isOnboarded) router.replace("/home");
  }, [ready, isOnboarded]);

  if (!ready) return (
    <div className="min-h-svh flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isOnboarded) return <OnboardingScreen />;
  return null;
}
