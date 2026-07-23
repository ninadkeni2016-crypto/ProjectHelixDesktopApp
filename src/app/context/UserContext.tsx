import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { defaultUserData } from "../data/defaults";
import {
  clearSession,
  createUserId,
  loadSession,
  loadUserData,
  loadUsers,
  saveSession,
  saveUserData,
  saveUsers,
} from "../lib/storage";
import type { UserData, UserSession, UserSettings } from "../types/user";

type UserContextValue = {
  user: UserSession | null;
  userData: UserData;
  isReady: boolean;
  needsLogin: boolean;
  login: (email: string, password: string) => string | null;
  register: (name: string, email: string, password: string) => string | null;
  logout: () => void;
  updateUserData: (patch: Partial<UserData>) => void;
  updateSettings: (patch: Partial<UserSettings>) => void;
  updateProfileName: (name: string) => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [userData, setUserData] = useState<UserData>(defaultUserData());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setUser(session);
      setUserData(loadUserData(session.userId));
    }
    setIsReady(true);
  }, []);

  const persistUserData = useCallback(
    (userId: string, data: UserData) => {
      saveUserData(userId, data);
      setUserData(data);
    },
    []
  );

  const updateUserData = useCallback(
    (patch: Partial<UserData>) => {
      if (!user) return;
      setUserData((prev) => {
        const next = { ...prev, ...patch };
        saveUserData(user.userId, next);
        return next;
      });
    },
    [user]
  );

  const updateSettings = useCallback(
    (patch: Partial<UserSettings>) => {
      if (!user) return;
      setUserData((prev) => {
        const next = { ...prev, settings: { ...prev.settings, ...patch } };
        saveUserData(user.userId, next);
        return next;
      });
    },
    [user]
  );

  const updateProfileName = useCallback(
    (name: string) => {
      if (!user) return;
      const trimmed = name.trim();
      if (!trimmed) return;

      const users = loadUsers();
      const idx = users.findIndex((u) => u.id === user.userId);
      if (idx >= 0) {
        users[idx] = { ...users[idx], name: trimmed };
        saveUsers(users);
      }

      const session = { ...user, name: trimmed };
      saveSession(session);
      setUser(session);
    },
    [user]
  );

  const completeAuth = useCallback((session: UserSession) => {
    const data = loadUserData(session.userId);
    saveSession(session);
    saveUserData(session.userId, data);
    setUser(session);
    setUserData(data);
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) return "Email and password are required.";

      const account = loadUsers().find(
        (u) => u.email === normalizedEmail && u.password === password
      );
      if (!account) return "Invalid email or password.";

      completeAuth({
        userId: account.id,
        email: account.email,
        name: account.name,
      });
      return null;
    },
    [completeAuth]
  );

  const register = useCallback(
    (name: string, email: string, password: string) => {
      const trimmedName = name.trim();
      const normalizedEmail = email.trim().toLowerCase();
      if (!trimmedName || !normalizedEmail || !password) {
        return "All fields are required.";
      }
      if (password.length < 6) return "Password must be at least 6 characters.";

      const users = loadUsers();
      if (users.some((u) => u.email === normalizedEmail)) {
        return "An account with this email already exists.";
      }

      const account = {
        id: createUserId(),
        email: normalizedEmail,
        password,
        name: trimmedName,
        createdAt: new Date().toISOString(),
      };
      users.push(account);
      saveUsers(users);

      const initialData = defaultUserData();
      saveUserData(account.id, initialData);
      completeAuth({
        userId: account.id,
        email: account.email,
        name: account.name,
      });
      return null;
    },
    [completeAuth]
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setUserData(defaultUserData());
  }, []);

  const value = useMemo(
    () => ({
      user,
      userData,
      isReady,
      needsLogin: isReady && !user,
      login,
      register,
      logout,
      updateUserData,
      updateSettings,
      updateProfileName,
    }),
    [
      user,
      userData,
      isReady,
      login,
      register,
      logout,
      updateUserData,
      updateSettings,
      updateProfileName,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
