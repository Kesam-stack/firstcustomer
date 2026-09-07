import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#11110f",
          display: "flex",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", left: 51, top: 34, width: 62, height: 28, background: "#f4f1ea" }} />
        <div style={{ position: "absolute", left: 73, top: 34, width: 39, height: 90, background: "#f4f1ea" }} />
        <div style={{ position: "absolute", left: 45, top: 129, width: 90, height: 23, background: "#ff4f24" }} />
      </div>
    ),
    size,
  );
}
