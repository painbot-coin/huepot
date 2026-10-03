export type Kind = "human" | "org";

export type Claims = {
  human: boolean;
  over18: boolean;
  showName: boolean;
};

export type User = {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
  kind: Kind;
  claims: Claims;
  balance: number;
  apiKey: string;
  createdAt: number;
};

export type Agent = {
  id: string;
  ownerId: string;
  name: string;
  skills: string[];
  pitch: string;
  available: boolean;
  negotiateUnderCents: number;
  spendLimitCents: number;
  spentCents: number;
  queryCents: number;
  taskCents: number;
  reportCents: number;
  monthCents: number;
  published: boolean;
};

export type Post = {
  id: string;
  authorId: string;
  authorKind: "human" | "agent";
  body: string;
  circleId: string;
  createdAt: number;
};

export type Circle = {
  id: string;
  slug: string;
  name: string;
  brief: string;
  founderId: string;
  agentId: string;
  memberIds: string[];
};

export type LinkStatus = "pending" | "accepted";

export type LinkRow = {
  id: string;
  fromId: string;
  toId: string;
  status: LinkStatus;
};

export type TaskStatus = "offered" | "accepted" | "delivered" | "released" | "declined" | "returned";

export type Task = {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  buyerId: string;
  providerId: string;
  brief: string;
  priceCents: number;
  status: TaskStatus;
  proof: string;
  createdAt: number;
  /** When the current step started. */
  stepAt?: number;
};

export type Review = {
  id: string;
  taskId: string;
  fromUserId: string;
  aboutUserId: string;
  stars: number;
  body: string;
};

export type Share = {
  userId: string;
  bps: number;
};

export type Project = {
  id: string;
  title: string;
  brief: string;
  ownerId: string;
  shares: Share[];
  earningsCents: number;
};

export type RepKind = "provided" | "hired";

export type RepEvent = {
  id: string;
  userId: string;
  kind: RepKind;
  taskId: string;
  cents: number;
  at: number;
};

export type PactKind = "client" | "company";

export type PactStatus = "offered" | "accepted" | "delivered" | "released" | "declined" | "returned";

export type Pact = {
  id: string;
  kind: PactKind;
  companyId: string;
  fromId: string;
  toId: string;
  title: string;
  terms: string;
  priceCents: number;
  status: PactStatus;
  proof: string;
  createdAt: number;
  /** When the current step started. Older contracts fall back to createdAt. */
  stepAt?: number;
};

export type ProjectPay = {
  id: string;
  projectId: string;
  ownerId: string;
  cents: number;
  at: number;
};

export type LedgerLine = {
  id: string;
  userId: string;
  cents: number;
  reason: string;
  at: number;
};

export type Db = {
  users: User[];
  agents: Agent[];
  posts: Post[];
  circles: Circle[];
  links: LinkRow[];
  tasks: Task[];
  reviews: Review[];
  projects: Project[];
  events: RepEvent[];
  lines: LedgerLine[];
  pacts: Pact[];
};

export function emptyDb(): Db {
  return {
    users: [],
    agents: [],
    posts: [],
    circles: [],
    links: [],
    tasks: [],
    reviews: [],
    projects: [],
    events: [],
    lines: [],
    pacts: [],
  };
}
