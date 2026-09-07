import { notFound } from "next/navigation";
import NetworkDashboard from "@/components/NetworkDashboard";
import { getNetworkMember, listMemberMatches, query } from "@/lib/db";
import { hashToken, safeEqualHex } from "@/lib/security";
import { matchMemberToCampaigns } from "@/lib/network";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ key?: string }> }) {
  const { id } = await params;
  const { key } = await searchParams;
  if (!key) notFound();
  const auth = await query<{ manage_secret_hash: string }>("SELECT manage_secret_hash FROM network_members WHERE id=$1 AND status='active'", [id]);
  if (!auth.rows[0] || !safeEqualHex(auth.rows[0].manage_secret_hash, hashToken(key))) notFound();
  await matchMemberToCampaigns(id);
  await query("UPDATE network_members SET last_seen_at=NOW() WHERE id=$1", [id]);
  const [member, matches] = await Promise.all([getNetworkMember(id), listMemberMatches(id)]);
  if (!member) notFound();
  return <NetworkDashboard member={member} matches={matches} privateKey={key} />;
}
