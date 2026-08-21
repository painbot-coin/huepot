import type { ColorId } from "./colors";
import type { NetworkId } from "./networks";

export type RoundStatus = "live" | "revealing";
export type TxType = "deposit" | "withdraw" | "click" | "payout" | "refund";
export type NoticeKind =
  | "welcome"
  | "verify"
  | "verified"
  | "deposit"
  | "withdraw"
  | "payout"
  | "refund"
  | "system";
export type RoomKind = "basic" | "custom";
export type RoomEventKind = "chat" | "system" | "payout" | "refund" | "round" | "join";

export type PlayerClicks = Record<ColorId, number>;

export type RoundResult = {
  roundId: string;
  kind: "take" | "push" | "empty";
  winners: ColorId[];
  totals: Record<ColorId, number>;
  losingPot: number;
  winningClicks: number;
  payoutPerWinningClick: number;
  payouts: { playerId: string; amount: number; winningClicks: number }[];
};

export type Round = {
  id: string;
  number: number;
  status: RoundStatus;
  startedAt: number;
  endsAt: number;
  revealUntil: number | null;
  clickPrice: number;
  buttonIds: ColorId[];
  totals: Record<ColorId, number>;
  clicks: Record<string, PlayerClicks>;
  result: RoundResult | null;
};

export type RoomEvent = {
  id: string;
  kind: RoomEventKind;
  userId: string | null;
  username: string | null;
  body: string;
  createdAt: number;
};

export type Room = {
  id: string;
  slug: string;
  name: string;
  kind: RoomKind;
  ownerId: string | null;
  buttonCount: number;
  clickPrice: number;
  roundSeconds: number;
  createdAt: number;
  liveMinutes: number | null;
  closesAt: number | null;
  roundNumber: number;
  round: Round | null;
  playerIds: string[];
  events: RoomEvent[];
};

export type StoredWallet = {
  address: string;
  secretEnc: string;
};

export type User = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  googleId: string | null;
  emailVerified: boolean;
  verifyToken: string | null;
  verifyExpires: number | null;
  verifySentAt: number | null;
  createdAt: number;
  balance: number;
  withdrawAddress: string;
  wallets: Partial<Record<NetworkId, StoredWallet>>;
};

export type Session = {
  token: string;
  userId: string;
  expiresAt: number;
};

export type OAuthState = {
  state: string;
  expiresAt: number;
};

export type Notice = {
  id: string;
  userId: string;
  kind: NoticeKind;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: number;
};

export type Tx = {
  id: string;
  playerId: string;
  type: TxType;
  amount: number;
  createdAt: number;
  note: string;
};

export type StoreData = {
  users: Record<string, User>;
  sessions: Record<string, Session>;
  oauthStates: Record<string, OAuthState>;
  notifications: Notice[];
  rooms: Record<string, Room>;
  round: Round | null;
  roundNumber: number;
  txs: Tx[];
};

export type PublicWallet = {
  id: NetworkId;
  name: string;
  standard: string;
  asset: string;
  family: string;
  hint: string;
  address: string;
};

export type PublicUser = {
  id: string;
  email: string;
  username: string;
  shortId: string;
  balance: number;
  withdrawAddress: string;
  createdAt: number;
  emailVerified: boolean;
  hasGoogle: boolean;
  hasPassword: boolean;
  unreadCount: number;
  wallets: PublicWallet[];
  txs: Tx[];
};

export type PublicRound = {
  id: string;
  number: number;
  status: RoundStatus;
  startedAt: number;
  endsAt: number;
  revealUntil: number | null;
  clickPrice: number;
  buttonIds: ColorId[];
  totals: Record<ColorId, number>;
  yourClicks: PlayerClicks;
  totalClicks: number;
  pot: number;
  result: RoundResult | null;
};

export type PublicRoomCard = {
  slug: string;
  name: string;
  kind: RoomKind;
  ownerName: string | null;
  buttonCount: number;
  clickPrice: number;
  roundSeconds: number;
  status: RoundStatus;
  pot: number;
  players: number;
  roundNumber: number;
  liveMinutes: number | null;
  closesAt: number | null;
};

export type PublicSeat = {
  userId: string;
  username: string;
  you: boolean;
  balance: number;
  totalClicks: number;
  spent: number;
  clicks: Record<ColorId, number>;
  estimated: number;
};

export type PublicRoom = PublicRoomCard & {
  id: string;
};

export type GameState = {
  now: number;
  user: PublicUser | null;
  round: PublicRound;
  room: PublicRoom;
  feed: RoomEvent[];
  rooms: PublicRoomCard[];
  seats: PublicSeat[];
};

export type SearchHit = {
  rooms: PublicRoomCard[];
  users: { username: string; rooms: { slug: string; name: string }[] }[];
};

export type LobbyState = {
  now: number;
  user: PublicUser | null;
  rooms: PublicRoomCard[];
};
