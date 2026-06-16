export async function savePlayer(address: string, fields: { username?: string; show_username?: boolean }) {
  await fetch("/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, ...fields }),
  });
}
