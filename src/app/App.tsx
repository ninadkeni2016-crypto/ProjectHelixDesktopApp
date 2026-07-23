import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Bot, FolderOpen, Search, Clock, Zap, Activity,
  Copy, Shield, BarChart2, Settings, ChevronRight, Bell, User,
  Cpu, MemoryStick, HardDrive, Battery, Wifi, Thermometer,
  FileText, Image, Film, Archive, Star, Download, Tag, Eye,
  Send, Mic, Paperclip, RefreshCw, Play, Pause, Trash2,
  CheckCircle, AlertTriangle, Info, Lock, Unlock, Usb,
  Calendar, Filter, SortAsc, Grid, List, FolderPlus,
  CloudUpload, RotateCcw, ChevronDown, ChevronUp, X,
  TrendingUp, TrendingDown, Circle, Layers, Globe,
  MonitorSpeaker, Sparkles, Brain, Database, Network,
  ShieldCheck, AlertOctagon, FileSearch, Folder, File,
  MoreHorizontal, Plus, Home, Command, Moon, Sun
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────
type Page =
  | "dashboard" | "assistant" | "files" | "search" | "timeline"
  | "automation" | "monitor" | "duplicates" | "backup" | "security"
  | "analytics" | "settings";

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const cpuData = Array.from({ length: 20 }, (_, i) => ({
  t: i, v: 30 + Math.sin(i * 0.5) * 20 + Math.random() * 15
}));
const ramData = Array.from({ length: 20 }, (_, i) => ({
  t: i, v: 55 + Math.sin(i * 0.3) * 10 + Math.random() * 8
}));
const gpuData = Array.from({ length: 20 }, (_, i) => ({
  t: i, v: 20 + Math.sin(i * 0.7) * 25 + Math.random() * 12
}));
const netData = Array.from({ length: 20 }, (_, i) => ({
  t: i, up: Math.random() * 40 + 5, down: Math.random() * 120 + 20
}));
const storageData = [
  { name: "Documents", value: 45, color: "#3b82f6" },
  { name: "Media", value: 28, color: "#7c3aed" },
  { name: "System", value: 15, color: "#06b6d4" },
  { name: "Other", value: 12, color: "#6b7ea8" },
];
const productivityData = [
  { day: "Mon", score: 72, files: 24 },
  { day: "Tue", score: 85, files: 31 },
  { day: "Wed", score: 61, files: 18 },
  { day: "Thu", score: 90, files: 42 },
  { day: "Fri", score: 78, files: 29 },
  { day: "Sat", score: 45, files: 11 },
  { day: "Sun", score: 33, files: 8 },
];
const recentFiles = [
  { name: "DBMS_Presentation.pptx", type: "ppt", size: "4.2 MB", modified: "2h ago", tags: ["study", "database"], path: "/Documents/University" },
  { name: "Project_Helix_Design.fig", type: "fig", size: "18.7 MB", modified: "4h ago", tags: ["design", "ui"], path: "/Projects/Helix" },
  { name: "budget_q4_2025.xlsx", type: "xlsx", size: "892 KB", modified: "Yesterday", tags: ["finance"], path: "/Documents/Finance" },
  { name: "system_architecture.pdf", type: "pdf", size: "2.1 MB", modified: "2 days ago", tags: ["tech", "docs"], path: "/Documents/Work" },
  { name: "meeting_notes_jan.docx", type: "docx", size: "340 KB", modified: "3 days ago", tags: ["meetings"], path: "/Documents/Work" },
  { name: "wallpaper_mountains.jpg", type: "jpg", size: "5.6 MB", modified: "1 week ago", tags: ["photos"], path: "/Pictures" },
];
const folderTree = [
  {
    name: "Home", icon: Home, expanded: true, children: [
      { name: "Documents", icon: Folder, expanded: true, children: [
        { name: "University", icon: Folder, expanded: false, children: [] },
        { name: "Work", icon: Folder, expanded: false, children: [] },
        { name: "Finance", icon: Folder, expanded: false, children: [] },
      ]},
      { name: "Projects", icon: Folder, expanded: false, children: [
        { name: "Helix", icon: Folder, expanded: false, children: [] },
        { name: "Portfolio", icon: Folder, expanded: false, children: [] },
      ]},
      { name: "Downloads", icon: Download, expanded: false, children: [] },
      { name: "Pictures", icon: Image, expanded: false, children: [] },
      { name: "Videos", icon: Film, expanded: false, children: [] },
    ]
  }
];
const timelineItems = [
  { date: "2026-07-23", time: "11:42 AM", type: "download", label: "Downloaded Node.js Installer", icon: Download, color: "text-blue-400" },
  { date: "2026-07-23", time: "10:15 AM", type: "meeting", label: "Meeting: Q3 Sprint Planning — 47 min", icon: Calendar, color: "text-purple-400" },
  { date: "2026-07-23", time: "09:30 AM", type: "screenshot", label: "Screenshot: Figma wireframe", icon: Image, color: "text-cyan-400" },
  { date: "2026-07-22", time: "04:22 PM", type: "file", label: "Edited DBMS_Presentation.pptx", icon: FileText, color: "text-green-400" },
  { date: "2026-07-22", time: "02:10 PM", type: "project", label: "Project Helix — 2h 12m session", icon: Layers, color: "text-blue-400" },
  { date: "2026-07-22", time: "10:00 AM", type: "backup", label: "Automatic backup completed — 4.2 GB", icon: CloudUpload, color: "text-emerald-400" },
  { date: "2026-07-21", time: "08:55 PM", type: "download", label: "Downloaded VS Code update 1.91", icon: Download, color: "text-blue-400" },
  { date: "2026-07-21", time: "03:30 PM", type: "meeting", label: "Meeting: Design Review — 28 min", icon: Calendar, color: "text-purple-400" },
  { date: "2026-07-20", time: "06:15 PM", type: "file", label: "Created budget_q4_2025.xlsx", icon: FileText, color: "text-green-400" },
  { date: "2026-07-20", time: "11:20 AM", type: "screenshot", label: "Screenshot: System dashboard stats", icon: Image, color: "text-cyan-400" },
];
const automationCards = [
  { id: 1, title: "Auto-Organize Downloads", desc: "Sort downloaded files by type into respective folders automatically", icon: FolderPlus, enabled: true, lastRun: "2 hrs ago", runs: 1240 },
  { id: 2, title: "Smart Backup", desc: "Incremental backup to cloud every 6 hours with smart deduplication", icon: CloudUpload, enabled: true, lastRun: "2 hrs ago", runs: 892 },
  { id: 3, title: "Duplicate Cleanup", desc: "Detect and remove duplicate files weekly to free up storage", icon: Copy, enabled: false, lastRun: "7 days ago", runs: 48 },
  { id: 4, title: "Temp File Sweep", desc: "Remove temporary files, browser cache, and system junk monthly", icon: Trash2, enabled: true, lastRun: "6 days ago", runs: 312 },
  { id: 5, title: "App Startup Optimizer", desc: "Disable slow startup programs and prioritize system resources", icon: Zap, enabled: true, lastRun: "On boot", runs: 634 },
  { id: 6, title: "Screenshot Organizer", desc: "Tag and sort screenshots by app context using AI vision", icon: Image, enabled: false, lastRun: "Never", runs: 0 },
];
const duplicateGroups = [
  { id: 1, type: "image", count: 3, size: "42.8 MB", preview: "mountains_photo", names: ["IMG_4821.jpg", "IMG_4821_copy.jpg", "mountains_backup.jpg"] },
  { id: 2, type: "pdf", count: 2, size: "18.4 MB", preview: "resume_doc", names: ["Resume_2025.pdf", "Resume_final.pdf"] },
  { id: 3, type: "video", count: 2, size: "384 MB", preview: "vacation_video", names: ["vacation_clip.mp4", "vacation_clip_edited.mp4"] },
  { id: 4, type: "document", count: 4, size: "8.6 MB", preview: "notes_doc", names: ["meeting_notes.docx", "meeting_notes_v2.docx", "meeting_notes_final.docx", "meeting_notes_final2.docx"] },
];
const backupItems = [
  { label: "Full Backup", date: "Jul 22, 2026 — 02:00 AM", size: "4.2 GB", status: "success" },
  { label: "Incremental", date: "Jul 23, 2026 — 08:00 AM", size: "312 MB", status: "success" },
  { label: "Incremental", date: "Jul 23, 2026 — 02:00 PM", size: "87 MB", status: "success" },
  { label: "Full Backup", date: "Jul 15, 2026 — 02:00 AM", size: "3.9 GB", status: "success" },
  { label: "Incremental", date: "Jul 16, 2026 — 08:00 AM", size: "540 MB", status: "warning" },
  { label: "Cloud Sync", date: "Jul 23, 2026 — 11:00 AM", size: "1.8 GB", status: "success" },
];
const securityAlerts = [
  { severity: "high", msg: "Unknown USB device connected at 11:34 AM", icon: Usb, time: "1h ago" },
  { severity: "medium", msg: "App 'QuickShare.exe' requested admin privileges", icon: AlertTriangle, time: "3h ago" },
  { severity: "low", msg: "Firewall blocked 3 outbound connections from Chrome", icon: Shield, time: "5h ago" },
  { severity: "info", msg: "Security definitions updated to version 2026.07.23", icon: Info, time: "6h ago" },
];
const chatHistory = [
  { role: "assistant", text: "Hi! I'm Helix AI. I can help you find files, analyze your system, automate tasks, or answer questions. What would you like to do today?", ts: "10:01 AM" },
  { role: "user", text: "Find my DBMS presentation from last week", ts: "10:03 AM" },
  { role: "assistant", text: "Found it! DBMS_Presentation.pptx — located in /Documents/University. Last modified 2 hours ago, 4.2 MB. It contains 24 slides covering ER diagrams, normalization, and SQL joins. Want me to open it or show related files?", ts: "10:03 AM" },
  { role: "user", text: "What's the current CPU temperature?", ts: "10:05 AM" },
  { role: "assistant", text: "Your CPU is currently running at 62°C — within normal range. Peak this session was 74°C during your 10 AM compilation task. I recommend ensuring your cooling paste is refreshed if you regularly exceed 80°C during workloads.", ts: "10:05 AM" },
];
const suggestedPrompts = [
  "Show me large files over 1GB",
  "What apps are slowing my startup?",
  "Find duplicate photos from July",
  "Summarize my activity this week",
  "Schedule a backup for tonight",
];

