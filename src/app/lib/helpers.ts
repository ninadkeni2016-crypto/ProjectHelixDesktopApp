import {
  Calendar,
  CloudUpload,
  Download,
  FileText,
  Image,
  Layers,
  type LucideIcon,
} from "lucide-react";

const timelineIconMap: Record<string, LucideIcon> = {
  Download,
  Calendar,
  Image,
  FileText,
  Layers,
  CloudUpload,
};

export function getTimelineIcon(iconType: string): LucideIcon {
  return timelineIconMap[iconType] ?? FileText;
}

export function getUserInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "U";
}

export function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "User";
}
