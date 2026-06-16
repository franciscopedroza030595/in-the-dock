"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCurrentPlayer } from "@/lib/wallet";
import { useIsMiniPay } from "@/lib/minipay";
import { Wallet } from "lucide-react";

export default function WalletSection() {
  const { isConnected, address } = useCurrentPlayer();
  const inMiniPay = useIsMiniPay();

  if (inMiniPay && isConnected) {
    return (
      <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-2">
        <Wallet size={13} className="text-emerald-400" />
        <span className="font-mono text-xs text-muted">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <span className="text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5 ml-auto">
          MiniPay
        </span>
      </div>
    );
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        if (!mounted) return null;
        if (!account) {
          return (
            <button
              onClick={openConnectModal}
              className="flex items-center gap-2 btn-brand w-full py-3 text-sm font-bold"
            >
              <Wallet size={15} />
              Connect wallet to play
            </button>
          );
        }
        return (
          <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-2">
            <Wallet size={13} className="text-emerald-400" />
            <span className="font-mono text-xs text-muted">
              {account.address.slice(0, 6)}…{account.address.slice(-4)}
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5 ml-auto">
              {chain?.name ?? "Celo"}
            </span>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
