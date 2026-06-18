export async function savePlayer(address: string, fields: { username?: string; show_username?: boolean }) {
  await fetch("/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, ...fields }),
  });
}

export interface PlayerRecord {
  address: string;
  username: string;
  show_username: boolean;
  totalEarned: number;
}

export async function getPlayer(address: string): Promise<PlayerRecord | null> {
  try {
    const res = await fetch(`/api/players/${address}`, { cache: "no-store" });
    const data = await res.json();
    return data.player ?? null;
  } catch {
    return null;
  }
}
