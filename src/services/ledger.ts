import type { AccountTransferInsert, RecurringRuleInsert } from "../types/database";
import {
  localCreateRecurring,
  localCreateTransfer,
  localDeleteRecurring,
  localDeleteTransfer,
  localListRecurring,
  localListTransfers,
} from "./localFinance";

export async function listTransfers() {
  return localListTransfers();
}

export async function createTransfer(values: AccountTransferInsert) {
  return localCreateTransfer(values);
}

export async function deleteTransfer(id: string) {
  await localDeleteTransfer(id);
}

export async function listRecurring() {
  return localListRecurring();
}

export async function createRecurring(values: RecurringRuleInsert) {
  return localCreateRecurring(values);
}

export async function deleteRecurring(id: string) {
  await localDeleteRecurring(id);
}
