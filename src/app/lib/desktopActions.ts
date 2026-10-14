import api from "./api";
import { toast } from "sonner";

declare global {
  interface Window {
    helixDesktop?: {
      isElectron?: boolean;
      openFile: (path: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      showInFolder: (path: string) => Promise<{ success: boolean; path?: string; error?: string }>;
    };
  }
}

/**
 * Open a file safely using Electron IPC if available, or fallback to the authenticated backend endpoint.
 */
export async function openFileSafely(fileId?: string, filePath?: string): Promise<boolean> {
  // If running inside Electron desktop container and filePath is available
  if (window.helixDesktop?.openFile && filePath) {
    try {
      const res = await window.helixDesktop.openFile(filePath);
      if (res.success) {
        toast.success(`Opened: ${filePath.split(/[/\\]/).pop()}`);
        return true;
      } else {
        toast.error(`Unable to open file: ${res.error}`);
        return false;
      }
    } catch (e: any) {
      toast.error(`Desktop action error: ${e.message}`);
      return false;
    }
  }

  // Fallback to authenticated backend API
  try {
    const res = await api.post("/files/open", { fileId, filePath });
    if (res.data?.success) {
      toast.success(res.data.message || "File launched in default viewer");
      return true;
    }
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || "Failed to launch file";
    toast.error(msg);
  }
  return false;
}

/**
 * Reveal the file's containing folder in Windows Explorer or default OS file manager.
 */
export async function showInFolderSafely(fileId?: string, filePath?: string): Promise<boolean> {
  if (window.helixDesktop?.showInFolder && filePath) {
    try {
      const res = await window.helixDesktop.showInFolder(filePath);
      if (res.success) {
        toast.success("Opened containing folder");
        return true;
      } else {
        toast.error(`Unable to open folder: ${res.error}`);
        return false;
      }
    } catch (e: any) {
      toast.error(`Desktop action error: ${e.message}`);
      return false;
    }
  }

  try {
    const res = await api.post("/files/reveal", { fileId, filePath });
    if (res.data?.success) {
      toast.success(res.data.message || "Containing folder opened");
      return true;
    }
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || "Failed to reveal folder";
    toast.error(msg);
  }
  return false;
}

/**
 * Safely move / organize selected files into a destination folder.
 */
export async function organizeFilesSafely(
  fileIds: string[],
  targetFolder: string,
  confirm: boolean
): Promise<{ success: boolean; requiresConfirmation?: boolean; preview?: any[]; message?: string; movedCount?: number }> {
  try {
    const res = await api.post("/files/organize", { fileIds, targetFolder, confirm });
    return res.data;
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || "Failed to organize files";
    toast.error(msg);
    return { success: false, message: msg };
  }
}
