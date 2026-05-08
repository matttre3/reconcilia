import { nanoid } from "nanoid";

export function newTransactionId(): string {
  return `tx_${nanoid(8)}`;
}

export function newMatchId(): string {
  return `match_${nanoid(8)}`;
}