// ─── Helper Components ────────────────────────────────────────────────────────
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl ${className}`} style={{ background: "rgba(16,22,45,0.55)" }}>
      {children}
    </div>
  );
}

function MetricBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

function Badge({ children, color = "blue" }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/15 text-blue-300 border-blue-500/20",
    purple: "bg-purple-500/15 text-purple-300 border-purple-500/20",
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    red: "bg-red-500/15 text-red-300 border-red-500/20",
    yellow: "bg-amber-500/15 text-amber-300 border-amber-500/20",
    cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono border ${colors[color] || colors.blue}`}>
      {children}
    </span>
  );
}

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-5.5 rounded-full transition-all duration-300 focus:outline-none ${enabled ? "bg-blue-500" : "bg-white/15"}`}
      style={{ height: "22px", width: "40px" }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300"
        style={{ left: enabled ? "20px" : "2px", height: "16px", width: "16px" }}
      />
    </button>
  );
}

function FileIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ReactNode; color: string }> = {
    pdf: { icon: <FileText size={14} />, color: "text-red-400 bg-red-500/10" },
    ppt: { icon: <Layers size={14} />, color: "text-orange-400 bg-orange-500/10" },
    pptx: { icon: <Layers size={14} />, color: "text-orange-400 bg-orange-500/10" },
    xlsx: { icon: <BarChart2 size={14} />, color: "text-green-400 bg-green-500/10" },
    docx: { icon: <FileText size={14} />, color: "text-blue-400 bg-blue-500/10" },
    fig: { icon: <Layers size={14} />, color: "text-purple-400 bg-purple-500/10" },
    jpg: { icon: <Image size={14} />, color: "text-cyan-400 bg-cyan-500/10" },
    mp4: { icon: <Film size={14} />, color: "text-pink-400 bg-pink-500/10" },
  };
  const f = map[type] || { icon: <File size={14} />, color: "text-gray-400 bg-gray-500/10" };
  return <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${f.color}`}>{f.icon}</span>;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-3 py-2 rounded-xl border border-white/10 text-xs font-mono text-blue-200" style={{ background: "rgba(10,15,35,0.95)" }}>
        {payload.map((p: any, i: number) => (
          <div key={i}>{p.name}: <span className="text-white">{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</span></div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Pages ────────────────────────────────────────────────────────────────────
function Dashboard() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);
  const cpu = 42 + Math.sin(tick * 0.8) * 18 | 0;
  const ram = 61 + Math.sin(tick * 0.5) * 8 | 0;
  const gpu = 33 + Math.sin(tick * 1.1) * 22 | 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Good morning, Alex</h1>
          <p className="text-sm text-blue-300/70 mt-0.5">Wednesday, July 23, 2026 · System running optimally</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/15 border border-blue-500/20 text-blue-300 text-sm hover:bg-blue-500/25 transition-colors">
            <Sparkles size={14} /> AI Insights
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Live Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "CPU", value: cpu, unit: "%", icon: Cpu, color: "#3b82f6", gradient: "from-blue-500/20 to-blue-600/5" },
          { label: "RAM", value: ram, unit: "%", icon: MemoryStick, color: "#7c3aed", gradient: "from-purple-500/20 to-purple-600/5" },
          { label: "GPU", value: gpu, unit: "%", icon: MonitorSpeaker, color: "#06b6d4", gradient: "from-cyan-500/20 to-cyan-600/5" },
          { label: "Storage", value: 68, unit: "%", icon: HardDrive, color: "#10b981", gradient: "from-emerald-500/20 to-emerald-600/5" },
        ].map((m) => (
          <GlassCard key={m.label} className={`p-4 bg-gradient-to-br ${m.gradient}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">{m.label}</span>
              <m.icon size={16} style={{ color: m.color }} />
            </div>
            <div className="text-3xl font-bold text-white mb-2 font-mono">{m.value}<span className="text-lg text-gray-400">{m.unit}</span></div>
            <MetricBar value={m.value} color={m.color} />
          </GlassCard>
        ))}
      </div>

      {/* Second metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Battery", value: "78%", sub: "~3h 20m left", icon: Battery, color: "text-green-400" },
          { label: "Temperature", value: "62°C", sub: "Normal range", icon: Thermometer, color: "text-amber-400" },
          { label: "Network", value: "142 Mbps", sub: "↓ 128 ↑ 14", icon: Wifi, color: "text-blue-400" },
          { label: "Productivity", value: "84%", sub: "+6% vs yesterday", icon: TrendingUp, color: "text-purple-400" },
        ].map((m) => (
          <GlassCard key={m.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <m.icon size={18} className={m.color} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-mono">{m.label}</p>
                <p className="text-base font-semibold text-white">{m.value}</p>
                <p className="text-xs text-gray-500">{m.sub}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 col-span-2">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Productivity Score — This Week</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={productivityData}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7ea8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7ea8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" name="Score" stroke="#3b82f6" strokeWidth={2} fill="url(#pg)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Storage Breakdown</h3>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={storageData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                {storageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {storageData.map(s => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-gray-400">{s.name}</span>
                </div>
                <span className="text-gray-300 font-mono">{s.value}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 col-span-2">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Recent Files</h3>
          <div className="space-y-2">
            {recentFiles.slice(0, 4).map(f => (
              <div key={f.name} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                <FileIcon type={f.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{f.name}</p>
                  <p className="text-xs text-gray-500">{f.path} · {f.size}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {f.tags.slice(0, 1).map(t => <Badge key={t} color="blue">{t}</Badge>)}
                  <span className="text-xs text-gray-500 font-mono">{f.modified}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Run Backup", icon: CloudUpload, color: "text-blue-400" },
              { label: "Find Dupes", icon: Copy, color: "text-purple-400" },
              { label: "Clean Temp", icon: Trash2, color: "text-red-400" },
              { label: "AI Scan", icon: Brain, color: "text-cyan-400" },
              { label: "Optimize", icon: Zap, color: "text-amber-400" },
              { label: "Security", icon: Shield, color: "text-green-400" },
            ].map(a => (
              <button key={a.label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all">
                <a.icon size={18} className={a.color} />
                <span className="text-xs text-gray-400">{a.label}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* AI Insight */}
      <GlassCard className="p-5 border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-300 mb-1">Helix AI Insight</p>
            <p className="text-sm text-gray-300 leading-relaxed">
              Your Downloads folder has grown by 2.4 GB this week. I detected 12 duplicate files and 3 large videos over 500 MB. Running the cleanup automation could recover up to <span className="text-white font-semibold">1.8 GB</span> of storage. Also, your CPU runs hottest between 2–4 PM — consider scheduling intensive tasks for morning hours.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function AIAssistant() {
  const [messages, setMessages] = useState(chatHistory);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input, ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const resp = { role: "assistant", text: "I understand your request. Let me analyze your system and files to provide you with the most relevant information. Based on my analysis, I found several relevant items in your workspace that match your query. Would you like me to take any specific action?", ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      setMessages(m => [...m, resp]);
      setTyping(false);
    }, 1800);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Brain size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Helix AI Assistant</h2>
          <p className="text-xs text-green-400 flex items-center gap-1"><Circle size={6} fill="#22c55e" className="fill-green-400" /> Online · GPT-4o powered</p>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Brain size={14} className="text-white" />
              </div>
            )}
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white/[0.06] border border-white/[0.08] text-gray-200 rounded-tl-sm"}`}>
              {m.text}
              <p className="text-xs opacity-50 mt-1 font-mono">{m.ts}</p>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Brain size={14} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/[0.08]">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested */}
      <div className="px-6 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {suggestedPrompts.map(p => (
          <button key={p} onClick={() => setInput(p)} className="flex-shrink-0 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/10 hover:border-white/20 transition-all">
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 pb-6">
        <div className="flex gap-3 items-end p-3 rounded-2xl border border-white/10 bg-white/5">
          <button className="p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors">
            <Paperclip size={16} />
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask Helix anything about your files, system, or tasks..."
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 resize-none outline-none min-h-[36px] max-h-[120px]"
            rows={1}
          />
          <button className="p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors">
            <Mic size={16} />
          </button>
          <button onClick={send} className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SmartFileManager() {
  const [view, setView] = useState<"grid" | "list">("list");
  const [selected, setSelected] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["Home", "Documents"]));

  const toggleFolder = (name: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const TreeNode = ({ node, depth = 0 }: { node: any; depth?: number }) => {
    const expanded = expandedFolders.has(node.name);
    const hasChildren = node.children?.length > 0;
    return (
      <div>
        <button
          onClick={() => hasChildren && toggleFolder(node.name)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left transition-colors"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          {hasChildren ? (expanded ? <ChevronDown size={12} className="text-gray-500 flex-shrink-0" /> : <ChevronRight size={12} className="text-gray-500 flex-shrink-0" />) : <span className="w-3" />}
          <node.icon size={14} className="text-blue-400 flex-shrink-0" />
          <span className="text-xs text-gray-300 truncate">{node.name}</span>
        </button>
        {expanded && hasChildren && (
          <div>
            {node.children.map((c: any) => <TreeNode key={c.name} node={c} depth={depth + 1} />)}
          </div>
        )}
      </div>
    );
  };

  const selFile = recentFiles.find(f => f.name === selected);

  return (
    <div className="flex h-full">
      {/* Folder Tree */}
      <div className="w-56 flex-shrink-0 border-r border-white/[0.06] p-3 overflow-y-auto">
        <p className="text-xs text-gray-600 font-mono uppercase tracking-wider px-2 mb-2">Explorer</p>
        {folderTree.map(node => <TreeNode key={node.name} node={node} />)}
        <div className="mt-4">
          <p className="text-xs text-gray-600 font-mono uppercase tracking-wider px-2 mb-2">Favorites</p>
          {[{ name: "Downloads", icon: Download }, { name: "Pictures", icon: Image }, { name: "Documents", icon: FileText }].map(f => (
            <button key={f.name} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left transition-colors">
              <Star size={12} className="text-amber-400" />
              <f.icon size={14} className="text-gray-400" />
              <span className="text-xs text-gray-400">{f.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-1.5 flex-1">
            <span className="text-xs text-gray-600">Home</span>
            <ChevronRight size={12} className="text-gray-700" />
            <span className="text-xs text-gray-400">Documents</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 transition-colors"><Filter size={14} /></button>
            <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 transition-colors"><SortAsc size={14} /></button>
            <div className="flex bg-white/5 rounded-lg p-0.5">
              <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-blue-500/20 text-blue-300" : "text-gray-500"}`}><List size={14} /></button>
              <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-blue-500/20 text-blue-300" : "text-gray-500"}`}><Grid size={14} /></button>
            </div>
          </div>
        </div>

        {/* Files */}
        <div className="flex-1 overflow-y-auto p-4">
          {view === "list" ? (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_80px_120px_100px_80px] gap-2 px-3 py-1 text-xs text-gray-600 font-mono uppercase tracking-wider border-b border-white/5 mb-2">
                <span>Name</span><span>Size</span><span>Tags</span><span>Modified</span><span>Actions</span>
              </div>
              {recentFiles.map(f => (
                <div key={f.name} onClick={() => setSelected(f.name === selected ? null : f.name)} className={`grid grid-cols-[1fr_80px_120px_100px_80px] gap-2 items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all ${selected === f.name ? "bg-blue-500/15 border border-blue-500/20" : "hover:bg-white/5 border border-transparent"}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileIcon type={f.type} />
                    <span className="text-sm text-gray-200 truncate">{f.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{f.size}</span>
                  <div className="flex gap-1">{f.tags.map(t => <Badge key={t} color="blue">{t}</Badge>)}</div>
                  <span className="text-xs text-gray-500 font-mono">{f.modified}</span>
                  <div className="flex gap-1">
                    <button className="p-1 rounded-md hover:bg-white/10 text-gray-600 hover:text-gray-300 transition-colors"><Eye size={12} /></button>
                    <button className="p-1 rounded-md hover:bg-white/10 text-gray-600 hover:text-gray-300 transition-colors"><Star size={12} /></button>
                    <button className="p-1 rounded-md hover:bg-white/10 text-gray-600 hover:text-gray-300 transition-colors"><MoreHorizontal size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
              {recentFiles.map(f => (
                <div key={f.name} onClick={() => setSelected(f.name === selected ? null : f.name)} className={`p-4 rounded-2xl cursor-pointer transition-all border ${selected === f.name ? "bg-blue-500/15 border-blue-500/20" : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06]"}`}>
                  <FileIcon type={f.type} />
                  <p className="text-sm text-gray-200 mt-2 mb-1 truncate">{f.name}</p>
                  <p className="text-xs text-gray-600 font-mono">{f.size}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      {selFile && (
        <div className="w-72 flex-shrink-0 border-l border-white/[0.06] p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">Preview</h3>
            <button onClick={() => setSelected(null)} className="p-1 hover:bg-white/10 rounded-md text-gray-500 hover:text-gray-300 transition-colors"><X size={14} /></button>
          </div>
          <div className="w-full h-32 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/5 flex items-center justify-center mb-4">
            <FileIcon type={selFile.type} />
          </div>
          <h4 className="text-sm font-medium text-gray-200 mb-1">{selFile.name}</h4>
          <p className="text-xs text-gray-600 mb-3">{selFile.path}</p>
          <div className="space-y-2">
            {[["Size", selFile.size], ["Modified", selFile.modified], ["Type", selFile.type.toUpperCase()]].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-gray-600">{k}</span>
                <span className="text-gray-300 font-mono">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-600 mb-2">AI Tags</p>
            <div className="flex flex-wrap gap-1">
              {selFile.tags.map(t => <Badge key={t} color="purple">{t}</Badge>)}
              <Badge color="cyan">auto-tagged</Badge>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <button className="w-full py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-medium transition-colors">Open File</button>
            <button className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors">Show in Folder</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SemanticSearch() {
  const [query, setQuery] = useState("Find my DBMS presentation");
  const [searched, setSearched] = useState(true);
  const results = [
    { name: "DBMS_Presentation.pptx", relevance: 98, type: "ppt", path: "/Documents/University", preview: "ER Diagrams, Normalization, SQL Joins — 24 slides", tags: ["study", "database"] },
    { name: "database_notes.pdf", relevance: 82, type: "pdf", path: "/Documents/University", preview: "Comprehensive notes on relational databases, queries, and indexing", tags: ["study", "notes"] },
    { name: "SQL_cheatsheet.docx", relevance: 71, type: "docx", path: "/Documents/Work", preview: "SQL query cheatsheet with JOIN examples and aggregation functions", tags: ["database", "reference"] },
    { name: "dbms_assignment_3.pdf", relevance: 65, type: "pdf", path: "/Documents/University", preview: "Assignment covering ER modeling and normalization exercises", tags: ["study", "assignment"] },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Semantic Search</h2>
        <p className="text-sm text-gray-500">Search files using natural language — powered by vector embeddings</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:border-blue-500/30 focus-within:border-blue-500/50 transition-all">
          <Search size={18} className="text-blue-400 flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setSearched(true)}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
            placeholder='Try "Find my DBMS PPT" or "photos from July"...'
          />
          {query && <button onClick={() => { setQuery(""); setSearched(false); }} className="text-gray-600 hover:text-gray-400"><X size={14} /></button>}
        </div>
        <button onClick={() => setSearched(true)} className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">Search</button>
      </div>

      {searched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400"><span className="text-white font-semibold">{results.length}</span> results for "<span className="text-blue-300">{query}</span>"</p>
            <div className="flex gap-2">
              <Badge color="purple">AI Semantic</Badge>
              <Badge color="cyan">Vector Search</Badge>
            </div>
          </div>

          <div className="space-y-3">
            {results.map((r, i) => (
              <GlassCard key={i} className={`p-5 cursor-pointer hover:border-blue-500/20 transition-all ${i === 0 ? "border-blue-500/30" : ""}`}>
                <div className="flex items-start gap-4">
                  <FileIcon type={r.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-semibold text-gray-200">{r.name}</h3>
                      {i === 0 && <Badge color="green">Best match</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{r.path}</p>
                    <p className="text-sm text-gray-400">{r.preview}</p>
                    <div className="flex items-center gap-3 mt-3">
                      {r.tags.map(t => <Badge key={t} color="blue">{t}</Badge>)}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-bold font-mono" style={{ color: r.relevance > 90 ? "#22c55e" : r.relevance > 70 ? "#f59e0b" : "#6b7ea8" }}>{r.relevance}%</div>
                    <div className="text-xs text-gray-600">relevance</div>
                    <div className="w-20 h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${r.relevance}%`, background: r.relevance > 90 ? "#22c55e" : "#3b82f6" }} />
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Sparkles size={14} className="text-blue-400" /> Related Searches</h3>
            <div className="flex flex-wrap gap-2">
              {["database assignment", "SQL notes 2025", "university study materials", "normalization diagrams", "ERD templates"].map(s => (
                <button key={s} onClick={() => { setQuery(s); }} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function AITimeline() {
  const [filter, setFilter] = useState("all");
  const categories = ["all", "file", "download", "meeting", "screenshot", "project", "backup"];
  const grouped: Record<string, typeof timelineItems> = {};
  timelineItems
    .filter(i => filter === "all" || i.type === filter)
    .forEach(item => {
      if (!grouped[item.date]) grouped[item.date] = [];
      grouped[item.date].push(item);
    });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">AI Memory Timeline</h2>
          <p className="text-sm text-gray-500">Your digital activity history, intelligently organized</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-blue-500/50" placeholder="Search timeline..." />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${filter === c ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10 hover:text-gray-300"}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">{new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
              <div className="flex-1 h-px bg-white/5" />
              <Badge color="blue">{items.length} events</Badge>
            </div>
            <div className="space-y-2 pl-2 border-l border-white/[0.06]">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer ml-3">
                  <div className={`w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 ${item.color}`}>
                    <item.icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300">{item.label}</p>
                    <p className="text-xs text-gray-600 font-mono mt-0.5 capitalize">{item.type}</p>
                  </div>
                  <span className="text-xs text-gray-600 font-mono flex-shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AutomationCenter() {
  const [toggles, setToggles] = useState<Record<number, boolean>>(Object.fromEntries(automationCards.map(c => [c.id, c.enabled])));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Automation Center</h2>
          <p className="text-sm text-gray-500">{Object.values(toggles).filter(Boolean).length} automations active</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-sm transition-colors">
          <Plus size={14} /> New Automation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {automationCards.map(card => (
          <GlassCard key={card.id} className={`p-5 transition-all ${toggles[card.id] ? "border-blue-500/15" : ""}`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${toggles[card.id] ? "bg-blue-500/20" : "bg-white/5"}`}>
                <card.icon size={18} className={toggles[card.id] ? "text-blue-400" : "text-gray-500"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-gray-200">{card.title}</h3>
                  <ToggleSwitch enabled={toggles[card.id]} onChange={() => setToggles(t => ({ ...t, [card.id]: !t[card.id] }))} />
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{card.desc}</p>
                <div className="flex items-center gap-4 text-xs text-gray-600 font-mono">
                  <span>Last run: {card.lastRun}</span>
                  <span>· {card.runs} total runs</span>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Scheduled Tasks</h3>
        <div className="space-y-3">
          {[
            { task: "Full system backup", schedule: "Daily at 2:00 AM", next: "In 14h 12m", status: "scheduled" },
            { task: "Duplicate scan", schedule: "Weekly on Sunday", next: "In 3 days", status: "scheduled" },
            { task: "Storage report", schedule: "Monthly on 1st", next: "In 9 days", status: "scheduled" },
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
              <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-300">{t.task}</p>
                <p className="text-xs text-gray-600 font-mono">{t.schedule}</p>
              </div>
              <div className="text-right">
                <Badge color="blue">{t.next}</Badge>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function SystemMonitor() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1500);
    return () => clearInterval(id);
  }, []);

  const liveMetrics = {
    cpu: 42 + Math.sin(tick * 0.8) * 18 | 0,
    ram: 61 + Math.sin(tick * 0.5) * 8 | 0,
    gpu: 33 + Math.sin(tick * 1.1) * 22 | 0,
    temp: 58 + Math.sin(tick * 0.3) * 10 | 0,
    disk: 4 + Math.random() * 8 | 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">System Monitor</h2>
          <p className="text-sm text-gray-500">Live performance metrics · Updates every 1.5s</p>
        </div>
        <Badge color="green"><Circle size={6} fill="#22c55e" className="mr-1 fill-green-400 inline" /> Live</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "CPU", value: liveMetrics.cpu, unit: "%", color: "#3b82f6" },
          { label: "RAM", value: liveMetrics.ram, unit: "%", color: "#7c3aed" },
          { label: "GPU", value: liveMetrics.gpu, unit: "%", color: "#06b6d4" },
          { label: "Temp", value: liveMetrics.temp, unit: "°C", color: "#f59e0b" },
          { label: "Disk I/O", value: liveMetrics.disk, unit: " MB/s", color: "#10b981" },
        ].map(m => (
          <GlassCard key={m.label} className="p-4 text-center">
            <p className="text-xs text-gray-600 font-mono uppercase mb-2">{m.label}</p>
            <div className="text-2xl font-bold font-mono" style={{ color: m.color }}>{m.value}<span className="text-sm text-gray-500">{m.unit}</span></div>
            <MetricBar value={Math.min(m.value, 100)} color={m.color} />
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { label: "CPU Usage", data: cpuData, key: "v", color: "#3b82f6" },
          { label: "RAM Usage", data: ramData, key: "v", color: "#7c3aed" },
        ].map(chart => (
          <GlassCard key={chart.label} className="p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">{chart.label}</h3>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chart.data}>
                <defs>
                  <linearGradient id={`g${chart.label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chart.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chart.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#6b7ea8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey={chart.key} name={chart.label} stroke={chart.color} strokeWidth={1.5} fill={`url(#g${chart.label})`} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Network Activity</h3>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={netData}>
            <defs>
              <linearGradient id="gdown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gup" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="t" hide />
            <YAxis tick={{ fontSize: 10, fill: "#6b7ea8" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="down" name="Download (Mbps)" stroke="#3b82f6" strokeWidth={1.5} fill="url(#gdown)" />
            <Area type="monotone" dataKey="up" name="Upload (Mbps)" stroke="#7c3aed" strokeWidth={1.5} fill="url(#gup)" />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard className="p-5 border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-4">
          <Brain size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-300 mb-1">AI Recommendations</p>
            <ul className="text-sm text-gray-400 space-y-1.5">
              <li>· RAM usage is consistently above 60% — consider closing background tabs or upgrading to 32 GB.</li>
              <li>· CPU temp peaks at 74°C during code compilation — check thermal paste or fan curve.</li>
              <li>· Disk I/O spikes correlate with your 2 PM backup task — reschedule to 4 AM for better performance.</li>
            </ul>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function DuplicateFinder() {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const totalSize = duplicateGroups.reduce((a, g) => {
    const mb = parseFloat(g.size);
    return a + (g.size.includes("MB") ? mb : mb * 1024);
  }, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Duplicate Finder</h2>
          <p className="text-sm text-gray-500">AI-powered duplicate detection across your storage</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-sm transition-colors">
          <RefreshCw size={14} /> Scan Now
        </button>
      </div>

      {/* Recovery card */}
      <GlassCard className="p-5 border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <HardDrive size={24} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-400">Recoverable Storage</p>
            <p className="text-3xl font-bold text-emerald-400 font-mono">{(totalSize / 1024).toFixed(1)} <span className="text-lg text-gray-500">GB</span></p>
            <p className="text-xs text-gray-600 mt-0.5">{duplicateGroups.reduce((a, g) => a + g.count - 1, 0)} duplicate files detected across {duplicateGroups.length} groups</p>
          </div>
          {selected.size > 0 && (
            <button className="px-4 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium transition-colors">
              Delete {selected.size} selected
            </button>
          )}
        </div>
      </GlassCard>

      <div className="space-y-4">
        {duplicateGroups.map(group => (
          <GlassCard key={group.id} className={`p-5 transition-all ${selected.has(group.id) ? "border-red-500/20" : ""}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selected.has(group.id)} onChange={() => setSelected(s => { const n = new Set(s); n.has(group.id) ? n.delete(group.id) : n.add(group.id); return n; })} className="w-4 h-4 rounded accent-blue-500" />
                <Badge color={group.type === "image" ? "cyan" : group.type === "video" ? "purple" : group.type === "pdf" ? "red" : "blue"}>{group.type}</Badge>
                <span className="text-sm text-gray-400">{group.count} copies · <span className="text-red-400 font-mono">{group.size}</span> wasted</span>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs transition-colors">Keep best · Delete rest</button>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {group.names.map((name, i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${i === 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-white/[0.03]"}`}>
                  <FileIcon type={group.type === "image" ? "jpg" : group.type === "video" ? "mp4" : group.type} />
                  <span className="text-sm text-gray-300 flex-1">{name}</span>
                  {i === 0 && <Badge color="green">Original</Badge>}
                  {i > 0 && <Badge color="red">Duplicate</Badge>}
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function BackupRecovery() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Backup & Recovery</h2>
          <p className="text-sm text-gray-500">Automated backups, restore points, and cloud sync</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-sm transition-colors">
          <CloudUpload size={14} /> Backup Now
        </button>
      </div>

      {/* Cloud sync status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { name: "OneDrive", used: "24.8 GB", total: "1 TB", pct: 2.5, color: "#3b82f6", status: "synced" },
          { name: "Google Drive", used: "12.3 GB", total: "100 GB", pct: 12, color: "#7c3aed", status: "syncing" },
          { name: "Local NAS", used: "186 GB", total: "2 TB", pct: 9, color: "#06b6d4", status: "synced" },
        ].map(c => (
          <GlassCard key={c.name} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-300">{c.name}</p>
              <Badge color={c.status === "synced" ? "green" : "yellow"}>{c.status}</Badge>
            </div>
            <p className="text-xs text-gray-600 font-mono mb-2">{c.used} / {c.total}</p>
            <MetricBar value={c.pct} color={c.color} />
          </GlassCard>
        ))}
      </div>

      {/* Backup history */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Backup History</h3>
        <div className="space-y-2">
          {backupItems.map((b, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.status === "success" ? "bg-emerald-400" : "bg-amber-400"}`} />
              <div className="flex-1">
                <p className="text-sm text-gray-300">{b.label}</p>
                <p className="text-xs text-gray-600 font-mono">{b.date}</p>
              </div>
              <span className="text-xs text-gray-500 font-mono">{b.size}</span>
              <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-600 hover:text-gray-300 transition-colors">
                <RotateCcw size={14} />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Restore Points */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">System Restore Points</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {["Jul 22 — 2:00 AM", "Jul 15 — 2:00 AM", "Jul 8 — 2:00 AM", "Jul 1 — 2:00 AM"].map((rp, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/20 cursor-pointer transition-all text-center">
              <RotateCcw size={16} className="text-blue-400 mx-auto mb-2" />
              <p className="text-xs text-gray-300 font-mono">{rp}</p>
              <p className="text-xs text-gray-600 mt-1">Full snapshot</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function SecurityCenter() {
  const [score] = useState(87);
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Security Center</h2>
          <p className="text-sm text-gray-500">Device health, threat monitoring, and security insights</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-sm transition-colors">
          <ShieldCheck size={14} /> Run Scan
        </button>
      </div>

      {/* Security Score */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5 col-span-1 flex flex-col items-center justify-center border-green-500/20">
          <div className="relative w-28 h-28 mb-3">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-green-400 font-mono">{score}</span>
              <span className="text-xs text-gray-500">/ 100</span>
            </div>
          </div>
          <p className="text-sm font-semibold text-green-400">Good</p>
          <p className="text-xs text-gray-600">Security score</p>
        </GlassCard>

        <div className="col-span-3 grid grid-cols-3 gap-4">
          {[
            { label: "Firewall", status: "Active", icon: Shield, ok: true },
            { label: "Antivirus", status: "Updated", icon: ShieldCheck, ok: true },
            { label: "Encryption", status: "Enabled", icon: Lock, ok: true },
            { label: "VPN", status: "Inactive", icon: Globe, ok: false },
            { label: "2FA", status: "Enabled", icon: CheckCircle, ok: true },
            { label: "Updates", status: "Pending 2", icon: RefreshCw, ok: false },
          ].map(item => (
            <GlassCard key={item.label} className={`p-4 ${!item.ok ? "border-amber-500/20" : ""}`}>
              <item.icon size={18} className={item.ok ? "text-green-400 mb-2" : "text-amber-400 mb-2"} />
              <p className="text-xs font-semibold text-gray-300">{item.label}</p>
              <p className={`text-xs font-mono ${item.ok ? "text-green-400" : "text-amber-400"}`}>{item.status}</p>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Security Alerts</h3>
        <div className="space-y-3">
          {securityAlerts.map((a, i) => {
            const colors: Record<string, string> = { high: "text-red-400 bg-red-500/10", medium: "text-amber-400 bg-amber-500/10", low: "text-blue-400 bg-blue-500/10", info: "text-gray-400 bg-gray-500/10" };
            return (
              <div key={i} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[a.severity]}`}>
                  <a.icon size={14} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">{a.msg}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge color={a.severity === "high" ? "red" : a.severity === "medium" ? "yellow" : "blue"}>{a.severity}</Badge>
                  <span className="text-xs text-gray-600 font-mono">{a.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* USB Activity */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">USB Activity Log</h3>
        <div className="space-y-2">
          {[
            { device: "SanDisk Ultra 64GB", event: "Connected", time: "11:34 AM", status: "unknown" },
            { device: "Logitech USB Receiver", event: "Connected", time: "Boot", status: "trusted" },
            { device: "iPhone 15 Pro", event: "Connected", time: "09:15 AM", status: "trusted" },
          ].map((u, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03]">
              <Usb size={16} className={u.status === "unknown" ? "text-amber-400" : "text-green-400"} />
              <div className="flex-1">
                <p className="text-sm text-gray-300">{u.device}</p>
                <p className="text-xs text-gray-600 font-mono">{u.event} · {u.time}</p>
              </div>
              <Badge color={u.status === "trusted" ? "green" : "yellow"}>{u.status}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function Analytics() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Analytics</h2>
        <p className="text-sm text-gray-500">Productivity trends, storage analysis, and file activity</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Files Created", value: "284", change: "+12%", up: true },
          { label: "Active Hours", value: "142h", change: "+8%", up: true },
          { label: "Storage Used", value: "342 GB", change: "+4.2 GB", up: false },
          { label: "Avg Productivity", value: "78%", change: "+6%", up: true },
        ].map(m => (
          <GlassCard key={m.label} className="p-4">
            <p className="text-xs text-gray-600 font-mono mb-2">{m.label}</p>
            <p className="text-2xl font-bold text-white mb-1">{m.value}</p>
            <div className={`flex items-center gap-1 text-xs ${m.up ? "text-green-400" : "text-red-400"}`}>
              {m.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {m.change} this month
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Weekly File Activity</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={productivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7ea8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7ea8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="files" name="Files" fill="#3b82f6" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
              <Bar dataKey="score" name="Score" fill="#7c3aed" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Storage by Category</h3>
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart cx="50%" cy="50%" innerRadius={30} outerRadius={80} data={storageData}>
              <RadialBar dataKey="value" cornerRadius={4}>
                {storageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </RadialBar>
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">File Type Breakdown</h3>
        <div className="space-y-3">
          {[
            { type: "Documents", count: 1240, size: "8.4 GB", pct: 28, color: "#3b82f6" },
            { type: "Images", count: 3802, size: "42.1 GB", pct: 45, color: "#7c3aed" },
            { type: "Videos", count: 124, size: "180 GB", pct: 18, color: "#06b6d4" },
            { type: "Audio", count: 892, size: "24 GB", pct: 9, color: "#10b981" },
          ].map(f => (
            <div key={f.type} className="flex items-center gap-4">
              <span className="w-24 text-sm text-gray-400 flex-shrink-0">{f.type}</span>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${f.pct}%`, background: f.color }} />
              </div>
              <span className="w-20 text-xs text-gray-500 font-mono text-right">{f.size}</span>
              <span className="w-12 text-xs text-gray-600 font-mono text-right">{f.count}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [darkMode] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Settings</h2>
        <p className="text-sm text-gray-500">Preferences, AI configuration, and system options</p>
      </div>

      {/* Profile */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Profile</h3>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">A</div>
          <div>
            <p className="text-base font-semibold text-white">Alex Morrison</p>
            <p className="text-sm text-gray-500">alex.morrison@email.com</p>
            <p className="text-xs text-blue-400 mt-1">Helix Pro · Expires Dec 2026</p>
          </div>
          <button className="ml-auto px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-colors">Edit Profile</button>
        </div>
      </GlassCard>

      {/* AI Preferences */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">AI Preferences</h3>
        <div className="space-y-4">
          {[
            { label: "AI Suggestions", desc: "Get intelligent file organization and task recommendations", val: aiSuggestions, set: setAiSuggestions },
            { label: "Privacy Mode", desc: "Process all AI tasks locally without cloud sync", val: privacyMode, set: setPrivacyMode },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">{item.label}</p>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>
              <ToggleSwitch enabled={item.val} onChange={() => item.set(!item.val)} />
            </div>
          ))}
          <div>
            <p className="text-sm text-gray-300 mb-2">AI Model</p>
            <select className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 outline-none">
              <option>GPT-4o (Recommended)</option>
              <option>Claude 3.5 Sonnet</option>
              <option>Gemini 2.0 Flash</option>
              <option>Local LLM (Ollama)</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Appearance */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Appearance</h3>
        <div className="grid grid-cols-3 gap-3">
          {["Dark (Active)", "Light", "System"].map((theme, i) => (
            <button key={theme} className={`p-3 rounded-xl border text-sm transition-all ${i === 0 ? "border-blue-500/40 bg-blue-500/10 text-blue-300" : "border-white/10 bg-white/5 text-gray-500 hover:bg-white/10"}`}>
              {i === 0 ? <Moon size={14} className="mx-auto mb-1" /> : <Sun size={14} className="mx-auto mb-1" />}
              {theme}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-400 mb-2">Accent Color</p>
          <div className="flex gap-2">
            {["#3b82f6", "#7c3aed", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"].map(c => (
              <button key={c} className={`w-8 h-8 rounded-full border-2 transition-all ${c === "#3b82f6" ? "border-white scale-110" : "border-transparent hover:border-white/40"}`} style={{ background: c }} />
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Notifications */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Notifications</h3>
        <div className="space-y-3">
          {[
            { label: "System Alerts", val: notifications, set: setNotifications },
            { label: "Backup Reminders", val: autoBackup, set: setAutoBackup },
            { label: "AI Insights", val: aiSuggestions, set: setAiSuggestions },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-1">
              <p className="text-sm text-gray-300">{item.label}</p>
              <ToggleSwitch enabled={item.val} onChange={() => item.set(!item.val)} />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Danger zone */}
      <GlassCard className="p-5 border-red-500/15">
        <h3 className="text-sm font-semibold text-red-400 mb-4">Danger Zone</h3>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors">Reset All Settings</button>
          <button className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors">Clear AI Memory</button>
          <button className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors">Delete Account</button>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Nav Items ────────────────────────────────────────────────────────────────
const navItems: { id: Page; label: string; icon: typeof LayoutDashboard; group?: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "assistant", label: "AI Assistant", icon: Bot },
  { id: "files", label: "File Manager", icon: FolderOpen, group: "Files" },
  { id: "search", label: "Semantic Search", icon: Search },
  { id: "timeline", label: "AI Timeline", icon: Clock },
  { id: "automation", label: "Automation", icon: Zap, group: "System" },
  { id: "monitor", label: "System Monitor", icon: Activity },
  { id: "duplicates", label: "Duplicate Finder", icon: Copy },
  { id: "backup", label: "Backup & Recovery", icon: CloudUpload },
  { id: "security", label: "Security", icon: Shield, group: "Tools" },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "settings", label: "Settings", icon: Settings },
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard />;
      case "assistant": return <AIAssistant />;
      case "files": return <SmartFileManager />;
      case "search": return <SemanticSearch />;
      case "timeline": return <AITimeline />;
      case "automation": return <AutomationCenter />;
      case "monitor": return <SystemMonitor />;
      case "duplicates": return <DuplicateFinder />;
      case "backup": return <BackupRecovery />;
      case "security": return <SecurityCenter />;
      case "analytics": return <Analytics />;
      case "settings": return <SettingsPage />;
    }
  };

  const activeItem = navItems.find(n => n.id === page);

  const groupLabels: Partial<Record<string, string>> = {
    Files: "Files",
    System: "System",
    Tools: "Tools",
  };

  // Group nav items
  let lastGroup: string | undefined;

  return (
    <div className="w-full h-screen flex overflow-hidden font-['Inter',sans-serif]" style={{ background: "#080b14" }}>
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />
      </div>

      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col border-r border-white/[0.06] relative z-10 transition-all duration-300"
        style={{ width: collapsed ? 60 : 220, background: "rgba(8,11,22,0.95)", backdropFilter: "blur(20px)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Sparkles size={14} className="text-white" />
          </div>
          {!collapsed && <span className="font-semibold text-white tracking-tight text-base">Project Helix</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          {navItems.map(item => {
            const showGroup = item.group && item.group !== lastGroup;
            if (showGroup) lastGroup = item.group;
            const active = page === item.id;
            return (
              <div key={item.id}>
                {showGroup && !collapsed && (
                  <p className="px-4 pt-3 pb-1.5 text-xs text-gray-700 font-mono uppercase tracking-widest">{item.group}</p>
                )}
                <button
                  onClick={() => setPage(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-xl transition-all text-left group ${active ? "bg-blue-500/15 text-blue-300" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
                  style={{ width: "calc(100% - 12px)" }}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={16} className={`flex-shrink-0 ${active ? "text-blue-400" : ""}`} />
                  {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                  {!collapsed && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/[0.06] p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all"
          >
            <ChevronRight size={16} className={`flex-shrink-0 transition-transform ${collapsed ? "" : "rotate-180"}`} />
            {!collapsed && <span className="text-xs text-gray-600">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] flex-shrink-0" style={{ background: "rgba(8,11,22,0.8)", backdropFilter: "blur(16px)" }}>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Helix</span>
            <ChevronRight size={12} className="text-gray-700" />
            <span className="text-gray-300 font-medium">{activeItem?.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-xs text-gray-500 w-48">
              <Command size={12} />
              <span>Search everything...</span>
              <span className="ml-auto font-mono text-gray-700">⌘K</span>
            </div>
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors">
                <Bell size={16} />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden" style={{ background: "rgba(10,14,28,0.98)" }}>
                  <div className="px-4 py-3 border-b border-white/8">
                    <p className="text-sm font-semibold text-gray-300">Notifications</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {[
                      { msg: "Backup completed — 312 MB synced", time: "2m ago", type: "success" },
                      { msg: "Unknown USB device detected", time: "1h ago", type: "warning" },
                      { msg: "Duplicate scan found 4 groups", time: "3h ago", type: "info" },
                      { msg: "Helix AI insight ready", time: "6h ago", type: "info" },
                    ].map((n, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === "success" ? "bg-green-400" : n.type === "warning" ? "bg-amber-400" : "bg-blue-400"}`} />
                        <div>
                          <p className="text-xs text-gray-300">{n.msg}</p>
                          <p className="text-xs text-gray-600 font-mono mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white cursor-pointer">A</div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
