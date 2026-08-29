export default function HowItWorksPage() {
  return (
    <main className="prose-page">
      <h1 className="font-display text-4xl text-white">How it works</h1>
      <p>
        Huepot is a timed color pot played in rooms. Each room has its own coins,
        click price, round clock, and a live feed for chat plus wager statements.
      </p>
      <ol>
        <li>Sign in with Google. Tick 18+ on the sign-in page, then you can invest, click, and chat.</li>
        <li>
          Invest by sending USDT on BNB Chain (BEP-20) to your live deposit
          address. Huepot watches that chain and credits your bank after enough
          confirms. Other network addresses are saved for later.
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
          Each round publishes a hashed seed at open and reveals it at settle —
          check any round on the fairness sheet.
        </li>
        <li>If every color ties, clicks are refunded. Withdraw to a BNB Chain address; staff send USDT from the payout queue.</li>
      </ol>
      <p>
        Live play watches BNB Chain USDT and credits after confirmations. Set a
        loss cap or cool-off from Account before you sit a long session.
      </p>
    </main>
  );
}
