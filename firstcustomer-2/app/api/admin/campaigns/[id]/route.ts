import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { getBountyById, query } from "@/lib/db";

export const runtime = "nodejs";

const statuses = new Set(["active", "paused", "closed"]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const bounty = await getBountyById(id);
  if (!bounty) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "status") {
    const status = String(body.status || "");
    if (!statuses.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    if (status === "active" && !bounty.payment_verified && bounty.launch_fee_cents > 0) {
      return NextResponse.json({ error: "Cannot activate an unpaid campaign." }, { status: 400 });
    }
    if (status === "active" && bounty.launch_fee_cents === 0) {
      await query("UPDATE bounties SET status='active', payment_verified=TRUE, activated_at=COALESCE(activated_at,NOW()) WHERE id=$1", [id]);
    } else {
      await query("UPDATE bounties SET status=$2 WHERE id=$1", [id, status]);
    }
    revalidatePath("/");
    revalidatePath("/explore");
    revalidatePath("/network");
    revalidatePath(`/b/${bounty.slug}`);
    revalidatePath("/admin/campaigns");
    revalidatePath(`/admin/campaigns/${id}`);
    return NextResponse.json({ ok: true, status });
  }

  if (action === "feature") {
    await query("UPDATE bounties SET is_featured=$2 WHERE id=$1", [id, Boolean(body.featured)]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
