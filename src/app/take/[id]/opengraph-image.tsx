import { readFile } from "fs/promises";
import path from "path";
import { ImageResponse } from "next/og";
import { COLORS } from "@/lib/colors";
import { formatUsdt } from "@/lib/money";
import { withStoreRead } from "@/lib/store";
import { getPublicTake } from "@/lib/takes";

export const runtime = "nodejs";
export const alt = "Huepot take";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Read once per process: a crawler may hit this route many times.
let fontCache: Promise<Buffer> | null = null;

function cinzel() {
  fontCache ??= readFile(
    path.join(process.cwd(), "public", "fonts", "cinzel-700.ttf"),
  );
  return fontCache;
}

function hueOf(names: string) {
  const first = names.split("&")[0]?.trim().toLowerCase() ?? "";
  return COLORS.find((color) => color.name.toLowerCase() === first)?.hex ?? "#ffd27a";
}

export default async function TakeImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const take = await withStoreRead((store) => getPublicTake(id, store));
  const font = await cinzel();

  const names = take?.names ?? "Same price. Biggest color takes.";
  const room = take?.roomName ?? "Huepot";
  const amount = take ? formatUsdt(take.amount) : "";
  const hue = hueOf(take?.names ?? "");

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          // Gradients only. A photographic plate here pushed the PNG past
          // 700kB, and a share image has to load fast.
          backgroundColor: "#08070f",
          backgroundImage: `radial-gradient(900px 620px at 78% 18%, ${hue}2e, transparent 70%), radial-gradient(700px 500px at 8% 96%, #ffd27a1a, transparent 70%)`,
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
            backgroundColor: hue,
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
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  width: 24,
                  height: 24,
                  marginRight: 18,
                  backgroundColor: hue,
                }}
              />
              <div style={{ display: "flex", fontSize: 29, letterSpacing: 7, color: "#c9c9d4" }}>
                {room.toUpperCase()}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: take ? 76 : 58,
                lineHeight: 1.12,
                marginTop: 18,
                color: hue,
              }}
            >
              {take ? `${names} took` : names}
            </div>
            {amount ? (
              <div style={{ display: "flex", fontSize: 116, lineHeight: 1, marginTop: 4 }}>
                {`${amount} USDT`}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, color: "#9a9aa8" }}>
              BIGGEST COLOR TAKES THE POT
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
