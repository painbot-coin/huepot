/** NETWORK: company should land in the pit, not a friends list. */
export const COMPANY_CLASSIC_HREF = "/rooms/classic";

export function sitClassicLabel() {
  return "Play Classic";
}

export function sitWithThemLabel() {
  return "Play with them";
}

export function companyAskTitle() {
  return "Connection request";
}

export function companyAskBody(username: string) {
  return `@${username} sent you a connection request.`;
}

export function companyAskHref() {
  return "/network/people?tab=requests";
}

export function companyFormedTitle() {
  return "Connected";
}

export function companyFormedBody(username: string) {
  return `@${username} is connected. Play Classic.`;
}

export function companyFormedHref() {
  return COMPANY_CLASSIC_HREF;
}
