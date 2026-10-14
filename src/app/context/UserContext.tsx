import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api from "../lib/api";
import type { UserData, UserSession, UserSettings, ChatMessage } from "../types/user";

type UserContextValue = {
  user: UserSession | null;
  userData: UserData;
  isReady: boolean;
  needsLogin: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  continueAsGuest: () => Promise<void>;
  logout: () => void;
  updateUserData: (patch: Partial<UserData>) => void;
  updateSettings: (patch: Partial<UserSettings>) => void;
  updateProfileName: (name: string) => Promise<string | null>;
  refreshUserData: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

const defaultSettings = (): UserSettings => ({
  notifications: true,
  aiSuggestions: true,
  autoBackup: true,
  privacyMode: false,
});

const defaultUserData = (): UserData => ({
  chatHistory: [],
  recentFiles: [],
  timelineItems: [],
  automationToggles: {},
  settings: defaultSettings(),
  searchQuery: "",
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [userData, setUserData] = useState<UserData>(defaultUserData());
  const [isReady, setIsReady] = useState(false);

  // Load and refresh all user data from backend
  const refreshUserData = useCallback(async () => {
    const token = localStorage.getItem("helix_token");
    if (!token) return;

    try {
      // 1. Fetch user settings
      const settingsRes = await api.get("/settings");
      const settings: UserSettings = settingsRes.data;

      // 2. Fetch automations
      const automationsRes = await api.get("/automations");
      const automations = automationsRes.data;
      const automationToggles: Record<number, boolean> = {};
      automations.forEach((auto: any, idx: number) => {
        // Map rule ids dynamically (fallbacks from 1 to N)
        automationToggles[auto.id || idx + 1] = auto.enabled;
      });

      // 3. Fetch dashboard (files & activities)
      const dashRes = await api.get("/dashboard");
      const { recentFiles, recentActivities } = dashRes.data;

      // 4. Map files
      const mappedFiles = recentFiles.map((f: any) => ({
        name: f.name,
        type: f.extension,
        size: f.size,
        modified: new Date(f.modifiedDate).toLocaleDateString() || "Today",
        tags: f.tags,
        path: f.path,
        favorite: f.favorite,
        _id: f._id,
      }));

      // 5. Fetch full user activities
      let allActivities = recentActivities || [];
      try {
        const actRes = await api.get("/activities");
        if (Array.isArray(actRes.data) && actRes.data.length > 0) {
          allActivities = actRes.data;
        }
      } catch (e) {
        // Fall back to recentActivities from dashboard
      }

      const mappedActivities = allActivities.map((act: any) => ({
        date: act.date || new Date().toISOString().split("T")[0],
        time: act.time || "Just now",
        type: act.type || "project",
        label: act.label || act.title || "User activity",
        iconType: act.iconType || "FileText",
        color: act.color || "text-blue-400",
        status: act.status || "completed",
        _id: act._id,
      }));

      // Load chat history from backend MongoDB first, fall back to localStorage
      let chatHistory: ChatMessage[] = [];
      try {
        const convRes = await api.get("/ai/conversations");
        if (convRes.data && Array.isArray(convRes.data.data) && convRes.data.data.length > 0) {
          const latestConvId = convRes.data.data[0]._id;
          const msgRes = await api.get(`/ai/conversations/${latestConvId}`);
          if (msgRes.data && msgRes.data.data && Array.isArray(msgRes.data.data.messages)) {
            chatHistory = msgRes.data.data.messages.map((m: any) => ({
              role: m.role,
              text: m.text || m.content,
              ts: m.ts || (m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Earlier"),
              followUpSuggestions: m.followUpSuggestions || m.metadata?.followUpSuggestions,
              intent: m.intent || m.metadata?.intent,
            }));
          }
        }
      } catch (convErr) {
        console.warn("Could not retrieve conversations from backend, using cache:", convErr);
      }

      if (chatHistory.length === 0) {
        const cachedChat = localStorage.getItem(`helix_chat_${user?.userId || ""}`);
        if (cachedChat) {
          try {
            chatHistory = JSON.parse(cachedChat);
          } catch (e) {
            console.error("Failed to parse cached chat history", e);
          }
        }
      }

      setUserData({
        chatHistory,
        recentFiles: mappedFiles,
        timelineItems: mappedActivities,
        automationToggles,
        settings,
        searchQuery: "",
      });
    } catch (error) {
      console.error("Error refreshing user details from backend:", error);
    }
  }, [user]);

  // Boot validation
  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem("helix_token");
      const sessionStr = localStorage.getItem("helix_session");

      if (token && sessionStr) {
        try {
          // Verify token against backend
          const res = await api.get("/auth/me");
          const session = JSON.parse(sessionStr) as UserSession;
          if (res.data && res.data.data) {
            session.userId = res.data.data._id || session.userId;
            session.name = res.data.data.name || session.name;
            session.email = res.data.data.email || session.email;
          }
          setUser(session);
        } catch (err) {
          console.error("Session verification failed, logging out", err);
          localStorage.removeItem("helix_token");
          localStorage.removeItem("helix_session");
        }
      }
      setIsReady(true);
    }
    initAuth();
  }, []);

  // Fetch full data once user is logged in
  useEffect(() => {
    if (user) {
      refreshUserData();
    }
  }, [user, refreshUserData]);

  const updateUserData = useCallback(
    (patch: Partial<UserData>) => {
      setUserData((prev) => {
        const next = { ...prev, ...patch };
        // If chatHistory is updated, persist it locally per user
        if (patch.chatHistory && user) {
          localStorage.setItem(`helix_chat_${user.userId}`, JSON.stringify(patch.chatHistory));
        }
        return next;
      });
    },
    [user]
  );

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      if (!user) return;
      
      // Optimistic update
      setUserData((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      }));

      try {
        // Sync to backend Settings
        await api.put("/settings", patch);
      } catch (error) {
        console.error("Failed to sync settings to server:", error);
      }
    },
    [user]
  );

  const updateProfileName = useCallback(
    async (name: string) => {
      if (!user) return "Not logged in";
      const trimmed = name.trim();
      if (!trimmed) return "Name cannot be empty";

      try {
        const res = await api.put("/settings/profile", { name: trimmed });
        const updatedUser = res.data;

        const session = { ...user, name: updatedUser.name };
        localStorage.setItem("helix_session", JSON.stringify(session));
        setUser(session);
        return null;
      } catch (error: any) {
        console.error("Failed to update profile name:", error);
        return error.response?.data?.message || "Failed to update profile name";
      }
    },
    [user]
  );

  const continueAsGuest = useCallback(async () => {
    try {
      const res = await api.post("/auth/guest");
      const token = res.data.data?.accessToken;
      const userObj = res.data.data;
      if (!token) {
        throw new Error("Guest token was not returned by the server");
      }
      const session: UserSession = {
        userId: userObj?._id || "guest_user",
        name: userObj?.name || "Helix Guest",
        email: userObj?.email || "guest@helix.local",
      };
      localStorage.setItem("helix_token", token);
      localStorage.setItem("helix_session", JSON.stringify(session));
      setUser(session);
    } catch (e: any) {
      console.error("Guest login failed:", e);
      // Do not store a fake token — propagate the error to the UI
      throw e;
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await api.post("/auth/login", { email, password });
        const token = res.data.token || res.data.data?.accessToken || "dev-token";
        const _id = res.data._id || res.data.data?._id || "user_id";
        const name = res.data.name || res.data.data?.name || email.split("@")[0];
        const userEmail = res.data.email || res.data.data?.email || email;

        localStorage.setItem("helix_token", token);
        const session: UserSession = { userId: _id, name, email: userEmail };
        localStorage.setItem("helix_session", JSON.stringify(session));
        
        setUser(session);
        return null;
      } catch (error: any) {
        console.error("Login failure: ", error);
        return error.response?.data?.message || "Login failed. You can also click 'Continue as Guest' below.";
      }
    },
    []
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const res = await api.post("/auth/register", { name, email, password });
        const token = res.data.token || res.data.data?.accessToken || "dev-token";
        const _id = res.data._id || res.data.data?._id || "user_id";
        const userName = res.data.name || res.data.data?.name || name;
        const userEmail = res.data.email || res.data.data?.email || email;

        localStorage.setItem("helix_token", token);
        const session: UserSession = { userId: _id, name: userName, email: userEmail };
        localStorage.setItem("helix_session", JSON.stringify(session));

        setUser(session);
        return null;
      } catch (error: any) {
        console.error("Registration failure: ", error);
        return error.response?.data?.message || "Registration failed. You can also click 'Continue as Guest' below.";
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem("helix_token");
    localStorage.removeItem("helix_session");
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
      continueAsGuest,
      logout,
      updateUserData,
      updateSettings,
      updateProfileName,
      refreshUserData,
    }),
    [
      user,
      userData,
      isReady,
      login,
      register,
      continueAsGuest,
      logout,
      updateUserData,
      updateSettings,
      updateProfileName,
      refreshUserData,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
