import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import path from "path";
import fs from "fs";
import net from "net";
import { fileURLToPath } from "url";
import { spawn, execFileSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let backendProcess = null;
let pythonProcess = null;

// ─── Environment ──────────────────────────────────────────────────────────────
const isPackaged = app.isPackaged;
const resourcesPath = isPackaged ? process.resourcesPath : __dirname;

// ─── Security ─────────────────────────────────────────────────────────────────
const FORBIDDEN_DIRS = [
  "c:\\windows",
  "c:\\program files",
  "c:\\program files (x86)",
  "/bin", "/sbin", "/etc", "/usr", "/sys", "/proc",
];
const DANGEROUS_EXTENSIONS = [".bat", ".cmd", ".vbs", ".ps1", ".scr", ".com", ".reg"];

function isPathRestricted(normPath) {
  const lower = normPath.toLowerCase();
  for (const forbidden of FORBIDDEN_DIRS) {
    if (lower === forbidden || lower.startsWith(forbidden + path.sep)) {
      return { restricted: true, reason: "Access to protected system directories is prohibited." };
    }
  }
  const ext = path.extname(normPath).toLowerCase();
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return { restricted: true, reason: `Direct execution of '${ext}' scripts via IPC is blocked.` };
  }
  return { restricted: false };
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle("helix:open-file", async (_event, targetPath) => {
  try {
    if (!targetPath || typeof targetPath !== "string") return { success: false, error: "Invalid path." };
    if (targetPath.includes("..")) return { success: false, error: "Path traversal is prohibited." };
    const normalized = path.normalize(targetPath.trim());
    if (!path.isAbsolute(normalized)) return { success: false, error: "Path must be absolute." };
    if (normalized.includes("\0")) return { success: false, error: "Illegal null character in path." };
    const check = isPathRestricted(normalized);
    if (check.restricted) return { success: false, error: check.reason };
    if (!fs.existsSync(normalized)) return { success: false, error: "File does not exist." };
    const openError = await shell.openPath(normalized);
    if (openError) return { success: false, error: openError };
    return { success: true, path: normalized };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("helix:show-in-folder", async (_event, targetPath) => {
  try {
    if (!targetPath || typeof targetPath !== "string") return { success: false, error: "Invalid path." };
    if (targetPath.includes("..")) return { success: false, error: "Path traversal is prohibited." };
    const normalized = path.normalize(targetPath.trim());
    if (!path.isAbsolute(normalized)) return { success: false, error: "Path must be absolute." };
    if (normalized.includes("\0")) return { success: false, error: "Illegal null character in path." };
    const check = isPathRestricted(normalized);
    if (check.restricted) return { success: false, error: check.reason };
    if (!fs.existsSync(normalized)) return { success: false, error: "File or directory does not exist." };
    shell.showItemInFolder(normalized);
    return { success: true, path: normalized };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── .env loader ─────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = isPackaged
    ? path.join(resourcesPath, "backend", ".env")
    : path.join(__dirname, "backend", ".env");

  if (!fs.existsSync(envPath)) {
    dialog.showErrorBox(
      "Project Helix — Configuration Missing",
      `backend/.env not found at:\n${envPath}\n\nCreate it from .env.example and add your MongoDB URI, Gemini API key, and JWT secrets.`
    );
    return {};
  }

  const env = {};
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return env;
}

// ─── Backend launcher ─────────────────────────────────────────────────────────
function startBackend(envVars) {
  const backendDir = isPackaged
    ? path.join(resourcesPath, "backend")
    : path.join(__dirname, "backend");

  const serverEntry = path.join(backendDir, "server.js");
  if (!fs.existsSync(serverEntry)) {
    console.error("[Helix] Backend server.js not found at:", serverEntry);
    return null;
  }

  console.log("[Helix] Starting Express backend from:", backendDir);

  // Use the same Node.js executable that is running Electron
  const proc = spawn(process.execPath, [serverEntry], {
    cwd: backendDir,
    env: { ...process.env, ...envVars, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  proc.stdout.on("data", (d) => console.log(`[backend] ${d.toString().trimEnd()}`));
  proc.stderr.on("data", (d) => console.error(`[backend:err] ${d.toString().trimEnd()}`));
  proc.on("error", (err) => console.error("[Helix] Backend spawn error:", err.message));
  proc.on("exit", (code) => console.log(`[Helix] Backend exited with code ${code}`));

  return proc;
}

// ─── Python AI launcher ───────────────────────────────────────────────────────
function findPythonExecutable() {
  // 1. Prefer a bundled Python runtime shipped with the installer
  const bundled = path.join(resourcesPath, "python-runtime", "python.exe");
  if (fs.existsSync(bundled)) return bundled;

  // 2. Fall back to system Python (Windows: python.exe / py.exe)
  for (const candidate of ["python", "python3", "py"]) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // not found, try next
    }
  }
  return null;
}

function startPythonAI(envVars) {
  const pythonAIDir = isPackaged
    ? path.join(resourcesPath, "python-ai")
    : path.join(__dirname, "python-ai");

  const appPy = path.join(pythonAIDir, "app.py");
  if (!fs.existsSync(appPy)) {
    console.warn("[Helix] python-ai/app.py not found — AI service will not start.");
    return null;
  }

  const pythonExe = findPythonExecutable();
  if (!pythonExe) {
    console.warn("[Helix] Python not found on system — AI service will not start.");
    return null;
  }

  console.log("[Helix] Starting Python AI with:", pythonExe);

  const proc = spawn(pythonExe, [appPy], {
    cwd: pythonAIDir,
    env: { ...process.env, ...envVars },
    stdio: ["ignore", "pipe", "pipe"],
  });

  proc.stdout.on("data", (d) => console.log(`[python-ai] ${d.toString().trimEnd()}`));
  proc.stderr.on("data", (d) => console.error(`[python-ai:err] ${d.toString().trimEnd()}`));
  proc.on("error", (err) => console.error("[Helix] Python AI spawn error:", err.message));
  proc.on("exit", (code) => console.log(`[Helix] Python AI exited with code ${code}`));

  return proc;
}

// ─── Readiness probe ─────────────────────────────────────────────────────────
// Poll TCP port until it accepts connections (backend is ready) or timeout.
function waitForPort(port, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tryConnect = () => {
      const sock = new net.Socket();
      sock.setTimeout(1000);
      sock.once("connect", () => { sock.destroy(); resolve(true); });
      sock.once("error", () => {
        sock.destroy();
        if (Date.now() - start >= timeoutMs) { resolve(false); return; }
        setTimeout(tryConnect, 500);
      });
      sock.once("timeout", () => {
        sock.destroy();
        if (Date.now() - start >= timeoutMs) { resolve(false); return; }
        setTimeout(tryConnect, 500);
      });
      sock.connect(port, "127.0.0.1");
    };
    tryConnect();
  });
}

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Project Helix",
    backgroundColor: "#080b16",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.setMenuBarVisibility(false);

  if (!isPackaged) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    // Load the built Vite frontend from inside the ASAR archive
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  if (isPackaged) {
    const envVars = loadEnv();
    const port = parseInt(envVars.PORT || "5000", 10);

    backendProcess = startBackend(envVars);
    pythonProcess = startPythonAI(envVars);

    // Wait up to 30 s for backend to be reachable before showing the UI
    const ready = await waitForPort(port, 30000);
    if (!ready) {
      console.warn("[Helix] Backend not ready after 30 s — showing window anyway.");
    }
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  if (backendProcess && !backendProcess.killed) {
    console.log("[Helix] Shutting down Express backend...");
    backendProcess.kill("SIGTERM");
  }
  if (pythonProcess && !pythonProcess.killed) {
    console.log("[Helix] Shutting down Python AI service...");
    pythonProcess.kill("SIGTERM");
  }
});
