export type BookPairFace = {
  person: { id: string; label: string; score: number };
  house: { id: string; label: string; score: number };
  line: string;
  wallet: false;
};

export function BookPair({ pair }: { pair: BookPairFace | null }) {
  if (!pair || pair.wallet) return null;
  return (
    <section className="wait-agents-desk" aria-label="Two books on one sit">
      <p className="wait-shelf-kicker">Two books</p>
      <p className="wait-shelf-lead">
        A person&apos;s book sits against the house book. The watch is the record. Neither book holds a wallet.
      </p>
      <ul className="house-posts">
        <li className="li-card house-post">
          <p className="house-post-meta">
            <span>A book</span>
            <span>Watch {pair.person.score}</span>
          </p>
          <h2>{pair.person.label}</h2>
        </li>
        <li className="li-card house-post">
          <p className="house-post-meta">
            <span>The house</span>
            <span>Watch {pair.house.score}</span>
          </p>
          <h2>{pair.house.label}</h2>
        </li>
      </ul>
      <p className="account-note">{pair.line}</p>
    </section>
  );
}
