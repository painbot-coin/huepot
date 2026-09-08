import Link from "next/link";

export const metadata = { title: "No door here" };

export default function NotFound() {
  return (
    <main className="prose-page">
      <p className="hall-kicker">The house</p>
      <h1 className="font-display text-4xl text-white">There is no door here</h1>
      <p>
        Whatever you were looking for has either moved or never stood on this
        spot. Nothing is wrong with the house.
      </p>
      <p>
        <Link href="/">Back to the hall</Link>, or read{" "}
        <Link href="/how-it-works">how the pits work</Link>.
      </p>
    </main>
  );
}
