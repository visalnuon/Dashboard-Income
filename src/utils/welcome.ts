import { getLocalAuthUserId } from "../services/localAuth";

function storageKey() {
  return `visal-welcome-v1:${getLocalAuthUserId()}`;
}

export function hasDismissedWelcome() {
  try {
    return localStorage.getItem(storageKey()) === "1";
  } catch {
    return false;
  }
}

export function dismissWelcome() {
  localStorage.setItem(storageKey(), "1");
}
