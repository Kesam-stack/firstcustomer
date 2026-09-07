import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashToken, randomToken, safeEqualHex } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerKey = req.headers.get("x-owner-key") || "";
  const auth = await query<{ owner_secret_hash: string }>("SELECT owner_secret_hash FROM bounties WHERE id=$1", [id]);
  if (!auth.rows[0] || !ownerKey || !safeEqualHex(auth.rows[0].owner_secret_hash, hashToken(ownerKey))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const integrationKey = `fc_live_${randomToken(24)}`;
  await query(
    "UPDATE bounties SET integration_secret_hash=$2, integration_secret_prefix=$3 WHERE id=$1",
    [id, hashToken(integrationKey), integrationKey.slice(0, 12)],
  );
  return NextResponse.json({ integrationKey, prefix: integrationKey.slice(0, 12) });
}
