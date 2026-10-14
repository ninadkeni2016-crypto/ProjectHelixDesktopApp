import type { UserData } from "../types/user";

export const defaultUserData = (): UserData => ({
  chatHistory: [
    {
      role: "assistant",
      text: "Hi, I'm Helix AI, your intelligent desktop companion. I can help you with Project Helix, search local files, explain your system metrics, automate tasks, or answer general questions. What would you like to explore today?",
      ts: "10:01 AM",
    },
    {
      role: "user",
      text: "Find my DBMS presentation from last week",
      ts: "10:03 AM",
    },
    {
      role: "assistant",
      text: "Found it! DBMS_Presentation.pptx — located in /Documents/University. Last modified 2 hours ago, 4.2 MB. It contains 24 slides covering ER diagrams, normalization, and SQL joins. Want me to open it or show related files?",
      ts: "10:03 AM",
    },
    {
      role: "user",
      text: "What's the current CPU temperature?",
      ts: "10:05 AM",
    },
    {
      role: "assistant",
      text: "Your CPU is currently running at 62°C — within normal range. Peak this session was 74°C during your 10 AM compilation task. I recommend ensuring your cooling paste is refreshed if you regularly exceed 80°C during workloads.",
      ts: "10:05 AM",
    },
  ],
  recentFiles: [
    { name: "DBMS_Presentation.pptx", type: "ppt", size: "4.2 MB", modified: "2h ago", tags: ["study", "database"], path: "/Documents/University" },
    { name: "Project_Helix_Design.fig", type: "fig", size: "18.7 MB", modified: "4h ago", tags: ["design", "ui"], path: "/Projects/Helix" },
    { name: "budget_q4_2025.xlsx", type: "xlsx", size: "892 KB", modified: "Yesterday", tags: ["finance"], path: "/Documents/Finance" },
    { name: "system_architecture.pdf", type: "pdf", size: "2.1 MB", modified: "2 days ago", tags: ["tech", "docs"], path: "/Documents/Work" },
    { name: "meeting_notes_jan.docx", type: "docx", size: "340 KB", modified: "3 days ago", tags: ["meetings"], path: "/Documents/Work" },
    { name: "wallpaper_mountains.jpg", type: "jpg", size: "5.6 MB", modified: "1 week ago", tags: ["photos"], path: "/Pictures" },
  ],
  timelineItems: [
    { date: "2026-07-23", time: "11:42 AM", type: "download", label: "Downloaded Node.js Installer", iconType: "Download", color: "text-blue-400" },
    { date: "2026-07-23", time: "10:15 AM", type: "meeting", label: "Meeting: Q3 Sprint Planning — 47 min", iconType: "Calendar", color: "text-purple-400" },
    { date: "2026-07-23", time: "09:30 AM", type: "screenshot", label: "Screenshot: Figma wireframe", iconType: "Image", color: "text-cyan-400" },
    { date: "2026-07-22", time: "04:22 PM", type: "file", label: "Edited DBMS_Presentation.pptx", iconType: "FileText", color: "text-green-400" },
    { date: "2026-07-22", time: "02:10 PM", type: "project", label: "Project Helix — 2h 12m session", iconType: "Layers", color: "text-blue-400" },
    { date: "2026-07-22", time: "10:00 AM", type: "backup", label: "Automatic backup completed — 4.2 GB", iconType: "CloudUpload", color: "text-emerald-400" },
    { date: "2026-07-21", time: "08:55 PM", type: "download", label: "Downloaded VS Code update 1.91", iconType: "Download", color: "text-blue-400" },
    { date: "2026-07-21", time: "03:30 PM", type: "meeting", label: "Meeting: Design Review — 28 min", iconType: "Calendar", color: "text-purple-400" },
    { date: "2026-07-20", time: "06:15 PM", type: "file", label: "Created budget_q4_2025.xlsx", iconType: "FileText", color: "text-green-400" },
    { date: "2026-07-20", time: "11:20 AM", type: "screenshot", label: "Screenshot: System dashboard stats", iconType: "Image", color: "text-cyan-400" },
  ],
  automationToggles: {
    1: true,
    2: true,
    3: false,
    4: true,
    5: true,
    6: false,
  },
  settings: {
    notifications: true,
    aiSuggestions: true,
    autoBackup: true,
    privacyMode: false,
  },
  searchQuery: "Find my DBMS presentation",
});
