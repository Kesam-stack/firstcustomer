import { ImageResponse } from "next/og";
import { getBountyBySlug } from "@/lib/db";
import { money, remaining } from "@/lib/format";

export const alt = "FirstCustomer bounty";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const revalidate = 60;

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bounty = await getBountyBySlug(slug);
  const title = bounty?.company_name || "FirstCustomer";
  const reward = bounty ? money(bounty.reward_cents) : "";
  const headline = bounty?.headline || "Pay for customers. Not clicks.";
  const left = bounty ? remaining(bounty.goal_count, bounty.approved_count) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f4f1ea",
          color: "#11110f",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 64px 44px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, background: "#11110f", display: "flex", position: "relative" }}>
              <div style={{ position: "absolute", left: 14, top: 9, width: 17, height: 8, background: "#f4f1ea" }} />
              <div style={{ position: "absolute", left: 20, top: 9, width: 10, height: 24, background: "#f4f1ea" }} />
              <div style={{ position: "absolute", left: 12, top: 34, width: 24, height: 6, background: "#ff4f24" }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}>FirstCustomer</div>
          </div>
          <div style={{ fontSize: 20, letterSpacing: 0.4 }}>firstcustomer.xyz</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 96,
              height: 96,
              border: "2px solid #11110f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
              background: "#fffdf8",
            }}
          >
            {title.slice(0, 1)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 900 }}>
            <div style={{ fontSize: 56, lineHeight: 1, letterSpacing: -1.6, fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: 28, marginTop: 12, lineHeight: 1.25 }}>{headline}</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "2px solid #11110f",
            paddingTop: 22,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 18, letterSpacing: 1.2, textTransform: "uppercase" }}>Per customer</div>
            <div style={{ fontSize: 54, lineHeight: 1, marginTop: 4, fontWeight: 500 }}>{reward || "Live"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 22 }}>{bounty ? `${left} of ${bounty.goal_count} remaining` : "Live board"}</div>
            <div style={{ fontSize: 22, marginTop: 6 }}>Rank is funded demand</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
