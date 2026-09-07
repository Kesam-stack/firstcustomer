import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || "");
  if (!["active", "paused"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const updated = await query("UPDATE network_members SET status=$2 WHERE id=$1 RETURNING id", [id, status]);
  if (!updated.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, status });
}
