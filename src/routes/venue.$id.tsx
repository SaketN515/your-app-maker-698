import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getVenue, listVenues } from "@/lib/venues.functions";
import { createBooking } from "@/lib/bookings.functions";
import {
  getVenueImage,
  getNext7Days,
  timeSlots,
  formatBookingDate,
} from "@/lib/venue-images";
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
  const [selectedDay, setSelectedDay] = useState(getNext7Days()[0]?.date ?? "");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const createBookingFn = useServerFn(createBooking);

  const { data: venue, isPending } = useQuery({
    queryKey: ["venue", id],
    queryFn: () => getVenue({ data: { id } }),
  });

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => supabase.auth.getUser(),
  });

  const days = getNext7Days();

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot) throw new Error("Select a time slot");
      const slot = timeSlots.find((s) => s.start === selectedSlot);
      if (!slot) throw new Error("Invalid slot");
      return createBookingFn({
        data: {
          venueId: id,
          bookingDate: selectedDay,
          startTime: slot.start,
          endTime: slot.end,
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

  const img = getVenueImage(venue.image_path);
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
            ${venue.price_per_hour}
          </span>
          <span className="text-white/30 text-sm block">per hour</span>
        </div>
      </div>

      {/* Booking section */}
      <div className="bg-surface rounded-3xl p-6 border border-white/10">
        <h2 className="text-xl font-bold text-white mb-6">Pick your slot</h2>

        {/* Day picker */}
        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">
          Select Date
        </p>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {days.map((day) => (
            <button
              key={day.date}
              onClick={() => setSelectedDay(day.date)}
              className={`shrink-0 px-4 py-3 rounded-xl text-center transition-colors min-w-[80px] ${
                selectedDay === day.date
                  ? "bg-electric text-void"
                  : "bg-void/50 text-white/50 border border-white/10 hover:text-white"
              }`}
            >
              <span className="block text-sm font-bold">{day.label}</span>
              <span className="block text-xs opacity-70">{day.sub}</span>
            </button>
          ))}
        </div>

        {/* Time slot picker */}
        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">
          Select Time (1 hour slots)
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-8">
          {timeSlots.map((slot) => (
            <button
              key={slot.start}
              onClick={() => setSelectedSlot(slot.start)}
              className={`px-3 py-3 rounded-xl text-sm font-mono font-bold transition-colors ${
                selectedSlot === slot.start
                  ? "bg-pulse text-void"
                  : "bg-void/50 text-white/50 border border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              {slot.label}
            </button>
          ))}
        </div>

        {/* Summary + book button */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-white/10">
          <div>
            <p className="text-white/40 text-sm">
              {formatBookingDate(selectedDay)} at{" "}
              {selectedSlot ? selectedSlot : "--:--"}
            </p>
            <p className="text-2xl font-bold text-electric mt-1">
              ${venue.price_per_hour}
            </p>
          </div>
          {isLoggedIn ? (
            <button
              disabled={!selectedSlot || bookingMutation.isPending}
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
