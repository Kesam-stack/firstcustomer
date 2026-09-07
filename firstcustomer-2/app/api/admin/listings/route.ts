import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { publishComplimentaryListing } from "@/lib/listings";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const result = await publishComplimentaryListing({
      companyName: body.companyName,
      productUrl: body.productUrl,
      creatorEmail: body.creatorEmail,
      creatorXHandle: body.creatorXHandle,
      companyDescription: body.companyDescription,
      category: body.category,
      headline: body.headline,
      desiredAction: body.desiredAction,
      referralTerms: body.referralTerms,
      rewardDollars: Number(body.rewardDollars),
      goalCount: Number(body.goalCount),
      companyLogoUrl: body.companyLogoUrl,
      slug: body.slug || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not publish" }, { status: 400 });
  }
}
