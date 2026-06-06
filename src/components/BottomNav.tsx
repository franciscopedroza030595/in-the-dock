"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, Trophy, User } from "lucide-react";
import clsx from "clsx";

const TABS = [
  { href: "/home",        icon: Home,   label: "Home" },
  { href: "/play",        icon: Zap,    label: "Play" },
  { href: "/leaderboard", icon: Trophy, label: "Board" },
  { href: "/profile",     icon: User,   label: "Profile" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur-sm border-t border-border flex z-50 pb-safe">
      {TABS.map(({ href, icon: Icon, label }) => {
        const active = path.startsWith(href);
        return (
          <Link key={href} href={href} className={clsx(
            "flex-1 flex flex-col items-center gap-1 py-3 transition-colors touch-manipulation",
            active ? "text-brand-light" : "text-muted"
          )}>
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className={clsx("text-[10px] font-semibold", active ? "text-brand-light" : "text-muted")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
