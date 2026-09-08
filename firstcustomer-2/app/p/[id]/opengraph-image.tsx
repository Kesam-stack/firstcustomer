import { ImageResponse } from "next/og";
import { getPayoutReceipt } from "@/lib/db";
import { money } from "@/lib/format";

export const alt = "Verified FirstCustomer payout receipt";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const revalidate = 60;

export default async function OpenGraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let receipt = null;
  try { receipt = await getPayoutReceipt(id); } catch {}

  const amount = receipt ? money(receipt.reward_cents) : "Verified payout";
  const referrer = receipt ? `@${receipt.x_handle}` : "FirstCustomer";
  const company = receipt?.company_name || "Verified settlement";

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
            <div style={{ fontSize: 24, fontWeight: 700 }}>FirstCustomer</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, textTransform: "uppercase", letterSpacing: 1 }}>
            <div style={{ width: 10, height: 10, borderRadius: 10, background: "#198754" }} />
            Verified payout
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, textTransform: "uppercase", letterSpacing: 1.3 }}>Reward paid</div>
          <div style={{ fontSize: 118, lineHeight: 0.95, letterSpacing: -6, fontWeight: 500, marginTop: 8 }}>{amount}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24, fontSize: 30 }}>
            <span>{referrer}</span>
            <span style={{ color: "#77746d" }}>→</span>
            <span>{company}</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "2px solid #11110f",
            paddingTop: 20,
            fontSize: 19,
          }}
        >
          <div>Stripe-settled proof</div>
          <div>firstcustomer.xyz</div>
        </div>
      </div>
    ),
    size,
  );
}
