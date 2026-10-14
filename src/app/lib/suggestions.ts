export type Page =
  | "dashboard" | "assistant" | "files" | "search" | "timeline"
  | "automation" | "monitor" | "duplicates" | "backup" | "security"
  | "analytics" | "settings";

export const PAGE_SUGGESTIONS: Record<string, string[]> = {
  assistant: [
    "What can Helix AI do?",
    "Find my presentation slides",
    "How is my CPU and RAM performing?",
    "Search my local files",
    "Summarize my recent activity",
  ],
  files: [
    "Find files larger than 1 GB",
    "Find recently modified files",
    "Find duplicate files",
    "Organize my Downloads",
  ],
  monitor: [
    "Explain my current CPU usage",
    "Analyze my RAM usage",
    "Check my storage capacity",
    "Suggest ways to improve performance",
  ],
  automation: [
    "Show my scheduled automations",
    "Help me create an automation",
    "Explain my automation history",
  ],
  security: [
    "Review available security status",
    "Explain recent security events",
    "Check the status of enabled protections",
  ],
  backup: [
    "Check my backup status",
    "Show recent backups",
    "Help me plan a backup",
  ],
  timeline: [
    "Summarize my recent activity",
    "Show my file changes today",
    "What did I work on recently?",
  ],
  duplicates: [
    "Find duplicate files",
    "How much space can I free?",
    "Explain duplicate cleanup rules",
  ],
  search: [
    "How does semantic search work in Helix?",
    "Search my documents for DBMS",
    "Find my presentation files",
  ],
  dashboard: [
    "Summarize my system status",
    "Find my largest files",
    "Summarize my recent activity",
    "Check my backup status",
  ],
};

export function getSuggestionsForPage(page: string): string[] {
  return PAGE_SUGGESTIONS[page] || PAGE_SUGGESTIONS.assistant;
}
