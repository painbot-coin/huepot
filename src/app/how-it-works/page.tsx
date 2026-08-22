export default function HowItWorksPage() {
  return (
    <main className="prose-page">
      <h1 className="font-display text-4xl text-white">How it works</h1>
      <p>
        Huepot is a timed color pot played in rooms. Each room has its own coins,
        click price, round clock, and a live feed for chat plus wager statements.
      </p>
      <ol>
        <li>Create an account with email or Google. Email signups need a verification link before you can invest, click, or chat.</li>
        <li>
          Invest by sending crypto to your address on ETH (ERC-20), BNB Chain
          (BEP-20), Tron (TRC-20), Polygon, Arbitrum, Solana, or Bitcoin.
        </li>
        <li>
          Join a basic room for free — Classic, Lightning, Duo, High Table, or
          Fog Pit — or create a custom room with 2–8 coins, click price, round
          length, and a live timer. Fog Pit (and custom tables with fog on) hide
          public click counts in the last 12 seconds. When that live time ends,
          the custom table is deleted. No create fee.
        </li>
        <li>During a live round, click any coin. Each click spends that room’s price from your play balance.</li>
        <li>
          When time is up, the color with the most clicks wins. Those clickers
          split the money from the other colors, by click. Winning clicks also
          come back. The room feed posts earnings, refunds, and table talk.
        </li>
        <li>If every color ties, clicks are refunded. Withdraw whenever you like.</li>
      </ol>
      <p>
        Demo deposits credit instantly so you can play without waiting on a
        blockchain confirmation. Live chain watching can be wired to the same
        addresses later.
      </p>
    </main>
  );
}
