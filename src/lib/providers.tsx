"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "./wagmi";
import { useMiniPayAutoConnect } from "./minipay";
import { AccountWatcher } from "./accountWatcher";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

function MiniPayBridge() {
  useMiniPayAutoConnect();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#7C3AED",
            accentColorForeground: "white",
            borderRadius: "large",
          })}
        >
          <MiniPayBridge />
          <AccountWatcher />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
