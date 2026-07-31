import turfImg from "@/assets/venue-turf.jpg";
import gamingImg from "@/assets/venue-gaming.jpg";
import consoleImg from "@/assets/venue-console.jpg";

export const venueImages: Record<string, string> = {
  turf: turfImg,
  gaming: gamingImg,
  console: consoleImg,
};

export function getVenueImage(imagePath: string): string {
  return venueImages[imagePath] ?? venueImages.turf;
}

export type VenueType = "turf" | "gaming_cafe" | "console_lounge";

export const venueTypeLabels: Record<VenueType, string> = {
  turf: "Turf Fields",
  gaming_cafe: "Gaming Cafes",
  console_lounge: "Console Lounges",
};

export const venueTypeIcons: Record<VenueType, string> = {
  turf: "⚽",
  gaming_cafe: "🎮",
  console_lounge: "🕹️",
};

export function generateBookingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (n: number) =>
    Array.from(
      { length: n },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  return `VX-${seg(4)}-${seg(1)}`;
}

export const timeSlots: { start: string; end: string; label: string }[] = [
  { start: "09:00", end: "10:00", label: "09:00" },
  { start: "10:00", end: "11:00", label: "10:00" },
  { start: "11:00", end: "12:00", label: "11:00" },
  { start: "12:00", end: "13:00", label: "12:00" },
  { start: "13:00", end: "14:00", label: "13:00" },
  { start: "14:00", end: "15:00", label: "14:00" },
  { start: "15:00", end: "16:00", label: "15:00" },
  { start: "16:00", end: "17:00", label: "16:00" },
  { start: "17:00", end: "18:00", label: "17:00" },
  { start: "18:00", end: "19:00", label: "18:00" },
  { start: "19:00", end: "20:00", label: "19:00" },
  { start: "20:00", end: "21:00", label: "20:00" },
  { start: "21:00", end: "22:00", label: "21:00" },
  { start: "22:00", end: "23:00", label: "22:00" },
];

export function getNext7Days(): { date: string; label: string; sub: string }[] {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const sub = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    days.push({ date: dateStr, label, sub });
  }
  return days;
}

export function formatBookingDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getExpiresIn(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
