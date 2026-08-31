import type { ColorId } from "./colors";
import type { NetworkId } from "./networks";

export type RoundStatus = "live" | "revealing";
export type TxType =
  | "deposit"
  | "withdraw"
  | "click"
  | "payout"
  | "refund"
  | "adjust"
  | "rake"
  | "invite";
export type NoticeKind =
  | "welcome"
  | "verify"
  | "verified"
  | "deposit"
  | "withdraw"
  | "payout"
  | "refund"
  | "system"
  | "friend"
  | "message"
  | "post";
export type FriendStatus = "pending" | "accepted" | "declined";
export type FriendRelation = "none" | "outgoing" | "incoming" | "friends";
export type NetworkTab = "pit" | "friends" | "requests";
export type RoomKind = "basic" | "custom";
export type RoomEventKind = "chat" | "system" | "payout" | "refund" | "round" | "join";

export type PlayerClicks = Record<ColorId, number>;

export type RoundResult = {
  roundId: string;
  kind: "take" | "push" | "empty" | "void";
  winners: ColorId[];
  totals: Record<ColorId, number>;
  /** Integer cents in store; USDT on public round copies. */
  losingPot: number;
  winningClicks: number;
  payoutPerWinningClick: number;
  rake: number;
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
  seedCommit: string;
  serverSeed: string;
  fairHash: string;
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
  fogSeconds: number | null;
  createdAt: number;
  liveMinutes: number | null;
  closesAt: number | null;
  roundNumber: number;
  round: Round | null;
  playerIds: string[];
  events: RoomEvent[];
  mutedIds: string[];
  paused: boolean;
  pausedAt: number | null;
  slowMode: boolean;
};

export type StoredWallet = {
  address: string;
  secretEnc: string;
};

export type PlayLimits = {
  frozen: boolean;
  freezeNote: string;
  dailyLossCap: number;
  coolOffUntil: number;
  selfExcludeUntil: number;
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
  limits: PlayLimits;
  ageConfirmedAt: number | null;
  resetToken: string | null;
  resetExpires: number | null;
  resetSentAt: number | null;
  inviteCode: string;
  invitedBy: string | null;
  headline: string;
  about: string;
  location: string;
};

export type Session = {
  token: string;
  userId: string;
  expiresAt: number;
  createdAt: number;
  userAgent: string;
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
  live: boolean;
};

export type WithdrawalStatus = "queued" | "sending" | "paid" | "rejected";

export type Withdrawal = {
  id: string;
  userId: string;
  username?: string;
  networkId: NetworkId;
  address: string;
  amount: number;
  status: WithdrawalStatus;
  createdAt: number;
  resolvedAt: number | null;
  note: string;
  txHash: string;
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
  frozen: boolean;
  blocked: boolean;
  blockKind: "frozen" | "cool-off" | "self-exclude" | "age" | null;
  blockUntil: number | null;
  blockMessage: string;
  dailyLossCap: number;
  playLossToday: number;
  ageConfirmed: boolean;
  inviteCode: string;
  inviteEarned: number;
  inviteEarnedToday: number;
  inviteDailyLeft: number;
};

export type PublicSession = {
  hint: string;
  createdAt: number;
  expiresAt: number;
  current: boolean;
  userAgent: string;
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
  seedCommit: string;
  serverSeed: string | null;
  fairHash: string | null;
  rakeBps: number;
  fog: boolean;
};

export type PublicRoomCard = {
  slug: string;
  name: string;
  kind: RoomKind;
  ownerName: string | null;
  buttonCount: number;
  clickPrice: number;
  roundSeconds: number;
  fogSeconds: number | null;
  status: RoundStatus;
  pot: number;
  players: number;
  roundNumber: number;
  liveMinutes: number | null;
  closesAt: number | null;
  paused: boolean;
  sitting: string[];
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
  host: boolean;
  muted: boolean;
  slowMode: boolean;
};

export type ClassicHour = {
  hour: number;
  startAt: number;
  endsAt: number;
  live: boolean;
};

export type GameState = {
  now: number;
  user: PublicUser | null;
  round: PublicRound;
  room: PublicRoom;
  feed: RoomEvent[];
  rooms: PublicRoomCard[];
  seats: PublicSeat[];
  classicHour: ClassicHour;
};

export type SearchHit = {
  rooms: PublicRoomCard[];
  users: { username: string; rooms: { slug: string; name: string }[] }[];
};

export type LobbyState = {
  now: number;
  user: PublicUser | null;
  rooms: PublicRoomCard[];
  classicHour: ClassicHour;
};

export type Friendship = {
  id: string;
  lowId: string;
  highId: string;
  fromId: string;
  status: FriendStatus;
  createdAt: number;
  resolvedAt: number | null;
};

export type NetworkCard = {
  username: string;
  headline: string;
  createdAt: number;
  online: boolean;
  lastSeen: number | null;
  room: { slug: string; name: string } | null;
  relation: FriendRelation;
  friends: number;
};

export type NetworkYou = {
  username: string;
  headline: string;
  pendingIn: number;
  unreadMessages: number;
  friends: number;
};

export type NetworkState = {
  now: number;
  tab: NetworkTab;
  q: string;
  pendingIn: number;
  you: NetworkYou;
  cards: NetworkCard[];
};

export type NetworkPost = {
  id: string;
  username: string;
  headline: string;
  body: string;
  createdAt: number;
  likes: number;
  liked: boolean;
  relation: FriendRelation;
  comments: { id: string; username: string; body: string; createdAt: number }[];
};

export type NetworkThread = {
  username: string;
  headline: string;
  lastBody: string;
  lastAt: number;
  unread: number;
  online: boolean;
};

export type NetworkMessage = {
  id: string;
  fromYou: boolean;
  body: string;
  createdAt: number;
};

export type NetworkProfile = {
  username: string;
  headline: string;
  about: string;
  location: string;
  createdAt: number;
  online: boolean;
  lastSeen: number | null;
  room: { slug: string; name: string } | null;
  relation: FriendRelation;
  friends: number;
  you: boolean;
};
