/** NETWORK: company should land in the pit, not a friends list. */
export const COMPANY_CLASSIC_HREF = "/rooms/classic";

export function sitClassicLabel() {
  return "Sit Classic";
}

export function sitWithThemLabel() {
  return "Sit with them";
}

export function companyAskTitle() {
  return "Company ask";
}

export function companyAskBody(username: string) {
  return `@${username} wants you in company.`;
}

export function companyAskHref() {
  return "/network/people?tab=requests";
}

export function companyFormedTitle() {
  return "Company";
}

export function companyFormedBody(username: string) {
  return `@${username} is company. Sit Classic.`;
}

export function companyFormedHref() {
  return COMPANY_CLASSIC_HREF;
}
