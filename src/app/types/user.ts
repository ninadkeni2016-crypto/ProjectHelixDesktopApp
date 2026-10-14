export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  ts: string;
  followUpSuggestions?: string[];
  intent?: string;
  files?: Array<{ name: string; path: string; size?: string; relevance?: string | number; category?: string }>;
};

export type RecentFile = {
  name: string;
  type: string;
  size: string;
  modified: string;
  tags: string[];
  path: string;
};

export type TimelineItem = {
  date: string;
  time: string;
  type: string;
  label: string;
  iconType: string;
  color: string;
};

export type UserSettings = {
  notifications: boolean;
  aiSuggestions: boolean;
  autoBackup: boolean;
  privacyMode: boolean;
};

export type UserData = {
  chatHistory: ChatMessage[];
  recentFiles: RecentFile[];
  timelineItems: TimelineItem[];
  automationToggles: Record<number, boolean>;
  settings: UserSettings;
  searchQuery: string;
};

export type UserAccount = {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: string;
};

export type UserSession = {
  userId: string;
  email: string;
  name: string;
};
