/**
 * What the house actually says in an email.
 *
 * Plain text, no template engine and no images: these are receipts for money
 * moving, they need to survive any client, and a transactional message that
 * looks like marketing is a message that lands in spam. Each one states the
 * amount, where it went, and where to look — nothing else.
 */

import { appUrl } from "@/lib/config";
import { formatCents } from "@/lib/money";

function sign() {
  return `\n\n— Huepot\n${appUrl()}\n\nYou are getting this because money moved on your account.`;
}

export function depositCreditedMail(input: {
  username: string;
  cents: number;
  network: string;
  txHash: string;
}) {
  return {
    subject: `${formatCents(input.cents)} USDT credited`,
    text:
      `${input.username},\n\n` +
      `${formatCents(input.cents)} USDT arrived on ${input.network} and is in your bank.\n\n` +
      `Transaction: ${input.txHash}\n` +
      `Your bank: ${appUrl()}/account` +
      sign(),
  };
}

export function withdrawQueuedMail(input: {
  username: string;
  cents: number;
  network: string;
  address: string;
}) {
  return {
    subject: `${formatCents(input.cents)} USDT cash-out queued`,
    text:
      `${input.username},\n\n` +
      `${formatCents(input.cents)} USDT is queued to leave on ${input.network}.\n\n` +
      `To: ${input.address}\n\n` +
      `It is sent the same day. You will get another note when it lands, and the\n` +
      `amount is already out of your playing balance.\n\n` +
      `Queue: ${appUrl()}/withdraw` +
      sign(),
  };
}

export function withdrawPaidMail(input: {
  username: string;
  cents: number;
  network: string;
  txHash: string;
  explorer?: string;
}) {
  const link = input.explorer ? `${input.explorer}/tx/${input.txHash}` : input.txHash;
  return {
    subject: `${formatCents(input.cents)} USDT sent`,
    text:
      `${input.username},\n\n` +
      `${formatCents(input.cents)} USDT has left the house on ${input.network}.\n\n` +
      `Proof on chain: ${link}` +
      sign(),
  };
}

export function withdrawReturnedMail(input: {
  username: string;
  cents: number;
  reason?: string;
}) {
  return {
    subject: `${formatCents(input.cents)} USDT put back`,
    text:
      `${input.username},\n\n` +
      `Your cash-out did not go through, so ${formatCents(input.cents)} USDT is back in\n` +
      `your bank and available to play or withdraw again.\n` +
      (input.reason ? `\nReason given: ${input.reason}\n` : "") +
      `\nYour bank: ${appUrl()}/account` +
      sign(),
  };
}
