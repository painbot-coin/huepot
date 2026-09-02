export default function HowItWorksPage() {
  return (
    <main className="prose-page">
      <h1 className="font-display text-4xl text-white">How it works</h1>
      <p>
        Huepot is a timed color pot played in rooms. Each room has its own coins,
        click price, round clock, and a live feed for takes and table talk.
      </p>
      <ol>
        <li>Sign in with Google. Tick 18+ on the sign-in page, then you can add USDT, click, and chat.</li>
        <li>
          Add at least 10 USDT on BNB Chain (BEP-20) only. Huepot watches
          that chain and credits your bank after enough confirms. Send on any
          other network and the money is gone. You get one BNB Chain address.
        </li>
        <li>
          Join a basic room for free — Classic, Lightning, Duo, High Table, or
          Fog Pit — or create a custom room with 2–8 coins, click price, round
          length, and a live timer. Classic hour is 20:00 UTC. Fog cup is
          Sunday 21:00 UTC. When those windows open, recent sitters get a
          notice, even if the lobby is empty. Fog Pit (and custom tables with
          fog on) hide public
          click counts in the last 12
          seconds. When that live time ends, the custom table is deleted. No
          create fee.
        </li>
        <li>During a live round, click any coin. Each click spends that room’s price from your play balance.</li>
        <li>
          When time is up, the color with the most clicks wins. Those clickers
          split the money from the other colors, by click. Winning clicks also
          come back. The room feed posts earnings, refunds, and table talk.
          Each round publishes a hashed seed at open and reveals it at settle —
          check any round on the fairness sheet. Recent takes show on the lobby.
          Share a take to sit the next round — the line names Fog cup.
        </li>
        <li>
          If every color ties, clicks are refunded. Withdraw to a BNB Chain
          address; Huepot sends USDT from the house wallet. If the house is
          short, the cash-out stays queued and retries. Paid sends show on the
          lobby with a BscScan link. Share your Account
          invite link: a new Google player from that link can earn you a slice
          of house rake only, capped per day. Copy invite from Account or the
          lobby — both name Classic hour and Fog cup.
        </li>
      </ol>
      <p>
        Live play watches BNB Chain USDT and credits after confirmations. Set a
        loss cap or cool-off from Account before you sit a long session.
      </p>
    </main>
  );
}
