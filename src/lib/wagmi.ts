"use client";

import { http } from "viem";
import { createConfig } from "wagmi";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { ACTIVE_CHAIN, CELO_TRANSPORT } from "./chain";

const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const wallets = [
  injectedWallet,   // catches MiniPay + MetaMask
  metaMaskWallet,
  rabbyWallet,
  coinbaseWallet,
  ...(WALLETCONNECT_PROJECT_ID ? [walletConnectWallet] : []),
];

const connectors = connectorsForWallets(
  [{ groupName: "Recommended", wallets }],
  { appName: "In The Dock", projectId: WALLETCONNECT_PROJECT_ID || "dummy" },
);

export const wagmiConfig = createConfig({
  chains: [ACTIVE_CHAIN],
  transports: { [ACTIVE_CHAIN.id]: CELO_TRANSPORT },
  connectors,
  ssr: true,
});
