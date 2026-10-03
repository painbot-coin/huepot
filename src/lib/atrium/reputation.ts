import type { RepEvent, Review } from "./types";

/** Standing from finished paid work and reviews. The events stay visible. */
export function reputationOf(input: {
  userId: string;
  events: RepEvent[];
  reviews: Review[];
}) {
  const provided = input.events.filter((row) => row.userId === input.userId && row.kind === "provided");
  const hired = input.events.filter((row) => row.userId === input.userId && row.kind === "hired");
  const reviews = input.reviews.filter((row) => row.aboutUserId === input.userId);
  const reviewAvg = reviews.length
    ? Math.round((reviews.reduce((sum, row) => sum + row.stars, 0) / reviews.length) * 10) / 10
    : null;
  const score = provided.length * 10 + hired.length * 2 + (reviewAvg == null ? 0 : Math.round(reviewAvg * 4));
  const paidCents = provided.reduce((sum, row) => sum + row.cents, 0);
  return {
    score,
    provided: provided.length,
    hired: hired.length,
    paidCents,
    reviewAvg,
    reviewCount: reviews.length,
  };
}
