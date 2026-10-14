import si from "systeminformation";
import os from "os";
import { cacheService } from "./CacheService.js";
import { monitorLogger } from "../utils/logger.js";
import { recordTelemetrySnapshot } from "./telemetryService.js";

const CACHE_KEY = "system_metrics";
const CACHE_TTL_SEC = 1; // 1-second cache to throttle fast parallel requests

let staticHardwareCache = null;
let staticHardwareCacheTime = 0;
const STATIC_CACHE_TTL = 300000; // 5 minutes

async function getStaticHardwareInfo() {
  const now = Date.now();
  if (staticHardwareCache && now - staticHardwareCacheTime < STATIC_CACHE_TTL) {
    return staticHardwareCache;
  }

  try {
    const [cpuInfo, osInfo, graphics] = await Promise.all([
      si.cpu().catch(() => ({})),
      si.osInfo().catch(() => ({})),
      si.graphics().catch(() => ({ controllers: [] })),
    ]);

    const gpuController = graphics?.controllers?.[0] || null;
    const cpuModel = [cpuInfo?.manufacturer, cpuInfo?.brand].filter(Boolean).join(" ") || "CPU";

    staticHardwareCache = {
      cpuModel,
      cpuCores: cpuInfo?.cores || os.cpus().length || 1,
      cpuPhysicalCores: cpuInfo?.physicalCores || Math.ceil((cpuInfo?.cores || 1) / 2),
      cpuSpeed: cpuInfo?.speed ? `${cpuInfo.speed} GHz` : "",
      gpuName: gpuController?.model || "Integrated Graphics",
      gpuVendor: gpuController?.vendor || "",
      gpuVram: gpuController?.vram ? Math.round(gpuController.vram) : null,
      osDistro: osInfo?.distro || "Windows",
      osRelease: osInfo?.release || "",
      osBuild: osInfo?.build || "",
      osArch: osInfo?.arch || os.arch(),
      hostname: osInfo?.hostname || os.hostname(),
    };
    staticHardwareCacheTime = now;
  } catch (err) {
    monitorLogger.warn("Failed to fetch static hardware info: " + err.message);
    if (!staticHardwareCache) {
      staticHardwareCache = {
        cpuModel: "Processor",
        cpuCores: os.cpus().length || 1,
        cpuPhysicalCores: Math.ceil(os.cpus().length / 2),
        cpuSpeed: "",
        gpuName: "Display Adapter",
        gpuVendor: "",
        gpuVram: null,
        osDistro: "Microsoft Windows",
        osRelease: "",
        osBuild: "",
        osArch: os.arch(),
        hostname: os.hostname(),
      };
    }
  }

  return staticHardwareCache;
}

