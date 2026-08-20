export default function HowItWorksPage() {
  return (
    <main className="prose-page">
      <h1 className="font-display text-4xl text-white">How it works</h1>
      <p>
        Huepot is a timed color pot. Four buttons, one price. Clicking a color
        spends 1 USDT from your play balance.
      </p>
      <ol>
        <li>Create an account with email or Google. Email signups need a verification link before you can invest or click.</li>
        <li>
          Invest by sending crypto to your address on ETH (ERC-20), BNB Chain
          (BEP-20), Tron (TRC-20), Polygon, Arbitrum, Solana, or Bitcoin.
        </li>
        <li>During a 60-second round, click any color as many times as you want.</li>
        <li>
          When time is up, the color with the most clicks wins. Those clickers
          split the money from the other colors, by click. Winning clicks also
          come back.
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
