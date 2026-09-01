import { ImageResponse } from "next/og";
import { formatUsdt } from "@/lib/money";
import { withStoreRead } from "@/lib/store";
import { getPublicTake } from "@/lib/takes";

export const runtime = "nodejs";
export const alt = "Huepot take";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TakeImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const take = await withStoreRead((store) => getPublicTake(id, store));
  const names = take?.names ?? "Huepot";
  const room = take?.roomName ?? "Classic Pit";
  const amount = take ? `${formatUsdt(take.amount)} USDT` : "Sit the next round";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(180deg, #201c2a 0%, #121018 100%)",
          color: "#f3efe6",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 8, color: "#ffd27a" }}>
          HUEPOT
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, color: "#c9c9d4" }}>{room}</div>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, marginTop: 12 }}>
            {names} took
          </div>
          <div style={{ fontSize: 64, color: "#ffd27a", marginTop: 8 }}>{amount}</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#d8d8e2" }}>
          Same price every coin. Sit the next round.
        </div>
      </div>
    ),
    size,
  );
}
