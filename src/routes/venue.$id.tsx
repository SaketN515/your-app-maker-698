import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getVenue, listVenueSlots } from "@/lib/venues.functions";
import { createBooking } from "@/lib/bookings.functions";
import { resolveVenueImage, formatBookingDate } from "@/lib/venue-images";
import { toast } from "sonner";

export const Route = createFileRoute("/venue/$id")({
  head: () => ({
    meta: [
      { title: "Book Venue — VELOCITY" },
      {
        name: "description",
        content: "Book this venue for an hour and get an instant ticket.",
      },
    ],
  }),
  component: VenueDetail,
});

function VenueDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(1);
  const createBookingFn = useServerFn(createBooking);

  const { data: venue, isPending } = useQuery({
    queryKey: ["venue", id],
    queryFn: () => getVenue({ data: { id } }),
  });

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => supabase.auth.getUser(),
  });

  const { data: slots } = useQuery({
    queryKey: ["venue-slots", id],
    queryFn: () => listVenueSlots({ data: { venueId: id } }),
  });

  const slotDates = Array.from(new Set((slots ?? []).map((s) => s.slot_date)));
  const activeDay = selectedDay ?? slotDates[0] ?? "";
  const daySlots = (slots ?? []).filter((s) => s.slot_date === activeDay);
  const chosen = daySlots.find((s) => s.start_time === selectedSlot) ?? null;
  const unitPrice = chosen?.price_per_person ?? venue?.price_per_hour ?? 0;

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!chosen) throw new Error("Select a time slot");
      return createBookingFn({
        data: {
          venueId: id,
          bookingDate: chosen.slot_date,
          startTime: chosen.start_time.slice(0, 5),
          endTime: chosen.end_time.slice(0, 5),
          partySize,
        },
      });
    },
    onSuccess: (booking) => {
      toast.success(`Ticket booked! Code: ${booking.code}`);
      navigate({ to: "/bookings" });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Booking failed. Try again.",
      );
    },
  });

  if (isPending || !venue) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="w-full aspect-[16/9] rounded-3xl bg-surface animate-pulse mb-8" />
        <div className="h-10 bg-surface rounded animate-pulse w-1/2 mb-4" />
        <div className="h-6 bg-surface rounded animate-pulse w-1/3" />
      </div>
    );
  }

  const img = resolveVenueImage(venue.image_path, venue.image_url);
  const isLoggedIn = !!user?.data?.user;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <Link
        to="/"
        className="text-sm text-white/40 hover:text-white transition-colors mb-6 inline-block"
      >
        ← Back to venues
      </Link>

      {/* Hero image */}
      <div className="w-full aspect-[16/9] rounded-3xl overflow-hidden mb-8 bg-surface">
        <img
          src={img}
          alt={venue.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Venue info */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white">{venue.name}</h1>
          <p className="text-white/40 mt-2">
            {venue.amenities?.join(" • ") ?? "Premium venue"}
          </p>
          <p className="text-white/30 mt-1 text-sm">
            Capacity: {venue.capacity} players
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-3xl font-bold text-electric">
            ${venue.price_per_hour}+
          </span>
          <span className="text-white/30 text-sm block">
            per person / hour
          </span>
        </div>
      </div>

      {/* Booking section */}
      <div className="bg-surface rounded-3xl p-6 border border-white/10">
        <h2 className="text-xl font-bold text-white mb-6">Pick your slot</h2>

        {slotDates.length === 0 ? (
          <p className="text-white/40 text-sm mb-2">
            The owner hasn't opened any slots yet. Check back soon.
          </p>
        ) : (
          <>
            {/* Day picker */}
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">
              Select Date
            </p>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {slotDates.map((date) => {
                const d = new Date(date + "T00:00:00");
                return (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDay(date);
                      setSelectedSlot(null);
                    }}
                    className={`shrink-0 px-4 py-3 rounded-xl text-center transition-colors min-w-[80px] ${
                      activeDay === date
                        ? "bg-electric text-void"
                        : "bg-void/50 text-white/50 border border-white/10 hover:text-white"
                    }`}
                  >
                    <span className="block text-sm font-bold">
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className="block text-xs opacity-70">
                      {d.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Time slot picker */}
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">
              Select Time (1 hour slots)
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-8">
              {daySlots.map((slot) => (
                <button
                  key={slot.id}
                  disabled={slot.taken}
                  onClick={() => setSelectedSlot(slot.start_time)}
                  className={`px-3 py-3 rounded-xl text-sm font-mono font-bold transition-colors ${
                    selectedSlot === slot.start_time
                      ? "bg-pulse text-void"
                      : slot.taken
                        ? "bg-void/30 text-white/20 border border-white/5 line-through cursor-not-allowed"
                        : "bg-void/50 text-white/50 border border-white/10 hover:text-white hover:border-white/20"
                  }`}
                >
                  <span className="block">{slot.start_time.slice(0, 5)}</span>
                  <span className="block text-[10px] font-sans opacity-70">
                    ${slot.price_per_person}/person
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Party size picker */}
        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">
          How many people
        </p>
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            aria-label="Decrease people"
            onClick={() => setPartySize((n) => Math.max(1, n - 1))}
            disabled={partySize <= 1}
            className="size-11 rounded-full border border-white/10 bg-void/50 text-white text-xl font-bold hover:border-white/30 disabled:opacity-30"
          >
            −
          </button>
          <span className="text-2xl font-mono font-bold text-white w-10 text-center">
            {partySize}
          </span>
          <button
            type="button"
            aria-label="Increase people"
            onClick={() =>
              setPartySize((n) => Math.min(venue.capacity ?? 20, n + 1))
            }
            disabled={partySize >= (venue.capacity ?? 20)}
            className="size-11 rounded-full border border-white/10 bg-void/50 text-white text-xl font-bold hover:border-white/30 disabled:opacity-30"
          >
            +
          </button>
          <span className="text-xs text-white/30">
            Max {venue.capacity ?? 20}
          </span>
        </div>

        {/* Summary + book button */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-white/10">
          <div>
            <p className="text-white/40 text-sm">
              {activeDay ? formatBookingDate(activeDay) : "No slots"} at{" "}
              {selectedSlot ? selectedSlot.slice(0, 5) : "--:--"}
            </p>
            <p className="text-2xl font-bold text-electric mt-1">
              ${unitPrice * partySize}
            </p>
            <p className="text-white/30 text-xs">
              ${unitPrice} × {partySize}{" "}
              {partySize === 1 ? "person" : "people"}
            </p>
          </div>
          {isLoggedIn ? (
            <button
              disabled={!chosen || bookingMutation.isPending}
              onClick={() => bookingMutation.mutate()}
              className="w-full sm:w-auto px-8 py-4 bg-electric text-void font-bold rounded-full uppercase tracking-widest text-sm transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {bookingMutation.isPending
                ? "Booking..."
                : "Book & Get Ticket"}
            </button>
          ) : (
            <Link
              to="/auth"
              className="w-full sm:w-auto px-8 py-4 bg-electric text-void font-bold rounded-full uppercase tracking-widest text-sm text-center no-underline transition-opacity hover:opacity-90"
            >
              Sign In to Book
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
