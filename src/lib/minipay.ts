"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect } from "wagmi";

export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  const eth = (window as { ethereum?: { isMiniPay?: boolean } }).ethereum;
  return Boolean(eth?.isMiniPay);
}

export function useIsMiniPay(): boolean {
  const [inMiniPay, setInMiniPay] = useState(false);
  useEffect(() => { setInMiniPay(isMiniPay()); }, []);
  return inMiniPay;
}

// On testnet MockUSDT has no CIP-64 adapter, so no feeCurrency override.
// Wire this up when you switch to mainnet USDT.
export function useTxOverrides(): Record<string, never> {
  return {};
}

export function useMiniPayAutoConnect(): void {
  const { isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current || isConnected) return;
    if (!isMiniPay()) return;
    const injected = connectors.find((c) => c.type === "injected");
    if (!injected) return;
    tried.current = true;
    connect({ connector: injected });
  }, [connectors, connect, isConnected]);
}
