export default function PrivacyPage() {
  return (
    <main className="prose-page">
      <h1 className="font-display text-4xl text-white">Privacy</h1>
      <p>
        We store your email, username, password hash or Google account id, play
        balance, deposit addresses, and in-app notifications. Wallet private keys
        are encrypted on the server and are never shown in the browser.
      </p>
      <p>
        A session cookie keeps you signed in. We do not sell account data. Logs
        of clicks, deposits, and withdrawals stay with the game so rounds can
        be settled.
      </p>
      <p>
        To close an account, contact support from the email you signed up with.
        Demo builds keep data in a local file on the server.
      </p>
    </main>
  );
}
