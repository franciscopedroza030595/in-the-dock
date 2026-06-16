"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { useGameStore } from "@/store/gameStore";

/**
 * Detects wallet account switches (not just connect/disconnect) anywhere in
 * the app and forces a clean re-onboard for the new address. Without this,
 * a user who switches accounts inside MetaMask/Rabby while already on
 * /home would keep seeing the PREVIOUS wallet's username and stats.
 */
export function AccountWatcher() {
  const { address, isConnected } = useAccount();
  const { walletAddress, isOnboarded, resetIdentity } = useGameStore();
  const router = useRouter();
  const pathname = usePathname();
  const lastSeen = useRef<string | null>(null);

  useEffect(() => {
    const current = isConnected && address ? address.toLowerCase() : null;

    // First mount: just remember whatever address is active (handles auto-reconnect).
    if (lastSeen.current === null) {
      lastSeen.current = current;
      return;
    }

    if (current !== lastSeen.current) {
      lastSeen.current = current;
      // Address changed (account switch) or wallet disconnected externally.
      if (isOnboarded && walletAddress && current !== walletAddress.toLowerCase()) {
        resetIdentity();
        if (pathname !== "/") router.replace("/");
      }
    }
  }, [address, isConnected]);

  return null;
}
