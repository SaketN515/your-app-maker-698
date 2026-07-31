import { type Database } from "@/integrations/supabase/types";
import { getVenueImage, formatBookingDate, getExpiresIn } from "@/lib/venue-images";

type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  venues?: { name: string; type: string; image_path: string } | null;
};

const statusConfig = {
  active: {
    label: "ACTIVE",
    color: "text-pulse",
    bg: "bg-pulse/10",
    border: "border-pulse/30",
  },
  used: {
    label: "USED",
    color: "text-white/40",
    bg: "bg-white/5",
    border: "border-white/10",
  },
  expired: {
    label: "EXPIRED",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
  },
  cancelled: {
    label: "CANCELLED",
    color: "text-white/40",
    bg: "bg-white/5",
    border: "border-white/10",
  },
};

export function TicketCard({ booking }: { booking: Booking }) {
  const status =
    statusConfig[booking.status as keyof typeof statusConfig] ??
    statusConfig.active;
  const venueName = booking.venues?.name ?? "Unknown Venue";
  const venueImage = booking.venues
    ? getVenueImage(booking.venues.image_path)
    : getVenueImage("turf");
  const isActive = booking.status === "active";
  const isDim = booking.status === "used" || booking.status === "expired";

  return (
    <div
      className={`relative bg-surface border ${
        isActive ? "border-electric/30" : "border-white/10"
      } rounded-3xl overflow-hidden ${isDim ? "opacity-50" : ""}`}
    >
      {/* Ticket content */}
      <div className="p-6 flex flex-col sm:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div
            className={`inline-block text-[10px] font-bold uppercase tracking-widest mb-3 px-2 py-1 rounded ${status.bg} ${status.color} ${status.border} border`}
          >
            {status.label}
          </div>
          <h3 className="text-2xl font-bold mb-1 truncate">{venueName}</h3>
          <p className="text-white/60 mb-5 text-sm">
            {formatBookingDate(booking.booking_date)} | {booking.start_time.slice(0, 5)} -{" "}
            {booking.end_time.slice(0, 5)}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-void/50 rounded-xl border border-white/5">
              <span className="block text-[10px] text-white/30 uppercase mb-1">
                Access Code
              </span>
              <span className="text-lg font-mono text-pulse tracking-tighter">
                {booking.code}
              </span>
            </div>
            <div className="p-3 bg-void/50 rounded-xl border border-white/5">
              <span className="block text-[10px] text-white/30 uppercase mb-1">
                {isActive ? "Expires In" : "Status"}
              </span>
              <span className="text-lg font-mono text-white tracking-tighter">
                {isActive ? getExpiresIn(booking.expires_at) : status.label}
              </span>
            </div>
          </div>
        </div>

        {/* Venue thumbnail */}
        <div className="w-full sm:w-32 shrink-0">
          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-void/50">
            <img
              src={venueImage}
              alt={venueName}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Decorative punch-outs */}
      <div className="absolute -left-4 top-1/2 -translate-y-1/2 size-8 bg-background rounded-full border border-white/10" />
      <div className="absolute -right-4 top-1/2 -translate-y-1/2 size-8 bg-background rounded-full border border-white/10" />
    </div>
  );
}
