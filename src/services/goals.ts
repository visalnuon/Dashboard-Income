import type { SavingsGoalInsert, SavingsGoalUpdate } from "../types/database";
import {
  localCreateGoal,
  localDeleteGoal,
  localListGoals,
  localUpdateGoal,
} from "./localFinance";

export async function listGoals() {
  return localListGoals();
}

export async function createGoal(values: SavingsGoalInsert) {
  return localCreateGoal(values);
}

export async function updateGoal(id: string, values: SavingsGoalUpdate) {
  return localUpdateGoal(id, values);
}

export async function deleteGoal(id: string) {
  await localDeleteGoal(id);
}
