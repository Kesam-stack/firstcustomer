export function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function cleanHandle(value: string) {
  return value.trim().replace(/^@+/, "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30);
}

export function remaining(goal: number, approved: number) {
  return Math.max(0, goal - approved);
}

export function poolCents(rewardCents: number, goal: number, approved: number) {
  return remaining(goal, approved) * rewardCents;
}

export function tweetIntent(text: string) {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

export function xProfileUrl(handle: string | null | undefined) {
  const clean = handle ? cleanHandle(handle) : "";
  return clean ? `https://x.com/${clean}` : null;
}

export function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function absoluteTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
