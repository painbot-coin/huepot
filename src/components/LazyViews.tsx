"use client";

import dynamic from "next/dynamic";
import { PitLoader } from "@/components/PitLoader";

export const LazySigninForm = dynamic(
  () => import("@/components/SigninForm").then((mod) => mod.SigninForm),
  { loading: () => <PitLoader label="Opening sign in…" /> },
);

export const LazyAccountClient = dynamic(
  () => import("@/components/AccountClient").then((mod) => mod.AccountClient),
  { loading: () => <PitLoader label="Opening account…" /> },
);

export const LazyInvestClient = dynamic(
  () => import("@/components/InvestClient").then((mod) => mod.InvestClient),
  { loading: () => <PitLoader label="Opening add USDT…" /> },
);

export const LazyWithdrawClient = dynamic(
  () => import("@/components/WithdrawClient").then((mod) => mod.WithdrawClient),
  { loading: () => <PitLoader label="Opening withdraw…" /> },
);

export const LazyFairnessClient = dynamic(
  () => import("@/components/FairnessClient").then((mod) => mod.FairnessClient),
  { loading: () => <PitLoader label="Opening fairness…" /> },
);

export const LazyFairnessDetail = dynamic(
  () => import("@/components/FairnessDetail").then((mod) => mod.FairnessDetail),
  { loading: () => <PitLoader label="Opening the sheet…" /> },
);

export const LazyNotificationsClient = dynamic(
  () =>
    import("@/components/NotificationsClient").then((mod) => mod.NotificationsClient),
  { loading: () => <PitLoader label="Opening notices…" /> },
);

export const LazyStaffConsole = dynamic(
  () => import("@/components/StaffConsole").then((mod) => mod.StaffConsole),
  { loading: () => <PitLoader label="Opening staff…" /> },
);

export const LazyNetworkFeed = dynamic(
  () => import("@/components/NetworkFeed").then((mod) => mod.NetworkFeed),
  { loading: () => <PitLoader label="Opening the feed…" /> },
);

export const LazyNetworkClient = dynamic(
  () => import("@/components/NetworkClient").then((mod) => mod.NetworkClient),
  { loading: () => <PitLoader label="Opening the pit…" /> },
);

export const LazyNetworkMessages = dynamic(
  () => import("@/components/NetworkMessages").then((mod) => mod.NetworkMessages),
  { loading: () => <PitLoader label="Opening messages…" /> },
);

export const LazyNetworkProfile = dynamic(
  () => import("@/components/NetworkProfile").then((mod) => mod.NetworkProfile),
  { loading: () => <PitLoader label="Opening profile…" /> },
);

export const LazyCreateRoomForm = dynamic(
  () => import("@/components/CreateRoomForm").then((mod) => mod.CreateRoomForm),
  { loading: () => <PitLoader label="Opening create…" /> },
);

