import Link from "next/link";
import { HouseFloor } from "@/components/HouseFloor";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <HouseFloor kicker="Huepot">
    <main className="prose-page is-in-floor">
      <p className="hall-kicker">Huepot</p>
      <h1 className="font-display text-4xl text-white">Page not found</h1>
      <p>
        Whatever you were looking for has either moved or never stood on this
        spot. Nothing is wrong with Huepot.
      </p>
      <p>
        <Link href="/">Back home</Link>, or read{" "}
        <Link href="/how-it-works">how Huepot works</Link>.
      </p>
    </main>
    </HouseFloor>
  );
}
