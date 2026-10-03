export type HouseYou = {
  username: string;
  avatar?: string;
  seat?: string;
  headline?: string;
  manager?: boolean;
  reviewer?: boolean;
};

export function floorYou(
  user?: {
    username?: string;
    avatar?: string;
    seat?: string;
    headline?: string;
    manager?: boolean;
    reviewer?: boolean;
  } | null,
): HouseYou | null {
  if (!user?.username) return null;
  return {
    username: user.username,
    avatar: user.avatar,
    seat: user.seat,
    headline: user.headline,
    manager: Boolean(user.manager),
    reviewer: Boolean(user.reviewer),
  };
}