export async function getSystemMetrics() {
  const cached = cacheService.get(CACHE_KEY);
  if (cached) {
    return cached;
  }

  try {
    const staticInfo = await getStaticHardwareInfo();

    const [load, mem, graphics, fs, battery, temp, net, dio, procs] = await Promise.all([
      si.currentLoad().catch(() => ({ currentLoad: 0, cpus: [] })),
      si.mem().catch(() => ({ total: 0, used: 0, free: 0, active: 0, available: 0 })),
      si.graphics().catch(() => ({ controllers: [] })),
      si.fsSize().catch(() => []),
      si.battery().catch(() => ({ hasBattery: false, isCharging: false, percent: 0, acConnected: true })),
      si.cpuTemperature().catch(() => ({ main: null })),
      si.networkStats().catch(() => []),
      si.disksIO().catch(() => ({ rIO_sec: 0, wIO_sec: 0, tIO_sec: 0 })),
      si.processes().catch(() => ({ list: [] })),
    ]);

    // 1. Real CPU load percentage & per-core usage
    const cpuLoad = Math.min(100, Math.max(0, Math.round(load?.currentLoad || 0)));
    const perCoreLoads = Array.isArray(load?.cpus)
      ? load.cpus.map((c, i) => ({ core: i, load: Math.round(c.load || 0) }))
      : [];

    // 2. Real RAM usage
    const ramTotal = mem?.total || os.totalmem() || 0;
    const ramUsed = mem?.used || mem?.active || (ramTotal - (mem?.available || mem?.free || 0));
    const ramPercent = ramTotal > 0 ? Math.min(100, Math.max(0, Math.round((ramUsed / ramTotal) * 100))) : 0;
    const ramAvailable = mem?.available || mem?.free || (ramTotal - ramUsed);

    // 3. Real GPU model and utilization
    // CRITICAL: NEVER invent GPU utilization with cpuLoad * 0.4!
    // If utilizationGpu is not exposed by hardware drivers, report null (N/A)
    const gpuController = graphics?.controllers?.[0] || null;
    const gpuName = gpuController?.model || staticInfo.gpuName || "Integrated Graphics";
    const gpuVram = gpuController?.vram ? Math.round(gpuController.vram) : staticInfo.gpuVram;
    const gpuPercent =
      gpuController?.utilizationGpu !== undefined &&
      gpuController?.utilizationGpu !== null &&
      typeof gpuController.utilizationGpu === "number"
        ? Math.min(100, Math.max(0, Math.round(gpuController.utilizationGpu)))
        : null;

    // 4. Real Disk Space & Drives enumeration
    const disksList = Array.isArray(fs) ? fs : [];
    const formattedDisks = disksList.map((d) => ({
      mount: d.mount,
      fs: d.fs,
      type: d.type,
      size: d.size,
      used: d.used,
      available: d.available,
      use: d.size > 0 ? Math.min(100, Math.max(0, Math.round((d.used / d.size) * 1000) / 10)) : 0,
    }));

    const primaryDisk =
      formattedDisks.find((f) => f?.mount === "C:" || f?.mount === "c:" || f?.mount === "/") ||
      formattedDisks[0] ||
      null;

    const diskPercent = primaryDisk?.use ? Math.round(primaryDisk.use) : 0;
    const diskTotalBytes = primaryDisk?.size || 0;
    const diskUsedBytes = primaryDisk?.used || 0;
    const diskAvailableBytes = primaryDisk?.available || 0;

    // Aggregate space across all physical drives
    const aggregateTotalBytes = formattedDisks.reduce((acc, d) => acc + (d.size || 0), 0);
    const aggregateUsedBytes = formattedDisks.reduce((acc, d) => acc + (d.used || 0), 0);

    // 5. Real Disk I/O (MB/s)
    const rawDiskIO = dio ? (dio.rIO_sec || 0) + (dio.wIO_sec || 0) : 0;
    const diskIO = rawDiskIO > 0 ? Math.round((rawDiskIO / (1024 * 1024)) * 100) / 100 : Math.round(dio?.tIO_sec || 0);

    // 6. Real Battery (Desktop systems: hasBattery = false, show N/A)
    const hasBattery = Boolean(battery?.hasBattery);
    const batteryPercent = hasBattery && battery?.percent !== null ? Math.round(battery.percent) : null;
    const isCharging = Boolean(battery?.isCharging);
    const acConnected = Boolean(battery?.acConnected);

    // 7. Real CPU Temperature (°C) - null if not exposed by sensors
    const cpuTemp = temp?.main && temp.main > 0 ? Math.round(temp.main) : null;

    // 8. Real Network throughput (derived from sampled interval)
    const netStat = Array.isArray(net) ? net.find((n) => n.operstate === "up") || net[0] : null;
    const downSpeed = netStat && netStat.rx_sec !== null ? Math.round(((netStat.rx_sec || 0) / (1024 * 1024)) * 100) / 100 : 0;
    const upSpeed = netStat && netStat.tx_sec !== null ? Math.round(((netStat.tx_sec || 0) / (1024 * 1024)) * 100) / 100 : 0;
    const networkMbps = netStat && netStat.rx_sec !== null ? Math.round((((netStat.rx_sec || 0) * 8) / (1000 * 1000)) * 10) / 10 : 0;
    const networkInterface = netStat?.iface || "Ethernet";
    const networkStatus = netStat?.operstate || (netStat ? "up" : "disconnected");

    // 9. Real Top Processes - FILTER OUT 'System Idle Process' as it represents idle time
    const procsList = Array.isArray(procs?.list) ? procs.list : [];
    const runningProcesses = procsList
      .filter((p) => p.name && p.name.toLowerCase() !== "system idle process")
      .map((p) => ({
        pid: p.pid,
        name: p.name,
        cpu: Math.round(p.cpu || 0),
        mem: Math.round(p.mem || 0),
      }))
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 15);

    // Format human-readable strings
    const formatGb = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";

    const metrics = {
      liveMetrics: {
        cpu: cpuLoad,
        ram: ramPercent,
        gpu: gpuPercent, // null if hardware driver does not report utilization
        temp: cpuTemp, // null if sensor not exposed
        disk: diskIO,
        diskPercent,
        batteryPercent,
        isCharging,
        hasBattery,
        acConnected,
        downSpeed,
        upSpeed,
        networkMbps,
        networkInterface,
        networkStatus,
        timestamp: new Date().toISOString(),
      },
      // Detailed hardware & system info
      cpuModel: staticInfo.cpuModel,
      cpuCores: staticInfo.cpuCores,
      cpuPhysicalCores: staticInfo.cpuPhysicalCores,
      cpuSpeed: staticInfo.cpuSpeed,
      perCoreLoads,
      ramTotalBytes: ramTotal,
      ramUsedBytes: ramUsed,
      ramAvailableBytes: ramAvailable,
      ramTotalStr: formatGb(ramTotal),
      ramUsedStr: formatGb(ramUsed),
      ramAvailableStr: formatGb(ramAvailable),
      gpuName,
      gpuVendor: staticInfo.gpuVendor,
      gpuVram,
      disks: formattedDisks,
      primaryDrive: primaryDisk?.mount || "C:",
      diskTotalBytes,
      diskUsedBytes,
      diskAvailableBytes,
      diskTotalStr: formatGb(diskTotalBytes),
      diskUsedStr: formatGb(diskUsedBytes),
      diskAvailableStr: formatGb(diskAvailableBytes),
      aggregateTotalBytes,
      aggregateUsedBytes,
      aggregateTotalStr: formatGb(aggregateTotalBytes),
      aggregateUsedStr: formatGb(aggregateUsedBytes),
      os: {
        distro: staticInfo.osDistro,
        release: staticInfo.osRelease,
        build: staticInfo.osBuild,
        arch: staticInfo.osArch,
        hostname: staticInfo.hostname,
        uptimeSeconds: Math.floor(os.uptime()),
      },
      processes: runningProcesses,
      timestamp: new Date().toISOString(),
    };

    cacheService.set(CACHE_KEY, metrics, CACHE_TTL_SEC);

    // Asynchronously record bounded telemetry snapshot in MongoDB
    recordTelemetrySnapshot(metrics).catch((err) => {
      monitorLogger.warn("Telemetry record notice: " + err.message);
    });

    return metrics;
  } catch (error) {
    monitorLogger.error("System information query error: " + error.message);
    const fallback = {
      liveMetrics: {
        cpu: 0,
        ram: 0,
        gpu: null,
        temp: null,
        disk: 0,
        diskPercent: 0,
        batteryPercent: null,
        isCharging: false,
        hasBattery: false,
        acConnected: true,
        downSpeed: 0,
        upSpeed: 0,
        networkMbps: 0,
        networkInterface: "Ethernet",
        networkStatus: "unknown",
        timestamp: new Date().toISOString(),
      },
      cpuModel: "Unavailable",
      cpuCores: 0,
      gpuName: "Unavailable",
      disks: [],
      processes: [],
      error: error.message,
      timestamp: new Date().toISOString(),
    };
    return fallback;
  }
}
