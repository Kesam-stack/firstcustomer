import { ImageResponse } from "next/og";

export const alt = "FirstCustomer — Pay for customers. Not clicks.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          padding: "56px 64px 48px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 56, height: 56, background: "#11110f", display: "flex", position: "relative" }}>
            <div style={{ position: "absolute", left: 16, top: 10, width: 20, height: 9, background: "#f4f1ea" }} />
            <div style={{ position: "absolute", left: 23, top: 10, width: 12, height: 28, background: "#f4f1ea" }} />
            <div style={{ position: "absolute", left: 14, top: 40, width: 28, height: 7, background: "#ff4f24" }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6 }}>FirstCustomer</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, lineHeight: 0.92, letterSpacing: -2.4, fontWeight: 500 }}>Pay for customers.</div>
          <div style={{ fontSize: 76, lineHeight: 0.92, letterSpacing: -2.4, fontWeight: 500 }}>Not clicks.</div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid #11110f",
            paddingTop: 22,
            fontSize: 22,
            letterSpacing: 0.4,
          }}
        >
          <div>firstcustomer.xyz</div>
          <div>Highest funded bounty sits at #1</div>
        </div>
      </div>
    ),
    size,
  );
}
