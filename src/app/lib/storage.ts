import { defaultUserData } from "../data/defaults";
import type { UserAccount, UserData, UserSession } from "../types/user";

const SESSION_KEY = "helix_session";
const USERS_KEY = "helix_users";
const USER_DATA_PREFIX = "helix_user_data_";

export function loadSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as UserSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: UserSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function loadUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as UserAccount[]) : [];
  } catch {
    return [];
  }
}

export function saveUsers(users: UserAccount[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function loadUserData(userId: string): UserData {
  try {
    const raw = localStorage.getItem(`${USER_DATA_PREFIX}${userId}`);
    if (!raw) return defaultUserData();
    return { ...defaultUserData(), ...JSON.parse(raw) } as UserData;
  } catch {
    return defaultUserData();
  }
}

export function saveUserData(userId: string, data: UserData): void {
  localStorage.setItem(`${USER_DATA_PREFIX}${userId}`, JSON.stringify(data));
}

export function createUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
