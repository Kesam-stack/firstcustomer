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
