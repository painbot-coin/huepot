export default function TermsPage() {
  return (
    <main className="prose-page">
      <h1 className="font-display text-4xl text-white">Terms</h1>
      <p>
        Huepot is an 18+ color-pot game. By signing in with Google you confirm you
        are of legal age where you live and that online betting is allowed for
        you.
      </p>
      <p>
        Play balances are custodial. Deposit addresses are generated for your
        account. Live credit is BNB Chain USDT after confirms. Cash-out is
        sent on BNB Chain from the house wallet.
      </p>
      <p>
        Rounds are settled by click count at the server clock. On a take, the
        house keeps a published share of the losing pot (default 5%, set by
        HOUSE_RAKE_BPS). Winning clicks return, then winners split what is
        left. A full tie or a staff void refunds every click with no house
        take. We may freeze accounts that abuse the table or the money rail.
      </p>
      <p>
        You can set a daily loss cap, take a cool-off, or self-exclude from
        Account. Those pauses cannot be shortened once they start. Staff may
        freeze an account or void a live round, which refunds clicks.
      </p>
    </main>
  );
}
