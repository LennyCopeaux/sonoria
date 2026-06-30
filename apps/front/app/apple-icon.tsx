import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 14,
            height: 100,
          }}
        >
          {[
            { height: 40 },
            { height: 65 },
            { height: 100 },
            { height: 55 },
          ].map((bar) => (
            <div
              key={bar.height}
              style={{
                width: 22,
                height: bar.height,
                background: "#ef4444",
                borderRadius: 11,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
