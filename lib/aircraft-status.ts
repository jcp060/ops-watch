import {
  type AircraftStatus,
  WARNING_THRESHOLD_MS,
} from "./types";

export function getAircraftStatus(dueAt: number, now = Date.now()): AircraftStatus {
  const remaining = dueAt - now;
  if (remaining <= 0) return "OVERDUE";
  if (remaining <= WARNING_THRESHOLD_MS) return "WARNING";
  return "ACTIVE";
}

export function formatCountdown(dueAt: number, now = Date.now()): string {
  const diff = dueAt - now;
  const overdue = diff <= 0;
  const totalSeconds = Math.floor(Math.abs(diff) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return overdue ? `-${formatted}` : formatted;
}

export function formatLastVerified(timestamp: number, now = Date.now()): string {
  const diff = now - timestamp;
  if (diff < 60_000) return "Just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
