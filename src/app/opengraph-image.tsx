import { readFile } from "fs/promises";
import path from "path";
import { ImageResponse } from "next/og";
import { COLORS } from "@/lib/colors";

export const runtime = "nodejs";
export const alt = "Huepot — same price, biggest color takes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

let fontCache: Promise<Buffer> | null = null;

function cinzel() {
  fontCache ??= readFile(
    path.join(process.cwd(), "public", "fonts", "cinzel-700.ttf"),
  );
  return fontCache;
}

export default async function HouseImage() {
  const font = await cinzel();
  const hues = COLORS.slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#08070f",
          // Gradients only, so the PNG stays light.
          backgroundImage:
            "radial-gradient(900px 620px at 80% 14%, #ffd27a24, transparent 70%), radial-gradient(760px 540px at 6% 98%, #8b5cff1f, transparent 70%)",
          color: "#f6f3ec",
          fontFamily: "Cinzel",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 16,
            height: 630,
            display: "flex",
            backgroundColor: "#ffd27a",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "64px 76px 58px 98px",
          }}
        >
          <div style={{ display: "flex", fontSize: 27, letterSpacing: 12, color: "#ffd27a" }}>
            HUEPOT
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 68, lineHeight: 1.14 }}>
              Same price. Biggest color takes.
            </div>
            <div style={{ display: "flex", fontSize: 30, marginTop: 22, color: "#c9c9d4" }}>
              A timed color-pot house. Every coin costs the same.
            </div>
            <div style={{ display: "flex", marginTop: 30 }}>
              {hues.map((color) => (
                <div
                  key={color.id}
                  style={{
                    display: "flex",
                    width: 52,
                    height: 52,
                    marginRight: 16,
                    borderRadius: 26,
                    backgroundColor: color.hex,
                  }}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div style={{ display: "flex", fontSize: 25, letterSpacing: 4, color: "#9a9aa8" }}>
              CLICK A COLOR · 18+
            </div>
            <div style={{ display: "flex", fontSize: 31, letterSpacing: 3, color: "#ffd27a" }}>
              HUEPOT.NET
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Cinzel", data: font, weight: 700, style: "normal" }],
    },
  );
}
