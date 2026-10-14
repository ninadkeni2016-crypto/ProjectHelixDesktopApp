import { useState, useEffect, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  MonitorSpeaker, Database, Network,
  ShieldCheck, AlertOctagon, FileSearch, Folder, File,
  MoreHorizontal, Plus, Home, Command, Moon, Sun, LogOut, Sparkles, ExternalLink, Loader2
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar
} from "recharts";
import { LoginScreen } from "./components/LoginScreen";
import { HelixLogo } from "./components/HelixLogo";
import { useUser } from "./context/UserContext";
import { getFirstName, getTimelineIcon, getUserInitial } from "./lib/helpers";
import type { ChatMessage, RecentFile } from "./types/user";
import api from "./lib/api";
import { getSuggestionsForPage } from "./lib/suggestions";
import { Toaster, toast } from "sonner";
import { io } from "socket.io-client";
import { openFileSafely, showInFolderSafely, organizeFilesSafely } from "./lib/desktopActions";

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
const initialSuggestedPrompts = [
  "Find my largest files",
  "Explain my system performance",
  "Search my local files",
  "Summarize my recent activity",
  "Check my backup status",
];

// ─── Helper Components ────────────────────────────────────────────────────────
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl glass-card-hover ${className}`} style={{ background: "rgba(16,22,45,0.55)" }}>
      {children}
    </div>
  );
}

function MetricBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${value}%`, background: color }} />
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
      className={`relative w-10 h-5.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 active:scale-95 ${enabled ? "bg-blue-500" : "bg-white/15"}`}
      style={{ height: "22px", width: "40px" }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
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
function Dashboard({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const { user, refreshUserData } = useUser();
  const [liveMetrics, setLiveMetrics] = useState<any>({
    cpu: null,
    ram: null,
    gpu: null,
    temp: null,
    disk: 0,
    diskPercent: null,
    batteryPercent: null,
    isCharging: false,
    hasBattery: false,
    acConnected: true,
    downSpeed: 0,
    upSpeed: 0,
    networkMbps: 0,
    networkInterface: "Ethernet",
    networkStatus: "connecting",
    timestamp: null,
  });

  const [hardwareInfo, setHardwareInfo] = useState<any>({
    cpuModel: "",
    cpuCores: 0,
    gpuName: "",
    gpuVram: null,
    disks: [],
    ramTotalStr: "",
    ramUsedStr: "",
    diskTotalStr: "",
    diskUsedStr: "",
    primaryDrive: "C:",
  });

  const [dashboardStats, setDashboardStats] = useState<any>({
    totalFiles: 0,
    isScanned: false,
    storageCategories: [],
    totalStorageStr: "0 B",
    usedStorageStr: "0 B",
    freeStorageStr: "0 B",
    storagePercent: 0,
    productivityScore: null,
    hasEnoughProductivityData: false,
    weeklyProductivity: [],
    weeklyActivitiesCount: 0,
    recentActivities: [],
    recentFiles: [],
  });

  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("connecting");
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const fetchLiveMetrics = async () => {
    try {
      const res = await api.get("/monitor");
      if (res.data) {
        if (res.data.liveMetrics) setLiveMetrics(res.data.liveMetrics);
        setHardwareInfo({
          cpuModel: res.data.cpuModel || "",
          cpuCores: res.data.cpuCores || 0,
          gpuName: res.data.gpuName || "",
          gpuVram: res.data.gpuVram || null,
          disks: res.data.disks || [],
          ramTotalStr: res.data.ramTotalStr || "",
          ramUsedStr: res.data.ramUsedStr || "",
          diskTotalStr: res.data.diskTotalStr || "",
          diskUsedStr: res.data.diskUsedStr || "",
          primaryDrive: res.data.primaryDrive || "C:",
        });
        setConnectionStatus("connected");
      }
    } catch (e) {
      setConnectionStatus("disconnected");
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get("/dashboard");
      if (res.data) {
        setDashboardStats(res.data);
      }
    } catch (e) {
      console.error("Dashboard stats fetch error:", e);
    }
  };

  const fetchAiInsight = async () => {
    setLoadingInsight(true);
    try {
      const res = await api.post("/dashboard/ai-insight");
      if (res.data?.insight) {
        setAiInsight(res.data.insight);
      }
    } catch (e: any) {
      console.warn("AI insight fetch error:", e);
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => {
    fetchLiveMetrics();
    fetchDashboardStats();
    fetchAiInsight();

    const socket = io("http://localhost:5000", {
      reconnectionAttempts: 5,
      timeout: 5000,
    });

    socket.on("connect", () => {
      setConnectionStatus("connected");
      if (user?._id || user?.userId) {
        socket.emit("join", user._id || user.userId);
      }
    });

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    socket.on("connect_error", () => {
      setConnectionStatus("disconnected");
    });

    socket.on("telemetry:metrics", (data: any) => {
      if (data) {
        if (data.liveMetrics) {
          setLiveMetrics(data.liveMetrics);
        }
        setHardwareInfo((prev: any) => ({
          ...prev,
          cpuModel: data.cpuModel || prev.cpuModel,
          cpuCores: data.cpuCores || prev.cpuCores,
          gpuName: data.gpuName || prev.gpuName,
          gpuVram: data.gpuVram !== undefined ? data.gpuVram : prev.gpuVram,
          ramTotalStr: data.ramTotalStr || prev.ramTotalStr,
          ramUsedStr: data.ramUsedStr || prev.ramUsedStr,
          diskTotalStr: data.diskTotalStr || prev.diskTotalStr,
          diskUsedStr: data.diskUsedStr || prev.diskUsedStr,
          primaryDrive: data.primaryDrive || prev.primaryDrive,
          disks: data.disks || prev.disks,
        }));
        setConnectionStatus("connected");
      }
    });

    return () => {
      socket.off("telemetry:metrics");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.disconnect();
    };
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      fetchLiveMetrics(),
      fetchDashboardStats(),
      fetchAiInsight(),
      refreshUserData(),
    ]);
    setRefreshing(false);
    toast.success("Dashboard metrics refreshed");
  };

  const handleRunBackup = async () => {
    setRunningAction("backup");
    try {
      const res = await api.post("/dashboard/backup");
      if (res.data?.success) {
        toast.success(`Backup created: ${res.data.filename} (${res.data.sizeStr})`);
        fetchDashboardStats();
        refreshUserData();
      } else {
        toast.error(res.data?.message || "Backup failed");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Failed to run backup");
    } finally {
      setRunningAction(null);
    }
  };

  const handleFindDupes = async () => {
    setRunningAction("dupes");
    try {
      const res = await api.post("/dashboard/duplicates");
      if (res.data?.success) {
        if (res.data.totalDuplicates > 0) {
          toast.info(`Found ${res.data.totalDuplicates} duplicates (${res.data.wastedStr} recoverable)`);
        } else {
          toast.success("No duplicate files detected in indexed storage!");
        }
        if (onNavigate) {
          onNavigate("duplicates");
        }
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Failed to scan duplicates");
    } finally {
      setRunningAction(null);
    }
  };

  const handleCleanTemp = async () => {
    setRunningAction("clean_temp");
    try {
      const res = await api.post("/dashboard/clean-temp");
      if (res.data?.success) {
        toast.success(`Cleaned ${res.data.cleanedCount} temporary files (${res.data.cleanedStr})`);
        fetchDashboardStats();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Failed to clean temp files");
    } finally {
      setRunningAction(null);
    }
  };

  const handleTriggerScan = async () => {
    setRunningAction("scan");
    try {
      toast.info("Scanning local drives and indexing files...");
      const res = await api.post("/files/scan");
      toast.success(res.data?.message || "Scan started in background");
      setTimeout(() => {
        fetchDashboardStats();
        refreshUserData();
      }, 4000);
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Failed to trigger scan");
    } finally {
      setRunningAction(null);
    }
  };

  const currentDateString = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const hours = new Date().getHours();
  const greeting = hours < 12 ? "Good morning" : hours < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{greeting}, {getFirstName(user?.name ?? "User")}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-blue-300/70">{currentDateString}</span>
            <span className="text-gray-600">·</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected" ? "bg-emerald-400 animate-pulse" :
                connectionStatus === "connecting" ? "bg-amber-400 animate-pulse" : "bg-red-400"
              }`} />
              <span className={`text-xs font-mono ${
                connectionStatus === "connected" ? "text-emerald-400/90" :
                connectionStatus === "connecting" ? "text-amber-400/90" : "text-red-400/90"
              }`}>
                {connectionStatus === "connected" ? "Live Telemetry Active" :
                 connectionStatus === "connecting" ? "Connecting to Telemetry..." : "Backend Disconnected"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAiInsight}
            disabled={loadingInsight}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/15 border border-blue-500/20 text-blue-300 text-sm hover:bg-blue-500/25 transition-colors disabled:opacity-60"
          >
            {loadingInsight ? <Loader2 size={16} className="animate-spin text-blue-400" /> : <HelixLogo size={16} />}
            <span>AI Insights</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-blue-400" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Live Metrics Row (Top 4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "CPU",
            value: liveMetrics.cpu !== null ? `${liveMetrics.cpu}%` : "Unavailable",
            rawVal: liveMetrics.cpu ?? 0,
            sub: hardwareInfo.cpuModel ? `${hardwareInfo.cpuModel} (${hardwareInfo.cpuCores} Cores)` : "CPU Utilization",
            icon: Cpu,
            color: "#3b82f6",
            gradient: "from-blue-500/20 to-blue-600/5",
          },
          {
            label: "RAM",
            value: liveMetrics.ram !== null ? `${liveMetrics.ram}%` : "Unavailable",
            rawVal: liveMetrics.ram ?? 0,
            sub: hardwareInfo.ramUsedStr && hardwareInfo.ramTotalStr ? `${hardwareInfo.ramUsedStr} / ${hardwareInfo.ramTotalStr}` : "System Memory",
            icon: MemoryStick,
            color: "#7c3aed",
            gradient: "from-purple-500/20 to-purple-600/5",
          },
          {
            label: "GPU",
            value: liveMetrics.gpu !== null ? `${liveMetrics.gpu}%` : "N/A",
            rawVal: liveMetrics.gpu ?? 0,
            sub: hardwareInfo.gpuName ? `${hardwareInfo.gpuName}${hardwareInfo.gpuVram ? ` (${hardwareInfo.gpuVram} MB)` : ""}` : "Graphics Driver",
            icon: MonitorSpeaker,
            color: "#06b6d4",
            gradient: "from-cyan-500/20 to-cyan-600/5",
          },
          {
            label: "Storage",
            value: liveMetrics.diskPercent !== null ? `${liveMetrics.diskPercent}%` : (dashboardStats.storagePercent ? `${dashboardStats.storagePercent}%` : "Unavailable"),
            rawVal: liveMetrics.diskPercent ?? dashboardStats.storagePercent ?? 0,
            sub: hardwareInfo.diskUsedStr && hardwareInfo.diskTotalStr ? `${hardwareInfo.diskUsedStr} / ${hardwareInfo.diskTotalStr} (${hardwareInfo.primaryDrive})` : "Primary Drive",
            icon: HardDrive,
            color: "#10b981",
            gradient: "from-emerald-500/20 to-emerald-600/5",
          },
        ].map((m) => (
          <GlassCard key={m.label} className={`p-4 bg-gradient-to-br ${m.gradient}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">{m.label}</span>
              <m.icon size={16} style={{ color: m.color }} />
            </div>
            <div className="text-3xl font-bold text-white mb-1 font-mono tracking-tight">{m.value}</div>
            <p className="text-[11px] text-gray-400 truncate mb-2.5" title={m.sub}>{m.sub}</p>
            <MetricBar value={typeof m.rawVal === "number" ? Math.min(m.rawVal, 100) : 0} color={m.color} />
          </GlassCard>
        ))}
      </div>

      {/* Second metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Battery",
            value: liveMetrics.hasBattery && liveMetrics.batteryPercent !== null ? `${liveMetrics.batteryPercent}%` : "N/A",
            sub: liveMetrics.hasBattery ? (liveMetrics.isCharging ? "Charging" : "On Battery") : "AC Power (Desktop System)",
            icon: Battery,
            color: liveMetrics.hasBattery ? "text-green-400" : "text-gray-400"
          },
          {
            label: "Temperature",
            value: liveMetrics.temp !== null && liveMetrics.temp > 0 ? `${liveMetrics.temp}°C` : "N/A",
            sub: liveMetrics.temp !== null && liveMetrics.temp > 0 ? "Normal thermal range" : "Sensor unavailable on this hardware",
            icon: Thermometer,
            color: liveMetrics.temp !== null && liveMetrics.temp > 0 ? "text-amber-400" : "text-gray-400"
          },
          {
            label: "Network",
            value: `${liveMetrics.networkMbps || ((liveMetrics.downSpeed || 0) * 8).toFixed(1)} Mbps`,
            sub: `↓ ${(liveMetrics.downSpeed || 0).toFixed(2)} MB/s · ↑ ${(liveMetrics.upSpeed || 0).toFixed(2)} MB/s (${liveMetrics.networkInterface || "Ethernet"})`,
            icon: Wifi,
            color: "text-blue-400"
          },
          {
            label: "Productivity",
            value: dashboardStats.hasEnoughProductivityData && dashboardStats.productivityScore !== null ? `${dashboardStats.productivityScore}%` : "Not enough data",
            sub: dashboardStats.hasEnoughProductivityData ? `Calculated from ${dashboardStats.weeklyActivitiesCount} activities` : "Insufficient activity history",
            icon: TrendingUp,
            color: "text-purple-400"
          },
        ].map((m) => (
          <GlassCard key={m.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                <m.icon size={18} className={m.color} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 font-mono">{m.label}</p>
                <p className="text-base font-semibold text-white truncate">{m.value}</p>
                <p className="text-xs text-gray-500 truncate" title={m.sub}>{m.sub}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Productivity Chart Card */}
        <GlassCard className="p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-300">Productivity Score — This Week</h3>
              <p className="text-xs text-gray-500">Derived from genuine recorded file edits, scans, backups, and tasks</p>
            </div>
            {dashboardStats.hasEnoughProductivityData && (
              <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                Avg {dashboardStats.productivityScore}%
              </span>
            )}
          </div>
          {dashboardStats.hasEnoughProductivityData && dashboardStats.weeklyProductivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={dashboardStats.weeklyProductivity}>
                <defs>
                  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7ea8" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7ea8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" name="Score" stroke="#3b82f6" strokeWidth={2} fill="url(#pg)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
              <Activity size={24} className="text-blue-400/60 mb-2" />
              <p className="text-xs font-medium text-gray-300">Not enough activity data yet</p>
              <p className="text-[11px] text-gray-500 max-w-xs mt-0.5">
                Productivity scores will calculate automatically as you organize files, run backups, and use Helix AI.
              </p>
            </div>
          )}
        </GlassCard>

        {/* Storage Breakdown Card */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">Storage Breakdown</h3>
            {dashboardStats.isScanned && (
              <span className="text-xs font-mono text-gray-400">{dashboardStats.usedStorageStr} used</span>
            )}
          </div>
          {dashboardStats.isScanned && dashboardStats.storageCategories.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie
                    data={dashboardStats.storageCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dashboardStats.storageCategories.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {dashboardStats.storageCategories.map((s: any) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-gray-400">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 font-mono text-[11px]">{s.sizeStr}</span>
                      <span className="text-gray-300 font-mono font-medium">{s.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
              <HardDrive size={24} className="text-cyan-400/60 mb-2" />
              <p className="text-xs font-medium text-gray-300">Drive scan required</p>
              <p className="text-[11px] text-gray-500 mb-3">Index local files to calculate Documents, Media, and System categories</p>
              <button
                onClick={handleTriggerScan}
                disabled={runningAction === "scan"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium transition-colors"
              >
                {runningAction === "scan" ? <Loader2 size={12} className="animate-spin" /> : <HardDrive size={12} />}
                <span>Scan Storage Now</span>
              </button>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Recent Files + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Files */}
        <GlassCard className="p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-300">Recent Files</h3>
              <p className="text-xs text-gray-500">Actual indexed files on your computer</p>
            </div>
            {onNavigate && dashboardStats.recentFiles?.length > 0 && (
              <button onClick={() => onNavigate("files")} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                View all files →
              </button>
            )}
          </div>
          {dashboardStats.recentFiles && dashboardStats.recentFiles.length > 0 ? (
            <div className="space-y-2">
              {dashboardStats.recentFiles.slice(0, 4).map((f: any) => (
                <div
                  key={f._id || f.path}
                  onClick={() => openFileSafely(f._id, f.path)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                  title={`Click to open ${f.path}`}
                >
                  <FileIcon type={f.extension} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate group-hover:text-blue-300 transition-colors">{f.name}</p>
                    <p className="text-xs text-gray-500 truncate">{f.path} · {f.size}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {f.tags && f.tags.slice(0, 1).map((t: string) => (
                      <Badge key={t} color="blue">{t}</Badge>
                    ))}
                    <span className="text-xs text-gray-500 font-mono">
                      {new Date(f.modifiedDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
              <FolderOpen size={24} className="text-gray-500 mb-2" />
              <p className="text-xs font-medium text-gray-300">No indexed files yet</p>
              <p className="text-[11px] text-gray-500 mb-3">Scan your user directories to index local documents and media</p>
              <button
                onClick={handleTriggerScan}
                disabled={runningAction === "scan"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium transition-colors"
              >
                {runningAction === "scan" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                <span>Scan Files Now</span>
              </button>
            </div>
          )}
        </GlassCard>

        {/* Quick Actions Card */}
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleRunBackup}
              disabled={runningAction === "backup"}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left group btn-interactive hover:-translate-y-0.5"
            >
              {runningAction === "backup" ? (
                <Loader2 size={18} className="text-blue-400 animate-spin" />
              ) : (
                <CloudUpload size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
              )}
              <span className="text-xs text-gray-300 font-medium">Run Backup</span>
            </button>

            <button
              onClick={handleFindDupes}
              disabled={runningAction === "dupes"}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left group btn-interactive hover:-translate-y-0.5"
            >
              {runningAction === "dupes" ? (
                <Loader2 size={18} className="text-purple-400 animate-spin" />
              ) : (
                <Copy size={18} className="text-purple-400 group-hover:scale-110 transition-transform" />
              )}
              <span className="text-xs text-gray-300 font-medium">Find Dupes</span>
            </button>

            <button
              onClick={handleCleanTemp}
              disabled={runningAction === "clean_temp"}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left group btn-interactive hover:-translate-y-0.5"
            >
              {runningAction === "clean_temp" ? (
                <Loader2 size={18} className="text-red-400 animate-spin" />
              ) : (
                <Trash2 size={18} className="text-red-400 group-hover:scale-110 transition-transform" />
              )}
              <span className="text-xs text-gray-300 font-medium">Clean Temp</span>
            </button>

            <button
              onClick={() => onNavigate && onNavigate("assistant")}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left group btn-interactive hover:-translate-y-0.5"
            >
              <HelixLogo size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs text-gray-300 font-medium">AI Assistant</span>
            </button>

            <button
              onClick={() => onNavigate && onNavigate("monitor")}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left group"
            >
              <Zap size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-gray-300 font-medium">Monitor PC</span>
            </button>

            <button
              onClick={() => onNavigate && onNavigate("security")}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left group"
            >
              <Shield size={18} className="text-green-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs text-gray-300 font-medium">Security</span>
            </button>
          </div>
        </GlassCard>
      </div>

      {/* AI Insight Card */}
      <GlassCard className="p-5 border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
              <HelixLogo size={40} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-blue-300">Helix AI System Insight</p>
                <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded">Gemini Live</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {loadingInsight ? (
                  <span className="flex items-center gap-2 text-gray-400 animate-pulse">
                    <Loader2 size={14} className="animate-spin text-blue-400" />
                    Analyzing live hardware telemetry with Gemini...
                  </span>
                ) : (
                  aiInsight || "System telemetry analysis ready. Click below to refresh AI evaluation."
                )}
              </p>
            </div>
          </div>
          <button
            onClick={fetchAiInsight}
            disabled={loadingInsight}
            className="p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-blue-300 transition-colors flex-shrink-0"
            title="Re-analyze system with Gemini"
          >
            <RefreshCw size={14} className={loadingInsight ? "animate-spin text-blue-400" : ""} />
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

function AIAssistant({ lastVisitedPage = "assistant" }: { lastVisitedPage?: string }) {
  const { userData, updateUserData } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>(userData.chatHistory);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [selectedContext, setSelectedContext] = useState<string>(
    lastVisitedPage && lastVisitedPage !== "assistant" ? lastVisitedPage : "assistant"
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch previous conversations from backend
  const fetchConversations = async () => {
    try {
      const res = await api.get("/ai/conversations");
      if (res.data && res.data.data) {
        setConversations(res.data.data);
        if (!activeConvId && res.data.data.length > 0 && messages.length > 0) {
          setActiveConvId(res.data.data[0]._id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch conversations:", e);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (userData.chatHistory && userData.chatHistory.length > 0 && messages.length === 0) {
      setMessages(userData.chatHistory);
    }
  }, [userData.chatHistory]);

  const selectConversation = async (convId: string) => {
    try {
      const res = await api.get(`/ai/conversations/${convId}`);
      if (res.data && res.data.data && res.data.data.messages) {
        setActiveConvId(convId);
        const mapped = res.data.data.messages.map((m: any) => ({
          role: m.role,
          text: m.text || m.content,
          ts: m.ts || "Earlier",
          followUpSuggestions: m.followUpSuggestions,
          intent: m.intent,
        }));
        setMessages(mapped);
        updateUserData({ chatHistory: mapped });
        setShowHistory(false);
      }
    } catch (e) {
      toast.error("Failed to load conversation messages");
    }
  };

  const startNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    updateUserData({ chatHistory: [] });
    setShowHistory(false);
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/conversations/${convId}`);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (activeConvId === convId) {
        startNewChat();
      }
      toast.success("Conversation deleted");
    } catch (e) {
      toast.error("Failed to delete conversation");
    }
  };

  const send = async (overridePrompt?: string) => {
    const textToSend = (overridePrompt !== undefined ? overridePrompt : input).trim();
    if (!textToSend || typing) return;

    const userMsg: ChatMessage = {
      role: "user",
      text: textToSend,
      ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    updateUserData({ chatHistory: nextMessages });
    setInput("");
    setTyping(true);

    try {
      // Send conversation history and active conversationId for persistence
      const historyForApi = nextMessages.map(m => ({ role: m.role, text: m.text }));
      const res = await api.post("/ai/chat", {
        text: userMsg.text,
        conversationId: activeConvId,
        history: historyForApi,
        currentPage: selectedContext,
      });

      if (res.data.conversationId && !activeConvId) {
        setActiveConvId(res.data.conversationId);
        fetchConversations();
      }

      const resp: ChatMessage = {
        role: res.data.role || "assistant",
        text: res.data.text || res.data.answer || "No response received.",
        ts: res.data.ts || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        followUpSuggestions: res.data.followUpSuggestions,
        intent: res.data.intent,
        files: res.data.files || res.data.matchedFiles,
      };
      const withResp = [...nextMessages, resp];
      setMessages(withResp);
      updateUserData({ chatHistory: withResp });
    } catch (e: any) {
      console.error("Chat failure: ", e);
      const errorData = e.response?.data;
      let errorText = "Sorry, I couldn't get a response. ";
      if (errorData?.text) {
        errorText = errorData.text;
      } else if (errorData?.detail) {
        errorText += errorData.detail;
      } else if (errorData?.message) {
        errorText += errorData.message;
      } else {
        errorText += "Please ensure the backend services are running.";
      }
      const resp: ChatMessage = {
        role: "assistant",
        text: errorText,
        ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const withResp = [...nextMessages, resp];
      setMessages(withResp);
      updateUserData({ chatHistory: withResp });
    } finally {
      setTyping(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const dynamicSuggestions = useMemo(() => {
    return getSuggestionsForPage(selectedContext);
  }, [selectedContext]);

  // Markdown rendering components for code blocks and inline styles
  const markdownComponents = useMemo(() => ({
    code({ node, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      const isInline = !match && !String(children).includes("\n");
      if (isInline) {
        return <code className="px-1.5 py-0.5 rounded bg-white/10 text-blue-300 text-xs font-mono" {...props}>{children}</code>;
      }
      return (
        <div className="my-2 rounded-lg overflow-hidden border border-white/10">
          {match && <div className="px-3 py-1 bg-white/5 text-[10px] text-gray-500 font-mono uppercase tracking-wider border-b border-white/10">{match[1]}</div>}
          <pre className="p-3 overflow-x-auto bg-black/30"><code className="text-xs font-mono text-gray-300" {...props}>{children}</code></pre>
        </div>
      );
    },
    p({ children }: any) { return <p className="mb-2 last:mb-0">{children}</p>; },
    ul({ children }: any) { return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>; },
    ol({ children }: any) { return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>; },
    h1({ children }: any) { return <h1 className="text-lg font-bold mb-2 text-white">{children}</h1>; },
    h2({ children }: any) { return <h2 className="text-base font-semibold mb-2 text-white">{children}</h2>; },
    h3({ children }: any) { return <h3 className="text-sm font-semibold mb-1 text-white">{children}</h3>; },
    blockquote({ children }: any) { return <blockquote className="border-l-2 border-blue-500/50 pl-3 my-2 text-gray-400 italic">{children}</blockquote>; },
    a({ href, children }: any) { return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">{children}</a>; },
    strong({ children }: any) { return <strong className="font-semibold text-white">{children}</strong>; },
    table({ children }: any) { return <div className="overflow-x-auto my-2"><table className="min-w-full text-xs border border-white/10">{children}</table></div>; },
    th({ children }: any) { return <th className="px-3 py-1.5 bg-white/5 border border-white/10 text-left font-semibold text-gray-300">{children}</th>; },
    td({ children }: any) { return <td className="px-3 py-1.5 border border-white/10 text-gray-400">{children}</td>; },
  }), []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <HelixLogo size={40} className="rounded-xl" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Helix AI</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">Built-in AI</span>
            </div>
            <p className="text-xs text-green-400 flex items-center gap-1.5 mt-0.5">
              <Circle size={6} fill="#22c55e" className="fill-green-400" /> Online · Your Intelligent Desktop Companion
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              showHistory
                ? "bg-blue-600/30 text-blue-300 border-blue-500/40"
                : "bg-white/5 text-gray-400 border-white/10 hover:text-gray-200 hover:bg-white/10"
            }`}
          >
            <Clock size={13} />
            <span>History</span>
            {conversations.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-500/30 text-[10px] text-blue-200 font-mono">
                {conversations.length}
              </span>
            )}
          </button>
          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold transition-all shadow-sm"
          >
            <Plus size={13} />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Previous Conversations History Drawer */}
      {showHistory && (
        <div className="border-b border-white/[0.08] bg-black/20 p-4 max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">
              Previous Conversations ({conversations.length})
            </span>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-500 hover:text-gray-300 p-1"
            >
              <X size={14} />
            </button>
          </div>
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">No previous conversations saved yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {conversations.map((c) => (
                <div
                  key={c._id}
                  onClick={() => selectConversation(c._id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    activeConvId === c._id
                      ? "bg-blue-600/20 border-blue-500/40 text-blue-200"
                      : "bg-white/5 border-white/5 hover:bg-white/10 text-gray-300"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-medium truncate">{c.title}</p>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                      {new Date(c.lastMessageAt || c.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(c._id, e)}
                    className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Delete conversation"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-purple-600/30 border border-blue-500/30 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
              <HelixLogo size={40} className="rounded-xl" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Welcome to Helix AI</h3>
            <p className="text-xs font-mono text-blue-400 uppercase tracking-widest mb-3">Your Intelligent Desktop Companion</p>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Helix AI is the built-in AI agent of Project Helix. Ask questions about your projects, search and locate local files, check live hardware metrics, or have natural general conversations.
            </p>
            <div className="w-full space-y-2">
              <p className="text-xs text-gray-500 font-mono uppercase tracking-wider text-left mb-2">Try asking:</p>
              {[
                "Find my presentation slides",
                "How is my CPU and RAM performing right now?",
                "What features does Project Helix offer?",
                "Show my recent activity timeline",
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => send(suggestion)}
                  disabled={typing}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 text-xs text-gray-300 transition-all flex items-center justify-between group"
                >
                  <span>{suggestion}</span>
                  <ChevronRight size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 animate-message-enter ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {m.role === "assistant" && (
              <HelixLogo size={32} className="rounded-lg flex-shrink-0" />
            )}
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white/[0.06] border border-white/[0.08] text-gray-200 rounded-tl-sm"}`}>
              {m.role === "assistant" ? (
                <div>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{m.text}</ReactMarkdown>
                  
                  {/* Referenced / Found Local Files Chips */}
                  {m.files && m.files.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-blue-300 font-mono uppercase tracking-wider">
                        <FileText size={12} className="text-blue-400" />
                        <span>Matched local files ({m.files.length}):</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
                        {m.files.map((file: any, fIdx: number) => (
                          <div
                            key={fIdx}
                            className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/10 hover:border-blue-500/30 transition-all text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={14} className="text-blue-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-200 truncate">{file.name}</p>
                                <p className="text-[10px] text-gray-500 font-mono truncate">{file.path}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                              {file.size && (
                                <span className="text-[10px] text-gray-500 font-mono hidden sm:inline mr-1">
                                  {file.size}
                                </span>
                              )}
                              <button
                                onClick={() => openFileSafely(file.id || file._id, file.path)}
                                className="px-2 py-1 rounded-md bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white text-[10px] font-medium transition-colors flex items-center gap-1"
                                title="Open file with default app"
                              >
                                <ExternalLink size={10} /> Open
                              </button>
                              <button
                                onClick={() => showInFolderSafely(file.id || file._id, file.path)}
                                className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white text-[10px] font-medium transition-colors flex items-center gap-1"
                                title="Reveal containing folder"
                              >
                                <FolderOpen size={10} /> Folder
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Context-Aware Follow-Up Suggestions */}
                  {m.followUpSuggestions && m.followUpSuggestions.length > 0 && i === messages.length - 1 && (
                    <div className="mt-3 pt-2.5 border-t border-white/10">
                      <div className="flex items-center gap-1.5 text-[11px] text-blue-300 font-mono uppercase tracking-wider mb-2">
                        <Sparkles size={12} className="text-blue-400" />
                        <span>Recommended next steps:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.followUpSuggestions.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => send(s)}
                            disabled={typing}
                            className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 border border-blue-500/30 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                m.text
              )}
              <p className="text-xs opacity-50 mt-1 font-mono">{m.ts}</p>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-3">
            <HelixLogo size={32} className="rounded-lg flex-shrink-0" />
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

      {/* Dynamic Context-Aware Suggestions */}
      <div className="px-6 py-2.5 border-t border-white/[0.06] bg-white/[0.01]">
        <div className="flex items-center gap-2 mb-2 overflow-x-auto scrollbar-hide">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider flex-shrink-0">Context:</span>
          {[
            { id: "assistant", label: "Helix AI" },
            { id: "files", label: "Files" },
            { id: "monitor", label: "Monitor" },
            { id: "automation", label: "Automation" },
            { id: "security", label: "Security" },
            { id: "backup", label: "Backup" },
            { id: "timeline", label: "Timeline" },
            { id: "duplicates", label: "Duplicates" },
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedContext(c.id)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedContext === c.id
                  ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                  : "bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {dynamicSuggestions.map((p, idx) => (
            <button
              key={idx}
              onClick={() => send(p)}
              disabled={typing}
              className="flex-shrink-0 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-6 pb-6 pt-2">
        <div className="flex gap-3 items-end p-3 rounded-2xl border border-white/10 bg-white/5">
          <button className="p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors">
            <Paperclip size={16} />
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask Helix AI anything — Project questions, local files, system metrics, or general topics..."
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 resize-none outline-none min-h-[36px] max-h-[120px]"
            rows={1}
          />
          <button className="p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors">
            <Mic size={16} />
          </button>
          <button onClick={() => send()} disabled={typing} className={`p-2 rounded-xl transition-colors ${typing ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"} text-white`}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SmartFileManager() {
  const [files, setFiles] = useState<any[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [selected, setSelected] = useState<string | null>(null);
  const [indexing, setIndexing] = useState<boolean>(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["Home", "Documents"]));

  // Confirmation modal states
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string; path: string } | null>(null);
  const [fileToRename, setFileToRename] = useState<{ id: string; oldName: string } | null>(null);
  const [renameInput, setRenameInput] = useState<string>("");
  const [organizeModalOpen, setOrganizeModalOpen] = useState<boolean>(false);
  const [organizeTarget, setOrganizeTarget] = useState<string>("Documents");
  const [targetFileForOrganize, setTargetFileForOrganize] = useState<{ id: string; name: string; path: string } | null>(null);
  const [organizePreview, setOrganizePreview] = useState<any[] | null>(null);
  const [isOrganizing, setIsOrganizing] = useState<boolean>(false);

  // Fetch files on filter change
  const fetchFiles = async () => {
    try {
      const params: any = {};
      if (category && category !== "all") params.category = category;
      if (searchQuery) params.search = searchQuery;
      if (favoritesOnly) params.favorite = "true";

      const res = await api.get("/files", { params });
      setFiles(res.data);
    } catch (err) {
      console.error("Failed to load files metadata:", err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [category, searchQuery, favoritesOnly]);

  const handleTriggerScan = async () => {
    setIndexing(true);
    toast.info("Triggered file scanner in background...");
    try {
      await api.post("/files/scan");
      setTimeout(() => {
        setIndexing(false);
        fetchFiles();
        toast.success("Folder scan complete! File database updated.");
      }, 4000);
    } catch (err) {
      setIndexing(false);
      toast.error("Failed to trigger local file scanner.");
    }
  };

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/files/${id}/favorite`);
      setFiles(prev => prev.map(f => f._id === id ? { ...f, favorite: res.data.favorite } : f));
      toast.success(res.data.favorite ? "Added to favorites" : "Removed from favorites");
    } catch (err) {
      toast.error("Failed to update favorite status");
    }
  };

  // Safe file delete with confirmation
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      await api.delete(`/files/${fileToDelete.id}`, { data: { confirm: true } });
      setFiles(prev => prev.filter(f => f._id !== fileToDelete.id));
      if (selected === fileToDelete.name) {
        setSelected(null);
      }
      toast.success(`Deleted file: ${fileToDelete.name}`);
      setFileToDelete(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete file");
    }
  };

  // Safe file rename with confirmation
  const confirmRenameFile = async () => {
    if (!fileToRename || !renameInput.trim()) return;
    try {
      const res = await api.put(`/files/${fileToRename.id}/rename`, {
        newName: renameInput.trim(),
        confirm: true,
      });
      setFiles(prev => prev.map(f => f._id === fileToRename.id ? { ...f, name: res.data.name, path: res.data.path, extension: res.data.extension } : f));
      if (selected === fileToRename.oldName) {
        setSelected(res.data.name);
      }
      toast.success(`Renamed to: ${res.data.name}`);
      setFileToRename(null);
      setRenameInput("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to rename file");
    }
  };

  // Open organize dialog
  const openOrganizeDialog = (file?: { _id: string; name: string; path: string }) => {
    if (file) {
      setTargetFileForOrganize({ id: file._id, name: file.name, path: file.path });
    } else if (selFile) {
      setTargetFileForOrganize({ id: selFile._id, name: selFile.name, path: selFile.path });
    } else {
      setTargetFileForOrganize(null);
    }
    setOrganizePreview(null);
    setOrganizeModalOpen(true);
  };

  // Preview or confirm organize files
  const handleOrganizeAction = async (confirm = false) => {
    const ids = targetFileForOrganize ? [targetFileForOrganize.id] : files.slice(0, 10).map(f => f._id);
    if (ids.length === 0) {
      toast.error("No files selected to organize.");
      return;
    }

    // Resolve target path
    let targetPath = organizeTarget;
    // Map friendly presets to standard user paths
    const homeDir = "C:\\Users\\Niaa";
    if (organizeTarget === "Documents") targetPath = `${homeDir}\\Documents`;
    else if (organizeTarget === "Downloads") targetPath = `${homeDir}\\Downloads`;
    else if (organizeTarget === "Desktop") targetPath = `${homeDir}\\Desktop`;
    else if (organizeTarget === "Pictures") targetPath = `${homeDir}\\Pictures`;

    setIsOrganizing(true);
    try {
      const res = await organizeFilesSafely(ids, targetPath, confirm);
      if (res.requiresConfirmation) {
        setOrganizePreview(res.preview || []);
      } else if (res.success) {
        toast.success(res.message || "Files successfully organized!");
        setOrganizeModalOpen(false);
        setOrganizePreview(null);
        fetchFiles();
      }
    } finally {
      setIsOrganizing(false);
    }
  };

  const toggleFolder = (name: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

    if (name === "Home") setCategory("all");
    if (name === "Documents" || name === "University" || name === "Work") setCategory("documents");
    if (name === "Downloads") setCategory("downloads");
    if (name === "Pictures") setCategory("photos");
    if (name === "Videos") setCategory("videos");
  };

  const TreeNode = ({ node, depth = 0 }: { node: any; depth?: number }) => {
    const expanded = expandedFolders.has(node.name);
    const hasChildren = node.children?.length > 0;
    return (
      <div>
        <button
          onClick={() => {
            if (hasChildren) toggleFolder(node.name);
            else toggleFolder(node.name);
          }}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left transition-colors`}
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

  const selFile = files.find(f => f.name === selected);

  return (
    <div className="flex h-full relative">
      {/* Folder Tree */}
      <div className="w-56 flex-shrink-0 border-r border-white/[0.06] p-3 overflow-y-auto">
        <p className="text-xs text-gray-600 font-mono uppercase tracking-wider px-2 mb-2">Explorer</p>
        {folderTree.map(node => <TreeNode key={node.name} node={node} />)}
        <div className="mt-4">
          <p className="text-xs text-gray-600 font-mono uppercase tracking-wider px-2 mb-2">Favorites</p>
          {[
            { name: "All Files", icon: Home, cat: "all" },
            { name: "Downloads", icon: Download, cat: "downloads" },
            { name: "Pictures", icon: Image, cat: "photos" },
            { name: "Documents", icon: FileText, cat: "documents" }
          ].map(f => (
            <button
              key={f.name}
              onClick={() => { setCategory(f.cat); setFavoritesOnly(false); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left transition-colors ${category === f.cat && !favoritesOnly ? "bg-white/5" : ""}`}
            >
              <Star size={12} className={category === f.cat ? "text-amber-400 fill-amber-400" : "text-gray-500"} />
              <f.icon size={14} className="text-gray-400" />
              <span className="text-xs text-gray-400">{f.name}</span>
            </button>
          ))}
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 mt-1 rounded-lg hover:bg-white/5 text-left transition-colors ${favoritesOnly ? "bg-white/5" : ""}`}
          >
            <Star size={12} className="text-amber-400 fill-amber-400" />
            <span className="text-xs text-gray-400">Starred Only</span>
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-1.5 flex-1">
            <span className="text-xs text-gray-600">Computer</span>
            <ChevronRight size={12} className="text-gray-700" />
            <span className="text-xs text-gray-400 font-medium capitalize">{category === "all" ? "All Files" : category}</span>
            <input
              type="text"
              placeholder="Search in folder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ml-4 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-gray-300 placeholder-gray-600 outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openOrganizeDialog()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 border border-purple-500/40 hover:bg-purple-600 text-purple-200 hover:text-white text-xs font-semibold transition-colors"
            >
              <FolderPlus size={12} />
              Organize
            </button>
            <button
              onClick={handleTriggerScan}
              disabled={indexing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold transition-colors disabled:opacity-60"
            >
              <RefreshCw size={12} className={indexing ? "animate-spin" : ""} />
              {indexing ? "Scanning..." : "Scan Local Files"}
            </button>
            <div className="flex bg-white/5 rounded-lg p-0.5">
              <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-blue-500/20 text-blue-300" : "text-gray-500"}`}><List size={14} /></button>
              <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-blue-500/20 text-blue-300" : "text-gray-500"}`}><Grid size={14} /></button>
            </div>
          </div>
        </div>

        {/* Files */}
        <div className="flex-1 overflow-y-auto p-4">
          {files.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
              <Folder size={32} className="text-gray-600" />
              <p className="text-sm">No files indexed in this category.</p>
              <button onClick={handleTriggerScan} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors">Scan Desktop Directories</button>
            </div>
          ) : view === "list" ? (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_80px_100px_90px_130px] gap-2 px-3 py-1 text-xs text-gray-600 font-mono uppercase tracking-wider border-b border-white/5 mb-2">
                <span>Name</span><span>Size</span><span>Tags</span><span>Modified</span><span>Actions</span>
              </div>
              {files.map(f => (
                <div key={f._id} onClick={() => setSelected(f.name === selected ? null : f.name)} className={`grid grid-cols-[1fr_80px_100px_90px_130px] gap-2 items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all ${selected === f.name ? "bg-blue-500/15 border border-blue-500/20" : "hover:bg-white/5 border border-transparent"}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileIcon type={f.type} />
                    <span className="text-sm text-gray-200 truncate" title={f.path}>{f.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{f.size}</span>
                  <div className="flex gap-1 overflow-hidden">{f.tags.slice(0, 2).map((t: string) => <Badge key={t} color="blue">{t}</Badge>)}</div>
                  <span className="text-xs text-gray-500 font-mono">{f.modified}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openFileSafely(f._id, f.path); }}
                      className="p-1 rounded-md hover:bg-blue-500/20 text-gray-400 hover:text-blue-300 transition-colors"
                      title="Open file in default application"
                    >
                      <ExternalLink size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); showInFolderSafely(f._id, f.path); }}
                      className="p-1 rounded-md hover:bg-blue-500/20 text-gray-400 hover:text-blue-300 transition-colors"
                      title="Reveal in folder"
                    >
                      <FolderOpen size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openOrganizeDialog({ _id: f._id, name: f.name, path: f.path }); }}
                      className="p-1 rounded-md hover:bg-purple-500/20 text-gray-400 hover:text-purple-300 transition-colors"
                      title="Organize into folder"
                    >
                      <FolderPlus size={13} />
                    </button>
                    <button
                      onClick={(e) => handleToggleFavorite(f._id, e)}
                      className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-amber-400 transition-colors"
                      title="Toggle favorite"
                    >
                      <Star size={13} className={f.favorite ? "text-amber-400 fill-amber-400" : ""} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFileToRename({ id: f._id, oldName: f.name }); setRenameInput(f.name); }}
                      className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
                      title="Rename file"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFileToDelete({ id: f._id, name: f.name, path: f.path }); }}
                      className="p-1 rounded-md hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-colors"
                      title="Delete file"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
              {files.map(f => (
                <div key={f._id} onClick={() => setSelected(f.name === selected ? null : f.name)} className={`p-4 rounded-2xl cursor-pointer transition-all border ${selected === f.name ? "bg-blue-500/15 border-blue-500/20" : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06]"}`}>
                  <div className="flex justify-between items-start mb-2">
                    <FileIcon type={f.type} />
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); openFileSafely(f._id, f.path); }} className="text-gray-500 hover:text-blue-300 p-0.5" title="Open file">
                        <ExternalLink size={12} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); showInFolderSafely(f._id, f.path); }} className="text-gray-500 hover:text-blue-300 p-0.5" title="Reveal in folder">
                        <FolderOpen size={12} />
                      </button>
                      <button onClick={(e) => handleToggleFavorite(f._id, e)} className="text-gray-500 hover:text-amber-400 p-0.5">
                        <Star size={12} className={f.favorite ? "text-amber-400 fill-amber-400" : ""} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-200 mt-2 mb-1 truncate" title={f.path}>{f.name}</p>
                  <p className="text-xs text-gray-600 font-mono">{f.size}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      {selFile && (
        <div className="w-80 flex-shrink-0 border-l border-white/[0.06] p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">File Details</h3>
            <button onClick={() => setSelected(null)} className="p-1 hover:bg-white/10 rounded-md text-gray-500 hover:text-gray-300 transition-colors"><X size={14} /></button>
          </div>
          <div className="w-full h-32 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/5 flex items-center justify-center mb-4">
            <FileIcon type={selFile.type} />
          </div>
          <h4 className="text-sm font-medium text-gray-200 mb-1 truncate" title={selFile.name}>{selFile.name}</h4>
          <p className="text-xs text-gray-500 mb-3 break-all font-mono">{selFile.path}</p>
          <div className="space-y-2">
            {[["Size", selFile.size], ["Modified", selFile.modified], ["Type", selFile.type.toUpperCase()]].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-300 font-mono">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2 font-mono uppercase tracking-wider">AI Tags</p>
            <div className="flex flex-wrap gap-1">
              {selFile.tags.map((t: string) => <Badge key={t} color="purple">{t}</Badge>)}
              <Badge color="cyan">indexed</Badge>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => openFileSafely(selFile._id, selFile.path)}
              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20"
            >
              <ExternalLink size={13} /> Open File
            </button>
            <button
              onClick={() => showInFolderSafely(selFile._id, selFile.path)}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <FolderOpen size={13} /> Show in Folder
            </button>
            <button
              onClick={() => openOrganizeDialog({ _id: selFile._id, name: selFile.name, path: selFile.path })}
              className="w-full py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <FolderPlus size={13} /> Organize File
            </button>
            <button
              onClick={() => { setFileToRename({ id: selFile._id, oldName: selFile.name }); setRenameInput(selFile.name); }}
              className="w-full py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors"
            >
              Rename File
            </button>
            <button
              onClick={() => setFileToDelete({ id: selFile._id, name: selFile.name, path: selFile.path })}
              className="w-full py-2 rounded-xl bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 text-red-300 text-xs font-medium transition-colors"
            >
              Delete File
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <GlassCard className="max-w-md w-full p-6 border-red-500/30 bg-[#080d1e] shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm File Deletion</h3>
                <p className="text-xs text-gray-400">Permanent disk removal confirmation</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <p className="text-xs font-medium text-gray-200 truncate">{fileToDelete.name}</p>
              <p className="text-[10px] text-gray-500 font-mono break-all">{fileToDelete.path}</p>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Are you sure you want to permanently delete this file from your computer? This operation cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFile}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={13} /> Delete File
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Rename Confirmation Modal */}
      {fileToRename && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <GlassCard className="max-w-md w-full p-6 border-blue-500/30 bg-[#080d1e] shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-blue-400">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <RefreshCw size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Rename File</h3>
                <p className="text-xs text-gray-400">Validate and confirm new file name</p>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">New File Name (including extension):</label>
              <input
                type="text"
                value={renameInput}
                onChange={e => setRenameInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 font-mono"
                placeholder="example.pdf"
              />
            </div>
            <p className="text-[11px] text-gray-500">
              Special characters such as slashes or traversal dots ("..") are prohibited for filesystem safety.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setFileToRename(null); setRenameInput(""); }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRenameFile}
                disabled={!renameInput.trim() || renameInput.trim() === fileToRename.oldName}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Confirm Rename
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Organize Files Confirmation Modal */}
      {organizeModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <GlassCard className="max-w-lg w-full p-6 border-purple-500/30 bg-[#080d1e] shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-purple-400">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <FolderPlus size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Organize Files</h3>
                <p className="text-xs text-gray-400">Select target folder and confirm file relocation</p>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1.5 font-medium">Target Destination Folder:</label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {["Documents", "Downloads", "Desktop", "Pictures"].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => { setOrganizeTarget(preset); setOrganizePreview(null); }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                      organizeTarget === preset
                        ? "bg-purple-600 text-white"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={organizeTarget}
                onChange={e => { setOrganizeTarget(e.target.value); setOrganizePreview(null); }}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-200 focus:outline-none focus:border-purple-500/50 font-mono"
                placeholder="Target path or folder name"
              />
            </div>

            {targetFileForOrganize ? (
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <p className="text-xs text-gray-400">Selected File:</p>
                <p className="text-xs font-semibold text-gray-200 truncate">{targetFileForOrganize.name}</p>
                <p className="text-[10px] text-gray-500 font-mono truncate">{targetFileForOrganize.path}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Will organize active files into '{organizeTarget}'.
              </p>
            )}

            {organizePreview && organizePreview.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto p-3 rounded-xl bg-black/40 border border-white/10">
                <p className="text-[11px] font-mono uppercase tracking-wider text-purple-300 mb-1">Move Preview ({organizePreview.length} files):</p>
                {organizePreview.map((item, idx) => (
                  <div key={idx} className="text-xs text-gray-300 flex items-center justify-between py-0.5 border-b border-white/5">
                    <span className="truncate max-w-[180px] font-medium">{item.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono truncate max-w-[200px]">→ {item.destinationPath}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              {!organizePreview ? (
                <button
                  type="button"
                  onClick={() => handleOrganizeAction(false)}
                  disabled={isOrganizing}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isOrganizing ? "Evaluating..." : "Check Preview"}
                </button>
              ) : <div />}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setOrganizeModalOpen(false); setOrganizePreview(null); }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleOrganizeAction(true)}
                  disabled={isOrganizing}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <FolderPlus size={13} /> Confirm & Move
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function SemanticSearch() {
  const { userData, updateUserData } = useUser();
  const [query, setQuery] = useState(userData.searchQuery);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  const fetchSearchHistory = async () => {
    try {
      const res = await api.get("/ai/search/history");
      if (res.data && res.data.data) {
        setRecentSearches(res.data.data);
      }
    } catch (e) {
      console.error("Failed to load search history:", e);
    }
  };

  useEffect(() => {
    fetchSearchHistory();
  }, []);

  useEffect(() => {
    setQuery(userData.searchQuery);
  }, [userData.searchQuery]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    updateUserData({ searchQuery: value });
  };

  const performSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await api.post("/ai/search", { query: q });
      setResults(res.data.results.map((r: any) => ({
        name: r.name,
        relevance: Math.max(10, Math.min(99, Math.round((r.score > 1 ? r.score / 100 : r.score) * 100))),
        type: r.name.substring(r.name.lastIndexOf(".") + 1),
        path: r.path,
        preview: r.snippet,
        tags: ["study", "notes"],
      })));
      setSearched(true);
      fetchSearchHistory();
    } catch (err) {
      console.error(err);
      toast.error("Failed to query semantic search AI.");
    } finally {
      setSearching(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.delete("/ai/search/history");
      setRecentSearches([]);
      toast.success("Search history cleared");
    } catch (err) {
      toast.error("Failed to clear search history");
    }
  };

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
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && performSearch()}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
            placeholder='Try "Find my DBMS PPT" or "photos from July"...'
          />
          {query && <button onClick={() => { handleQueryChange(""); setSearched(false); setResults([]); }} className="text-gray-600 hover:text-gray-400"><X size={14} /></button>}
        </div>
        <button onClick={() => performSearch()} disabled={searching} className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-60">
          {searching ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Recent Searches History Chips */}
      {recentSearches.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
          <span className="text-gray-500 font-mono uppercase tracking-wider flex items-center gap-1">
            <Clock size={12} /> Recent Searches:
          </span>
          {recentSearches.slice(0, 8).map((s) => (
            <button
              key={s._id}
              onClick={() => {
                handleQueryChange(s.query);
                performSearch(s.query);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-blue-500/15 text-gray-300 hover:text-blue-200 border border-white/5 hover:border-blue-500/30 transition-all text-xs"
            >
              {s.query}
            </button>
          ))}
          <button
            onClick={handleClearHistory}
            className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors ml-1"
            title="Clear all search history"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

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
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><HelixLogo size={16} /> Related Searches</h3>
            <div className="flex flex-wrap gap-2">
              {["database assignment", "SQL notes 2025", "university study materials", "normalization diagrams", "ERD templates"].map(s => (
                <button key={s} onClick={() => { handleQueryChange(s); setSearched(true); }} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-all">
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
  const { userData, refreshUserData } = useUser();
  const timelineItems = userData.timelineItems;
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const categories = ["all", "file", "download", "meeting", "screenshot", "project", "backup", "security", "search"];
  const grouped: Record<string, typeof timelineItems> = {};

  const handleClearTimeline = async () => {
    try {
      await api.delete("/activities");
      await refreshUserData();
      toast.success("Activity timeline cleared");
    } catch (e) {
      toast.error("Failed to clear timeline");
    }
  };

  timelineItems
    .filter(i => filter === "all" || i.type === filter)
    .filter(i => !searchTerm || i.label.toLowerCase().includes(searchTerm.toLowerCase()))
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
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-blue-500/50"
            placeholder="Search timeline..."
          />
          <button
            onClick={() => refreshUserData()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
            title="Refresh timeline"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={handleClearTimeline}
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/15 border border-white/10 text-gray-400 hover:text-red-400 transition-colors"
            title="Clear timeline"
          >
            <Trash2 size={15} />
          </button>
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
        {Object.entries(grouped).length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No activity events recorded yet. Perform actions like chats, file operations, or searches to populate your timeline.
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">{new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
                <div className="flex-1 h-px bg-white/5" />
                <Badge color="blue">{items.length} events</Badge>
              </div>
              <div className="space-y-2 pl-2 border-l border-white/[0.06]">
                {items.map((item, i) => {
                  const Icon = getTimelineIcon(item.iconType);
                  return (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer ml-3">
                    <div className={`w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 ${item.color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300">{item.label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-600 font-mono capitalize">{item.type}</span>
                        {(item as any).status && (
                          <Badge color={(item as any).status === "completed" ? "green" : "blue"}>
                            {(item as any).status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 font-mono flex-shrink-0">{item.time}</span>
                  </div>
                );})}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AutomationCenter() {
  const { userData, updateUserData } = useUser();
  const toggles = userData.automationToggles;
  const [dbAutomations, setDbAutomations] = useState<any[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);

  // New automation modal state
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newActionType, setNewActionType] = useState("organize_downloads");
  const [newSchedule, setNewSchedule] = useState("Every 2 hours");

  const fetchAutomations = async () => {
    try {
      const res = await api.get("/automations");
      setDbAutomations(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const setToggle = async (id: number, dbId: string, enabledState: boolean) => {
    updateUserData({
      automationToggles: { ...toggles, [id]: !enabledState },
    });
    setDbAutomations(prev => prev.map(a => a._id === dbId ? { ...a, enabled: !enabledState } : a));

    try {
      await api.put(`/automations/${dbId}`, { enabled: !enabledState });
      toast.success("Automation rule updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update automation rule");
      updateUserData({
        automationToggles: { ...toggles, [id]: enabledState },
      });
      fetchAutomations();
    }
  };

  const handleRunNow = async (dbId: string) => {
    setRunningId(dbId);
    try {
      const res = await api.post(`/automations/${dbId}/run`);
      if (res.data?.success) {
        toast.success(res.data.message || "Automation task executed successfully");
      }
      fetchAutomations();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Task execution failed";
      toast.error(msg);
      fetchAutomations();
    } finally {
      setRunningId(null);
    }
  };

  const handleCreateAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) {
      toast.error("Title and description are required.");
      return;
    }

    try {
      const actionIcons: Record<string, string> = {
        scan_directory: "Zap",
        organize_downloads: "FolderPlus",
        cleanup_temp: "Trash2",
        backup_index: "CloudUpload",
        duplicate_check: "Copy",
      };

      const res = await api.post("/automations", {
        title: newTitle.trim(),
        desc: newDesc.trim(),
        actionType: newActionType,
        schedule: newSchedule,
        icon: actionIcons[newActionType] || "Zap",
        enabled: true,
      });

      if (res.data) {
        toast.success(`Created automation: ${res.data.title}`);
        setNewModalOpen(false);
        setNewTitle("");
        setNewDesc("");
        fetchAutomations();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create automation");
    }
  };

  const iconMap: Record<string, any> = {
    FolderPlus,
    CloudUpload,
    Copy,
    Trash2,
    Zap,
    Image,
    RefreshCw,
  };

  return (
    <div className="p-6 space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Automation Center</h2>
          <p className="text-sm text-gray-500">
            {dbAutomations.filter(a => a.enabled).length} active · Functional desktop automation tasks
          </p>
        </div>
        <button
          onClick={() => setNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
        >
          <Plus size={14} /> New Automation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {dbAutomations.map((card, idx) => {
          const cardId = idx + 1;
          const IconComp = iconMap[card.icon] || Zap;
          const isRunning = runningId === card._id || card.lastStatus === "running";

          return (
            <GlassCard key={card._id} className={`p-5 transition-all ${card.enabled ? "border-blue-500/20" : "border-white/5 opacity-80"}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.enabled ? "bg-blue-500/20" : "bg-white/5"}`}>
                  <IconComp size={18} className={card.enabled ? "text-blue-400" : "text-gray-500"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-200 truncate">{card.title}</h3>
                      {card.lastStatus === "success" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle size={10} /> Success
                        </span>
                      )}
                      {card.lastStatus === "failed" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1" title={card.lastError || "Failed"}>
                          <AlertTriangle size={10} /> Failed
                        </span>
                      )}
                      {isRunning && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 animate-pulse">
                          <RefreshCw size={10} className="animate-spin" /> Running
                        </span>
                      )}
                    </div>
                    <ToggleSwitch enabled={card.enabled} onChange={() => setToggle(cardId, card._id, card.enabled)} />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-3">{card.desc}</p>

                  {card.lastError && (
                    <div className="p-2 mb-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-300">
                      Error: {card.lastError}
                    </div>
                  )}

                  {card.lastResult?.message && !card.lastError && (
                    <div className="p-2 mb-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                      {card.lastResult.message}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 font-mono">
                      <span>Schedule: {card.schedule || "Hourly"}</span>
                      <span>· {card.runs || 0} runs</span>
                      <span>· {card.lastRun || "Never"}</span>
                    </div>
                    <button
                      onClick={() => handleRunNow(card._id)}
                      disabled={isRunning}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      <Play size={11} className={isRunning ? "animate-spin" : ""} />
                      {isRunning ? "Running..." : "Run Now"}
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Supported Automation Tasks</h3>
        <div className="space-y-3">
          {[
            { task: "Auto-Organize Downloads", action: "organize_downloads", schedule: "Sorts incoming downloaded files into Documents, Media, Archives", next: "Ready" },
            { task: "Index Backup Snapshot", action: "backup_index", schedule: "Generates verified local JSON archive of files and metadata", next: "Ready" },
            { task: "SHA-256 Duplicate Check", action: "duplicate_check", schedule: "Scans indexed files for byte-identical duplicate hashes", next: "Ready" },
            { task: "Temporary Cache Cleanup", action: "cleanup_temp", schedule: "Safely purges stale temporary files older than 24 hours", next: "Ready" },
            { task: "Local Directory Scanner", action: "scan_directory", schedule: "Indexes user folders and generates semantic search embeddings", next: "Ready" },
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
              <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-200 font-medium">{t.task}</p>
                <p className="text-xs text-gray-500 font-mono">{t.schedule}</p>
              </div>
              <div className="text-right">
                <Badge color="blue">{t.next}</Badge>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* New Automation Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <GlassCard className="max-w-md w-full p-6 border-blue-500/30 bg-[#080d1e] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create New Automation</h3>
              <button onClick={() => setNewModalOpen(false)} className="p-1 hover:bg-white/10 rounded-md text-gray-400">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleCreateAutomation} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Task Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Daily Temp Sweep"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Description</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Describe what this automation does..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50 resize-none"
                  rows={2}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Supported Action</label>
                <select
                  value={newActionType}
                  onChange={e => setNewActionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1630] border border-white/10 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50"
                >
                  <option value="organize_downloads">Auto-Organize Downloads Folder</option>
                  <option value="cleanup_temp">Clean Temporary Files</option>
                  <option value="backup_index">Backup File Index Snapshot</option>
                  <option value="scan_directory">Scan & Index Local Folders</option>
                  <option value="duplicate_check">Run SHA-256 Duplicate Check</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Schedule Frequency</label>
                <select
                  value={newSchedule}
                  onChange={e => setNewSchedule(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1630] border border-white/10 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50"
                >
                  <option value="Hourly">Hourly</option>
                  <option value="Every 2 hours">Every 2 hours</option>
                  <option value="Every 6 hours">Every 6 hours</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20"
                >
                  Create Task
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function SystemMonitor() {
  const [liveMetrics, setLiveMetrics] = useState<any>({
    cpu: 25,
    ram: 58,
    gpu: 18,
    temp: null,
    disk: 0,
    diskPercent: 48,
    batteryPercent: null,
    isCharging: false,
    hasBattery: false,
    downSpeed: 0,
    upSpeed: 0,
    timestamp: new Date().toISOString(),
  });
  const [gpuName, setGpuName] = useState("Integrated Graphics");
  const [processes, setProcesses] = useState<any[]>([]);

  const [cpuHistory, setCpuHistory] = useState<any[]>(
    Array.from({ length: 20 }, (_, i) => ({ t: i, v: 0 }))
  );
  const [ramHistory, setRamHistory] = useState<any[]>(
    Array.from({ length: 20 }, (_, i) => ({ t: i, v: 0 }))
  );
  const [netHistory, setNetHistory] = useState<any[]>(
    Array.from({ length: 20 }, (_, i) => ({ t: i, down: 0, up: 0 }))
  );

  useEffect(() => {
    // Initial fetch
    api.get("/monitor").then(res => {
      if (res.data?.liveMetrics) {
        setLiveMetrics(res.data.liveMetrics);
        if (res.data.gpuName) setGpuName(res.data.gpuName);
        if (res.data.processes) setProcesses(res.data.processes);
      }
    }).catch(() => {});

    let tickCount = 20;
    const socket = io("http://localhost:5000");

    socket.on("telemetry:metrics", (data) => {
      const { liveMetrics: live, gpuName: gName, processes: procs } = data;

      if (live) setLiveMetrics(live);
      if (gName) setGpuName(gName);
      if (procs) setProcesses(procs);

      if (live) {
        setCpuHistory(prev => [...prev.slice(1), { t: tickCount, v: live.cpu || 0 }]);
        setRamHistory(prev => [...prev.slice(1), { t: tickCount, v: live.ram || 0 }]);
        setNetHistory(prev => [...prev.slice(1), { t: tickCount, down: live.downSpeed || 0, up: live.upSpeed || 0 }]);
      }

      tickCount++;
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const formattedTime = liveMetrics.timestamp
    ? new Date(liveMetrics.timestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">System Monitor</h2>
          <p className="text-sm text-gray-500">Live performance telemetry · {gpuName} · Last updated: {formattedTime}</p>
        </div>
        <Badge color="green"><Circle size={6} fill="#22c55e" className="mr-1 fill-green-400 inline" /> Live</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "CPU", value: liveMetrics.cpu, unit: "%", color: "#3b82f6" },
          { label: "RAM", value: liveMetrics.ram, unit: "%", color: "#7c3aed" },
          { label: "GPU", value: liveMetrics.gpu, unit: "%", color: "#06b6d4" },
          {
            label: "Temp",
            value: liveMetrics.temp !== null && liveMetrics.temp > 0 ? liveMetrics.temp : "N/A",
            unit: liveMetrics.temp !== null && liveMetrics.temp > 0 ? "°C" : "",
            color: "#f59e0b"
          },
          { label: "Disk I/O", value: liveMetrics.disk, unit: " MB/s", color: "#10b981" },
        ].map(m => (
          <GlassCard key={m.label} className="p-4 text-center">
            <p className="text-xs text-gray-600 font-mono uppercase mb-2">{m.label}</p>
            <div className="text-2xl font-bold font-mono" style={{ color: m.color }}>{m.value}<span className="text-sm text-gray-500">{m.unit}</span></div>
            <MetricBar value={typeof m.value === "number" ? Math.min(m.value, 100) : 0} color={m.color} />
          </GlassCard>
        ))}
      </div>

      {/* Battery and Power Hardware Status */}
      <GlassCard className="p-4 flex items-center justify-between border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Battery size={20} className={liveMetrics.hasBattery ? "text-green-400" : "text-gray-400"} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-mono">Battery / Power</p>
            <p className="text-base font-semibold text-white">
              {liveMetrics.hasBattery && liveMetrics.batteryPercent !== null ? `${liveMetrics.batteryPercent}%` : "N/A"}
            </p>
            <p className="text-xs text-gray-500">
              {liveMetrics.hasBattery ? (liveMetrics.isCharging ? "Charging" : "Discharging") : "AC Power (Desktop System)"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-500 font-mono">
            Sensor telemetry: {liveMetrics.temp !== null && liveMetrics.temp > 0 ? `${liveMetrics.temp}°C thermal active` : "Thermal sensors N/A"}
          </span>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { label: "CPU Usage", data: cpuHistory, key: "v", color: "#3b82f6" },
          { label: "RAM Usage", data: ramHistory, key: "v", color: "#7c3aed" },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Network Activity</h3>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={netHistory}>
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
        </div>

        <div>
          <GlassCard className="p-5 h-full overflow-hidden flex flex-col">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex-shrink-0">Top Processes</h3>
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[120px]">
              {processes && processes.length > 0 ? (
                processes.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-xs font-mono py-1 border-b border-white/5">
                    <span className="text-gray-400 truncate max-w-[100px]" title={p.name}>{p.name}</span>
                    <span className="text-gray-500">PID: {p.pid}</span>
                    <span className="text-blue-400 font-semibold">{p.cpu}% CPU</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-600 text-center py-4">No active processes</div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      <GlassCard className="p-5 border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-4">
          <HelixLogo size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-300 mb-1">AI Recommendations</p>
            <ul className="text-sm text-gray-400 space-y-1.5">
              <li>· Real hardware metrics verified through Node.js system telemetry.</li>
              <li>· Unavailable sensors accurately reported as N/A rather than simulated zeros.</li>
              <li>· Automated background sweeps can be configured and triggered on-demand in Automation Center.</li>
            </ul>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function DuplicateFinder() {
  const [groups, setGroups] = useState<any[]>([]);
  const [totalWastedStr, setTotalWastedStr] = useState("0 B");
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; fileIds: string[]; files: any[] }>({
    open: false,
    fileIds: [],
    files: [],
  });

  const scanDuplicates = async () => {
    setLoading(true);
    try {
      const res = await api.get("/dashboard/duplicates");
      if (res.data?.success) {
        setGroups(res.data.groups || []);
        setTotalWastedStr(res.data.wastedStr || "0 B");
        setTotalCount(res.data.totalDuplicates || 0);
        if (res.data.totalDuplicates > 0) {
          toast.success(`Discovered ${res.data.totalDuplicates} duplicates across ${res.data.groups.length} groups`);
        } else {
          toast.info("No duplicate files found in indexed folders");
        }
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to scan for duplicate files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scanDuplicates();
  }, []);

  const handleInitiateCleanAll = () => {
    const allDupes: any[] = [];
    const ids: string[] = [];
    for (const g of groups) {
      if (g.duplicateFiles) {
        for (const d of g.duplicateFiles) {
          if (d.id) {
            ids.push(d.id);
            allDupes.push(d);
          }
        }
      }
    }
    if (ids.length === 0) {
      toast.info("No duplicate copies found to clean");
      return;
    }
    setConfirmModal({ open: true, fileIds: ids, files: allDupes });
  };

  const handleConfirmDelete = async () => {
    setCleaning(true);
    try {
      const res = await api.post("/dashboard/duplicates/delete", {
        fileIds: confirmModal.fileIds,
        confirm: true,
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Duplicate copies removed successfully.");
        setConfirmModal({ open: false, fileIds: [], files: [] });
        scanDuplicates();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete duplicate files");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Duplicate Finder</h2>
          <p className="text-sm text-gray-500">Real content-hash duplicate detection across your indexed files</p>
        </div>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <button
              onClick={handleInitiateCleanAll}
              disabled={loading || cleaning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-sm transition-colors shadow-sm disabled:opacity-60"
            >
              <Trash2 size={14} />
              <span>Clean Safe Duplicates</span>
            </button>
          )}
          <button
            onClick={scanDuplicates}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-sm transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Scanning..." : "Scan Now"}</span>
          </button>
        </div>
      </div>

      {/* Recovery card */}
      <GlassCard className="p-5 border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <HardDrive size={24} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-400">Recoverable Storage</p>
            <p className="text-3xl font-bold text-emerald-400 font-mono">{totalWastedStr}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {totalCount > 0
                ? `${totalCount} duplicate copies detected across ${groups.length} groups (Primary copies always preserved)`
                : "No wasted duplicate space detected"}
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-4">
        {groups.length > 0 ? (
          groups.map(group => (
            <GlassCard key={group.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Badge color={group.type === "Media" ? "cyan" : group.type === "Documents" ? "blue" : "purple"}>{group.type}</Badge>
                  <span className="text-sm text-gray-400">{group.count} copies · <span className="text-red-400 font-mono">{group.size}</span> wasted</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {group.names.map((name: string, i: number) => (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${i === 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-white/[0.03]"}`}>
                    <FileIcon type={group.type === "Media" ? "jpg" : "pdf"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">{name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{group.paths?.[i]}</p>
                    </div>
                    {i === 0 && <Badge color="green">Primary Original</Badge>}
                    {i > 0 && <Badge color="red">Duplicate Copy</Badge>}
                  </div>
                ))}
              </div>
            </GlassCard>
          ))
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
            <Copy size={28} className="text-gray-500 mb-2" />
            <p className="text-sm font-medium text-gray-300">No duplicate files found</p>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              Your indexed folders have no matching duplicate files. Click 'Scan Now' to re-verify.
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-backdrop-enter">
          <GlassCard className="max-w-md w-full p-6 border-red-500/30 bg-[#080d1e] shadow-2xl space-y-4 animate-modal-enter">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Duplicate Cleanup</h3>
                <p className="text-xs text-gray-400">Permanent removal of duplicate copies only</p>
              </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              You are about to permanently delete <strong className="text-red-400">{confirmModal.fileIds.length}</strong> duplicate file copies from disk.
              The primary original copies will remain untouched.
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1 p-2 rounded-xl bg-black/30 border border-white/5 text-[11px] text-gray-400 font-mono">
              {confirmModal.files.map((f, idx) => (
                <div key={idx} className="truncate">✕ {f.name}</div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal({ open: false, fileIds: [], files: [] })}
                disabled={cleaning}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={cleaning}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {cleaning ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>Confirm Deletion</span>
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function BackupRecovery() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [restoreModal, setRestoreModal] = useState<{
    open: boolean;
    backupFilename: string;
    preview: any[];
    totalFiles: number;
    conflictCount: number;
    overwrite: boolean;
    targetDir: string;
    restoring: boolean;
  }>({
    open: false,
    backupFilename: "",
    preview: [],
    totalFiles: 0,
    conflictCount: 0,
    overwrite: false,
    targetDir: "",
    restoring: false,
  });

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await api.get("/dashboard/backup/list");
      if (res.data?.success) {
        setBackups(res.data.backups || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleBackupNow = async () => {
    setRunning(true);
    try {
      const res = await api.post("/dashboard/backup");
      if (res.data?.success) {
        toast.success(`Backup created: ${res.data.filename} (${res.data.sizeStr})`);
        fetchBackups();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to create backup");
    } finally {
      setRunning(false);
    }
  };

  const handleInitiateRestore = async (backup: any) => {
    try {
      toast.info(`Verifying integrity of ${backup.filename}...`);
      const res = await api.post("/dashboard/backup/restore", {
        backupFilename: backup.filename,
        confirm: false,
      });

      if (res.data?.requiresConfirmation) {
        setRestoreModal({
          open: true,
          backupFilename: backup.filename,
          preview: res.data.preview || [],
          totalFiles: res.data.totalFiles || 0,
          conflictCount: res.data.conflictCount || 0,
          overwrite: false,
          targetDir: "",
          restoring: false,
        });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to inspect backup archive");
    }
  };

  const handleConfirmRestore = async () => {
    setRestoreModal(prev => ({ ...prev, restoring: true }));
    try {
      const res = await api.post("/dashboard/backup/restore", {
        backupFilename: restoreModal.backupFilename,
        targetDir: restoreModal.targetDir ? restoreModal.targetDir.trim() : undefined,
        overwrite: restoreModal.overwrite,
        confirm: true,
      });

      if (res.data?.success) {
        toast.success(res.data.message || `Restored ${res.data.restoredCount} files successfully.`);
        setRestoreModal(prev => ({ ...prev, open: false, restoring: false }));
        fetchBackups();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to execute restore");
      setRestoreModal(prev => ({ ...prev, restoring: false }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Backup & Recovery</h2>
          <p className="text-sm text-gray-500">SHA-256 verified system backups and recovery archives on this PC</p>
        </div>
        <button
          onClick={handleBackupNow}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-sm transition-colors disabled:opacity-60"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
          <span>{running ? "Backing up..." : "Backup Now"}</span>
        </button>
      </div>

      {/* Verified Backups List */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300">Verified System Backups</h3>
          <span className="text-xs font-mono text-gray-500">{backups.length} archives</span>
        </div>
        <div className="space-y-2">
          {backups.length > 0 ? (
            backups.map((b) => (
              <div key={b.filename} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <CloudUpload size={16} className="text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-200 truncate">{b.filename}</p>
                      {b.integrityVerified && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                          SHA-256 Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">
                      {b.fileCount} files · {b.sizeStr} · {new Date(b.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleInitiateRestore(b)}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw size={12} />
                  <span>Restore</span>
                </button>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-xs text-gray-500">
              No backups created yet. Click 'Backup Now' above to generate an authenticated archive.
            </div>
          )}
        </div>
      </GlassCard>

      {/* Restore Preview & Confirmation Modal */}
      {restoreModal.open && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-backdrop-enter">
          <GlassCard className="max-w-lg w-full p-6 border-blue-500/30 bg-[#080d1e] shadow-2xl space-y-4 animate-modal-enter">
            <div className="flex items-center gap-3 text-blue-400">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Restore Backup Archive</h3>
                <p className="text-xs text-gray-400 font-mono">{restoreModal.backupFilename}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Total files in archive:</span>
                <span className="text-white font-mono">{restoreModal.totalFiles}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Files already existing (Conflicts):</span>
                <span className={restoreModal.conflictCount > 0 ? "text-amber-400 font-mono" : "text-emerald-400 font-mono"}>
                  {restoreModal.conflictCount}
                </span>
              </div>
            </div>

            {/* Target directory input */}
            <div>
              <label className="block text-[11px] text-gray-400 font-mono uppercase tracking-wider mb-1">
                Custom Restore Directory (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave blank to restore to original paths"
                value={restoreModal.targetDir}
                onChange={(e) => setRestoreModal(prev => ({ ...prev, targetDir: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs text-gray-200 outline-none focus:border-blue-500/50"
              />
            </div>

            {/* Overwrite toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="overwriteCheck"
                checked={restoreModal.overwrite}
                onChange={(e) => setRestoreModal(prev => ({ ...prev, overwrite: e.target.checked }))}
                className="rounded border-white/10"
              />
              <label htmlFor="overwriteCheck" className="text-xs text-gray-300 cursor-pointer">
                Overwrite files if they already exist on disk
              </label>
            </div>

            {/* Affected files preview */}
            <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-black/30 border border-white/5 text-[11px] font-mono text-gray-400">
              {restoreModal.preview.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center truncate">
                  <span className="truncate">{p.name}</span>
                  <span className={p.alreadyExists ? "text-amber-400" : "text-gray-500"}>
                    {p.alreadyExists ? "Conflict" : "New"}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRestoreModal(prev => ({ ...prev, open: false }))}
                disabled={restoreModal.restoring}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={restoreModal.restoring}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {restoreModal.restoring ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                <span>Confirm Restoration</span>
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function HelixSentinel({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [status, setStatus] = useState<any>({
    score: 100,
    rating: "Protected",
    activeAlerts: 0,
    monitoredFoldersCount: 0,
    healthyFoldersCount: 0,
  });
  const [folders, setFolders] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [scanning, setScanning] = useState(false);
  const [addModal, setAddModal] = useState({ open: false, path: "", name: "", loading: false });

  const fetchSentinelData = async () => {
    try {
      const [statusRes, foldersRes, alertsRes] = await Promise.allSettled([
        api.get("/sentinel/status"),
        api.get("/sentinel/folders"),
        api.get("/sentinel/alerts?status=all"),
      ]);

      if (statusRes.status === "fulfilled" && statusRes.value.data?.success) {
        setStatus(statusRes.value.data);
      }
      if (foldersRes.status === "fulfilled" && foldersRes.value.data?.success) {
        setFolders(foldersRes.value.data.folders || []);
      }
      if (alertsRes.status === "fulfilled" && alertsRes.value.data?.success) {
        setAlerts(alertsRes.value.data.alerts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSentinelData();
  }, []);

  const handleScanAll = async () => {
    setScanning(true);
    try {
      toast.info("Re-evaluating integrity across monitored folders...");
      const res = await api.post("/sentinel/scan");
      if (res.data?.success) {
        toast.success("Integrity scan complete.");
        fetchSentinelData();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to run integrity scan");
    } finally {
      setScanning(false);
    }
  };

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addModal.path.trim()) return;

    setAddModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.post("/sentinel/folders", {
        path: addModal.path.trim(),
        name: addModal.name.trim() || undefined,
      });
      if (res.data?.success) {
        toast.success(`Folder registered: ${res.data.fileCount} files baseline established.`);
        setAddModal({ open: false, path: "", name: "", loading: false });
        fetchSentinelData();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to register folder");
      setAddModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRemoveFolder = async (folderId: string) => {
    try {
      await api.delete(`/sentinel/folders/${folderId}`);
      toast.success("Folder removed from monitoring");
      fetchSentinelData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to remove folder");
    }
  };

  const handleScanFolder = async (folderId: string) => {
    try {
      toast.info("Scanning folder integrity...");
      const res = await api.post(`/sentinel/folders/${folderId}/scan`);
      if (res.data?.success) {
        toast.success(`Scan complete: ${res.data.status}`);
        fetchSentinelData();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to scan folder");
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.post(`/sentinel/alerts/${alertId}/acknowledge`);
      toast.success("Alert acknowledged");
      fetchSentinelData();
    } catch (e) {
      toast.error("Failed to acknowledge alert");
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await api.post(`/sentinel/alerts/${alertId}/dismiss`);
      toast.success("Alert dismissed");
      fetchSentinelData();
    } catch (e) {
      toast.error("Failed to dismiss alert");
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (severityFilter === "all") return true;
    return a.severity === severityFilter;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Helix Sentinel</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-medium">
              FIM Active
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Transparent File Integrity Monitoring, threat detection, and explainable audit trail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddModal({ open: true, path: "", name: "", loading: false })}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors"
          >
            <FolderPlus size={14} />
            <span>Add Monitored Folder</span>
          </button>
          <button
            onClick={handleScanAll}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20 disabled:opacity-60"
          >
            <RefreshCw size={13} className={scanning ? "animate-spin" : ""} />
            <span>{scanning ? "Scanning..." : "Run Integrity Scan"}</span>
          </button>
        </div>
      </div>

      {/* Top Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Security Health Score */}
        <GlassCard className="p-5 flex flex-col items-center justify-center border-emerald-500/20">
          <div className="relative w-24 h-24 mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={status.score >= 85 ? "#10b981" : status.score >= 60 ? "#f59e0b" : "#ef4444"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - status.score / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white font-mono">{status.score}</span>
              <span className="text-[10px] text-gray-500 font-mono">/ 100</span>
            </div>
          </div>
          <p className={`text-xs font-bold uppercase tracking-wider font-mono ${
            status.score >= 85 ? "text-emerald-400" : status.score >= 60 ? "text-amber-400" : "text-red-400"
          }`}>
            {status.rating}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">Security Health Score</p>
        </GlassCard>

        {/* Monitored Folders */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 tracking-wider">Monitored Folders</span>
            <Folder size={16} className="text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{folders.length}</div>
            <p className="text-xs text-gray-400 mt-0.5">
              {folders.filter(f => f.lastStatus === "healthy").length} healthy · {folders.filter(f => f.lastStatus === "modified").length} modified
            </p>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all"
              style={{ width: `${folders.length > 0 ? (folders.filter(f => f.lastStatus === "healthy").length / folders.length) * 100 : 100}%` }}
            />
          </div>
        </GlassCard>

        {/* Active Threats */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 tracking-wider">Active Alerts</span>
            <ShieldCheck size={16} className={status.activeAlerts > 0 ? "text-amber-400" : "text-emerald-400"} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{status.activeAlerts}</div>
            <p className="text-xs text-gray-400 mt-0.5">
              {status.activeAlerts === 0 ? "Zero threats detected" : "Pending your review"}
            </p>
          </div>
          <Badge color={status.activeAlerts === 0 ? "green" : "yellow"}>
            {status.activeAlerts === 0 ? "Integrity Secure" : `${status.activeAlerts} Requires Action`}
          </Badge>
        </GlassCard>

        {/* Engine Spec */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-400 tracking-wider">Detection Engine</span>
            <Lock size={16} className="text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">SHA-256 Baseline</div>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">Real File System Watcher</p>
          </div>
          <p className="text-[11px] text-gray-500">
            Never deletes or alters files automatically. Explicit user approval required.
          </p>
        </GlassCard>
      </div>

      {/* Monitored Folders List */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Monitored Directories</h3>
            <p className="text-xs text-gray-500">Continuously monitored against unauthorized modification, addition, or removal</p>
          </div>
          <button
            onClick={() => setAddModal({ open: true, path: "", name: "", loading: false })}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            + Add Directory
          </button>
        </div>

        {folders.length > 0 ? (
          <div className="space-y-2">
            {folders.map(f => (
              <div key={f._id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Folder size={15} className="text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-gray-200 truncate">{f.name}</p>
                      <Badge color={f.lastStatus === "healthy" ? "green" : f.lastStatus === "modified" ? "yellow" : "red"}>
                        {f.lastStatus || "healthy"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono truncate">{f.path} · {f.baselineFileCount || 0} files tracked</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleScanFolder(f._id)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-300 transition-colors"
                    title="Scan folder now"
                  >
                    <RefreshCw size={13} />
                  </button>
                  <button
                    onClick={() => handleRemoveFolder(f._id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                    title="Remove from monitoring"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
            <ShieldCheck size={28} className="text-gray-500 mb-2" />
            <p className="text-xs font-medium text-gray-300">No folders registered for monitoring</p>
            <p className="text-[11px] text-gray-500 max-w-sm mt-1 mb-3">
              Add your desktop project repositories or document directories to establish an integrity baseline.
            </p>
            <button
              onClick={() => setAddModal({
                open: true,
                path: "C:\\Users\\Niaa\\Desktop\\ProjectHelixDesktopApp",
                name: "Project Helix Codebase",
                loading: false,
              })}
              className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium transition-colors"
            >
              Monitor Current Project Repository
            </button>
          </div>
        )}
      </GlassCard>

      {/* Explainable Security Alerts */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Explainable Security Alerts</h3>
            <p className="text-xs text-gray-500">Transparent alert records with forensic evidence and recommended actions</p>
          </div>

          {/* Severity filter tabs */}
          <div className="flex bg-white/5 rounded-lg p-0.5 text-xs">
            {["all", "high", "medium", "low", "info"].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded-md capitalize font-mono text-[11px] transition-colors ${
                  severityFilter === sev ? "bg-blue-500/25 text-blue-300 font-semibold" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {filteredAlerts.length > 0 ? (
          <div className="space-y-3">
            {filteredAlerts.map(alert => (
              <div
                key={alert._id}
                className={`p-4 rounded-xl border transition-all ${
                  alert.severity === "high"
                    ? "bg-red-500/5 border-red-500/20"
                    : alert.severity === "medium"
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-white/[0.03] border-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2.5">
                    <Badge color={alert.severity === "high" ? "red" : alert.severity === "medium" ? "yellow" : alert.severity === "low" ? "blue" : "cyan"}>
                      {alert.severity}
                    </Badge>
                    <h4 className="text-xs font-semibold text-gray-200">{alert.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                    <span>Confidence: {alert.confidenceScore}%</span>
                    <span>·</span>
                    <span>{new Date(alert.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed mb-2.5">{alert.explanation}</p>

                {alert.affectedPath && (
                  <div className="p-2 rounded-lg bg-black/30 border border-white/5 text-[11px] font-mono text-gray-400 mb-2.5 flex items-center justify-between">
                    <span className="truncate">{alert.affectedPath}</span>
                    <button
                      onClick={() => openFileSafely(undefined, alert.affectedPath)}
                      className="text-blue-400 hover:text-blue-300 ml-2 flex-shrink-0"
                    >
                      Inspect File →
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                  <div className="text-[11px] text-gray-400">
                    <strong className="text-gray-300">Recommendation:</strong> {alert.recommendedAction}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {alert.status === "active" && (
                      <button
                        onClick={() => handleAcknowledgeAlert(alert._id)}
                        className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => handleDismissAlert(alert._id)}
                      className="px-2.5 py-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-gray-300 text-[11px] transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-gray-500">
            Zero active alerts matching the selected filter. File integrity is verified.
          </div>
        )}
      </GlassCard>

      {/* Add Folder Modal */}
      {addModal.open && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-backdrop-enter">
          <GlassCard className="max-w-md w-full p-6 border-blue-500/30 bg-[#080d1e] shadow-2xl space-y-4 animate-modal-enter">
            <div className="flex items-center gap-3 text-blue-400">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <FolderPlus size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Add Monitored Directory</h3>
                <p className="text-xs text-gray-400">File Integrity Baseline Registration</p>
              </div>
            </div>

            <form onSubmit={handleAddFolder} className="space-y-3">
              <div>
                <label className="block text-[11px] text-gray-400 font-mono uppercase tracking-wider mb-1">
                  Directory Path
                </label>
                <input
                  type="text"
                  required
                  placeholder="C:\Users\Niaa\Documents\Projects"
                  value={addModal.path}
                  onChange={(e) => setAddModal(prev => ({ ...prev, path: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs text-gray-200 outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-mono uppercase tracking-wider mb-1">
                  Folder Alias
                </label>
                <input
                  type="text"
                  placeholder="Project Source Code"
                  value={addModal.name}
                  onChange={(e) => setAddModal(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs text-gray-200 outline-none focus:border-blue-500/50"
                />
              </div>

              {/* Quick shortcuts */}
              <div className="pt-1 space-y-1">
                <p className="text-[10px] text-gray-500 font-mono uppercase">Quick Presets:</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAddModal(prev => ({
                      ...prev,
                      path: "C:\\Users\\Niaa\\Desktop\\ProjectHelixDesktopApp",
                      name: "Helix App Repository",
                    }))}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] text-gray-300"
                  >
                    Helix Repository
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddModal(prev => ({
                      ...prev,
                      path: "C:\\Users\\Niaa\\Desktop",
                      name: "Desktop Directory",
                    }))}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] text-gray-300"
                  >
                    Desktop
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAddModal({ open: false, path: "", name: "", loading: false })}
                  disabled={addModal.loading}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addModal.loading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  {addModal.loading ? <Loader2 size={13} className="animate-spin" /> : <FolderPlus size={13} />}
                  <span>Establish Baseline</span>
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}


function Analytics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [storageData, setStorageData] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get("/analytics");
        const { metrics: m, productivityWeekly: w, storageBreakdown: s } = res.data;
        setMetrics(m);
        setWeeklyData(w);
        setStorageData(s);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      }
    };
    fetchAnalytics();
  }, []);

  const cardMetrics = metrics ? [
    { label: "Files Created", value: metrics.filesCreated.value, change: metrics.filesCreated.change, up: metrics.filesCreated.up },
    { label: "Active Hours", value: metrics.activeHours.value, change: metrics.activeHours.change, up: metrics.activeHours.up },
    { label: "Storage Used", value: metrics.storageUsed.value, change: metrics.storageUsed.change, up: metrics.storageUsed.up },
    { label: "Avg Productivity", value: metrics.avgProductivity.value, change: metrics.avgProductivity.change, up: metrics.avgProductivity.up },
  ] : [
    { label: "Files Created", value: "...", change: "+0%", up: true },
    { label: "Active Hours", value: "...", change: "+0%", up: true },
    { label: "Storage Used", value: "...", change: "+0%", up: false },
    { label: "Avg Productivity", value: "...", change: "+0%", up: true },
  ];

  // Radial bar chart data format mapping
  const radialData = storageData.map(item => ({
    name: item.type,
    value: item.pct,
    color: item.color,
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Analytics</h2>
        <p className="text-sm text-gray-500">Productivity trends, storage analysis, and file activity</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cardMetrics.map(m => (
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
            <BarChart data={weeklyData.length > 0 ? weeklyData : productivityData}>
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
            <RadialBarChart cx="50%" cy="50%" innerRadius={30} outerRadius={80} data={radialData.length > 0 ? radialData : storageData}>
              <RadialBar dataKey="value" cornerRadius={4}>
                {(radialData.length > 0 ? radialData : storageData).map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
              </RadialBar>
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">File Type Breakdown</h3>
        <div className="space-y-3">
          {(storageData.length > 0 ? storageData : [
            { type: "Documents", count: 0, size: "0 MB", pct: 0, color: "#3b82f6" },
            { type: "Images", count: 0, size: "0 MB", pct: 0, color: "#7c3aed" },
            { type: "Videos", count: 0, size: "0 MB", pct: 0, color: "#06b6d4" },
            { type: "Audio", count: 0, size: "0 MB", pct: 0, color: "#10b981" },
          ]).map(f => (
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
  const { user, userData, updateSettings, updateProfileName, logout } = useUser();
  const { notifications, aiSuggestions, autoBackup, privacyMode } = userData.settings;
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? "");

  useEffect(() => {
    setNameInput(user?.name ?? "");
  }, [user?.name]);

  const saveName = () => {
    updateProfileName(nameInput);
    setEditingName(false);
  };

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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
            {getUserInitial(user?.name ?? "U")}
          </div>
          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-blue-500/50"
                />
                <button onClick={saveName} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs">Save</button>
                <button onClick={() => setEditingName(false)} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-xs">Cancel</button>
              </div>
            ) : (
              <p className="text-base font-semibold text-white">{user?.name}</p>
            )}
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-blue-400 mt-1">Helix Pro · Expires Dec 2026</p>
          </div>
          {!editingName && (
            <button onClick={() => setEditingName(true)} className="ml-auto px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-colors">Edit Profile</button>
          )}
        </div>
      </GlassCard>

      {/* AI Preferences */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">AI Preferences</h3>
        <div className="space-y-4">
          {[
            { label: "AI Suggestions", desc: "Get intelligent file organization and task recommendations", key: "aiSuggestions" as const, val: aiSuggestions },
            { label: "Privacy Mode", desc: "Process all AI tasks locally without cloud sync", key: "privacyMode" as const, val: privacyMode },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">{item.label}</p>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>
              <ToggleSwitch enabled={item.val} onChange={() => updateSettings({ [item.key]: !item.val })} />
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
            { label: "System Alerts", key: "notifications" as const, val: notifications },
            { label: "Backup Reminders", key: "autoBackup" as const, val: autoBackup },
            { label: "AI Insights", key: "aiSuggestions" as const, val: aiSuggestions },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-1">
              <p className="text-sm text-gray-300">{item.label}</p>
              <ToggleSwitch enabled={item.val} onChange={() => updateSettings({ [item.key]: !item.val })} />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Account */}
      <GlassCard className="p-5 border-blue-500/15">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Account</h3>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-colors"
        >
          <LogOut size={14} /> Sign Out
        </button>
        <p className="text-xs text-gray-600 mt-2">Signing out will require login again on next launch.</p>
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
  { id: "assistant", label: "Helix AI", icon: Bot },
  { id: "files", label: "File Manager", icon: FolderOpen, group: "Files" },
  { id: "search", label: "Semantic Search", icon: Search },
  { id: "timeline", label: "AI Timeline", icon: Clock },
  { id: "automation", label: "Automation", icon: Zap, group: "System" },
  { id: "monitor", label: "System Monitor", icon: Activity },
  { id: "duplicates", label: "Duplicate Finder", icon: Copy },
  { id: "backup", label: "Backup & Recovery", icon: CloudUpload },
  { id: "security", label: "Helix Sentinel", icon: Shield, group: "Tools" },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "settings", label: "Settings", icon: Settings },
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { user, isReady, needsLogin } = useUser();
  const [page, setPage] = useState<Page>("dashboard");
  const [lastActiveModule, setLastActiveModule] = useState<string>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [lastNotifId, setLastNotifId] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get("/notifications");
      setDbNotifications(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      const socket = io("http://localhost:5000");
      socket.emit("join", user._id);

      socket.on("notification:new", (newNotif: any) => {
        setDbNotifications(prev => [newNotif, ...prev]);
        toast.info(newNotif.msg);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  // Request permissions and trigger desktop alerts on new notifications
  useEffect(() => {
    if (dbNotifications.length > 0) {
      const latest = dbNotifications[0];
      if (lastNotifId !== latest._id) {
        setLastNotifId(latest._id);
        
        // Native browser/Electron alert popup
        if (Notification.permission === "granted") {
          new Notification("Project Helix companion", { body: latest.msg });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(permission => {
            if (permission === "granted") {
              new Notification("Project Helix companion", { body: latest.msg });
            }
          });
        }
      }
    }
  }, [dbNotifications, lastNotifId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPage("search");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClearNotifications = async () => {
    try {
      await api.delete("/notifications");
      setDbNotifications([]);
      toast.success("Notifications cleared");
    } catch (e) {
      toast.error("Failed to clear notifications");
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-blue-300">
          <HelixLogo size={28} className="animate-pulse" />
          <span className="text-sm font-medium">Loading Project Helix...</span>
        </div>
      </div>
    );
  }

  if (needsLogin) {
    return <LoginScreen />;
  }

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard onNavigate={setPage} />;
      case "assistant": return <AIAssistant lastVisitedPage={lastActiveModule} />;
      case "files": return <SmartFileManager />;
      case "search": return <SemanticSearch />;
      case "timeline": return <AITimeline />;
      case "automation": return <AutomationCenter />;
      case "monitor": return <SystemMonitor />;
      case "duplicates": return <DuplicateFinder />;
      case "backup": return <BackupRecovery />;
      case "security": return <HelixSentinel onNavigate={setPage} />;
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
    <div className="w-full h-screen flex overflow-hidden font-['Inter',sans-serif] bg-transparent">
      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col border-r border-white/[0.06] relative z-10 transition-all duration-300"
        style={{ width: collapsed ? 60 : 220, background: "rgba(8,11,22,0.72)", backdropFilter: "blur(20px)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]">
          <HelixLogo size={32} className="rounded-xl flex-shrink-0" />
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
                  onClick={() => {
                    if (page !== "assistant") {
                      setLastActiveModule(page);
                    }
                    setPage(item.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-xl transition-all duration-200 active:scale-[0.98] text-left group ${active ? "bg-blue-500/15 text-blue-300 shadow-sm shadow-blue-500/10" : "text-gray-500 hover:text-gray-300 hover:bg-white/5 hover:translate-x-0.5"}`}
                  style={{ width: "calc(100% - 12px)" }}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={16} className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${active ? "text-blue-400 scale-105" : ""}`} />
                  {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                  {!collapsed && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-subtle" />}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/[0.06] p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all duration-200 active:scale-[0.98]"
          >
            <ChevronRight size={16} className={`flex-shrink-0 transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`} />
            {!collapsed && <span className="text-xs text-gray-600">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] flex-shrink-0" style={{ background: "rgba(8,11,22,0.65)", backdropFilter: "blur(16px)" }}>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Helix</span>
            <ChevronRight size={12} className="text-gray-700" />
            <span className="text-gray-300 font-medium">{activeItem?.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage("search")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-xs text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-all duration-200 active:scale-[0.98] w-48 text-left"
              title="Search files and application content"
            >
              <Command size={12} />
              <span className="truncate">Search everything...</span>
              <span className="ml-auto font-mono text-gray-700">⌘K</span>
            </button>
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors duration-200 active:scale-95">
                <Bell size={16} />
                {dbNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden animate-popover-enter origin-top-right" style={{ background: "rgba(10,14,28,0.98)" }}>
                  <div className="px-4 py-3 border-b border-white/8 flex justify-between items-center">
                    <p className="text-sm font-semibold text-gray-300">Notifications</p>
                    {dbNotifications.length > 0 && (
                      <button onClick={handleClearNotifications} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Clear All</button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {dbNotifications.length > 0 ? (
                      dbNotifications.map((n, i) => (
                        <div key={n._id || i} className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === "success" ? "bg-green-400" : n.type === "warning" ? "bg-amber-400" : "bg-blue-400"}`} />
                          <div>
                            <p className="text-xs text-gray-300">{n.msg}</p>
                            <p className="text-xs text-gray-600 font-mono mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 text-center py-6">No new notifications</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95" title={user?.name}>
              {getUserInitial(user?.name ?? "U")}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div key={page} className="animate-page-enter min-h-full">
            {renderPage()}
          </div>
        </main>
      </div>
      <Toaster theme="dark" position="bottom-right" closeButton />
    </div>
  );
}
