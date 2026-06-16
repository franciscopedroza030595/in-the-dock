"use client";

import { useAccount } from "wagmi";

export function useCurrentPlayer(): { address: string; isConnected: boolean } {
  const { address, isConnected } = useAccount();
  return {
    address: address ? address.toLowerCase() : "",
    isConnected: !!isConnected,
  };
}
