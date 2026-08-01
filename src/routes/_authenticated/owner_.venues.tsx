import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMyVenues,
  addVenueSlots,
  deleteVenueSlot,
} from "@/lib/owner.functions";
import {
  resolveVenueImage,
  getNextDays,
  timeSlots,
  formatBookingDate,
  venueTypeIcons,
  type VenueType,
} from "@/lib/venue-images";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/owner_/venues")({
  head: () => ({
    meta: [
      { title: "My Venues — VELOCITY" },
      {
        name: "description",
        content: "Manage your venues, open slots and prices.",
      },
    ],
  }),
  component: MyVenuesPage,
});

function MyVenuesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addSlotsFn = useServerFn(addVenueSlots);
  const deleteSlotFn = useServerFn(deleteVenueSlot);
  const [openVenue, setOpenVenue] = useState<string | null>(null);

  const { data: venues, isPending } = useQuery({
    queryKey: ["my-venues"],
    queryFn: () => listMyVenues(),
  });

  useEffect(() => {
    if (!isPending && venues && venues.length === 0) {
      navigate({ to: "/owner/setup", replace: true });
    }
  }, [isPending, venues, navigate]);

  const days = getNextDays(14);
  const [slotDate, setSlotDate] = useState(days[0]?.date ?? "");
  const [price, setPrice] = useState(10);
  const [hours, setHours] = useState<string[]>([]);

  const addMutation = useMutation({
    mutationFn: async (venueId: string) => {
      const payload = hours.flatMap((start) => {
        const slot = timeSlots.find((s) => s.start === start);
        return slot
          ? [{ date: slotDate, start: slot.start, end: slot.end, price }]
          : [];
      });
      if (payload.length === 0) throw new Error("Pick at least one hour");
      return addSlotsFn({ data: { venueId, slots: payload } });
    },
    onSuccess: async () => {
      setHours([]);
      toast.success("Slots added");
      await queryClient.invalidateQueries({ queryKey: ["my-venues"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not add slots"),
  });

  const deleteMutation = useMutation({
    mutationFn: (slotId: string) => deleteSlotFn({ data: { slotId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-venues"] });
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold tracking-tighter text-white">
          MY VENUES
        </h1>
        <Link
          to="/owner/setup"
          className="px-5 py-2.5 bg-electric text-void font-bold rounded-full text-xs uppercase tracking-widest no-underline"
        >
          + Add venue
        </Link>
      </div>

      {isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-52 bg-surface rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {(venues ?? []).map((venue) => (
            <div
              key={venue.id}
              className="bg-surface rounded-3xl border border-white/10 overflow-hidden"
            >
              <div className="flex gap-4 p-4">
                <img
                  src={resolveVenueImage(venue.image_path, venue.image_url)}
                  alt={venue.name}
                  className="size-24 rounded-2xl object-cover bg-void"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/40 uppercase tracking-widest">
                    {venueTypeIcons[venue.type as VenueType]} {venue.type}
                  </p>
                  <h2 className="text-xl font-bold text-white truncate">
                    {venue.name}
                  </h2>
                  <p className="text-white/40 text-sm">
                    {venue.slots.length} upcoming slots · from $
                    {venue.price_per_hour}/person
                  </p>
                </div>
              </div>

              {venue.slots.length > 0 && (
                <div className="px-4 pb-4 space-y-2">
                  {Array.from(new Set(venue.slots.map((s) => s.slot_date))).map(
                    (date) => (
                      <div key={date} className="bg-void/40 rounded-2xl p-3">
                        <p className="text-white text-sm font-medium mb-2">
                          {formatBookingDate(date)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {venue.slots
                            .filter((s) => s.slot_date === date)
                            .map((s) => (
                              <button
                                key={s.id}
                                title="Remove slot"
                                onClick={() => deleteMutation.mutate(s.id)}
                                className="px-3 py-1.5 rounded-lg bg-pulse/15 border border-pulse/30 text-pulse font-mono text-xs hover:bg-destructive/20 hover:border-destructive/40 hover:text-destructive transition-colors"
                              >
                                {s.start_time.slice(0, 5)} · $
                                {s.price_per_person} ✕
                              </button>
                            ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              <div className="border-t border-white/10 p-4">
                {openVenue === venue.id ? (
                  <>
                    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">
                      Day
                    </p>
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                      {days.map((day) => (
                        <button
                          key={day.date}
                          onClick={() => setSlotDate(day.date)}
                          className={`shrink-0 px-3 py-2 rounded-xl text-center min-w-[68px] transition-colors ${
                            slotDate === day.date
                              ? "bg-electric text-void"
                              : "bg-void/50 text-white/50 border border-white/10"
                          }`}
                        >
                          <span className="block text-xs font-bold">
                            {day.label}
                          </span>
                          <span className="block text-[10px] opacity-70">
                            {day.sub}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot.start}
                          onClick={() =>
                            setHours((prev) =>
                              prev.includes(slot.start)
                                ? prev.filter((h) => h !== slot.start)
                                : [...prev, slot.start],
                            )
                          }
                          className={`py-2 rounded-xl text-xs font-mono font-bold transition-colors ${
                            hours.includes(slot.start)
                              ? "bg-pulse text-void"
                              : "bg-void/50 text-white/50 border border-white/10"
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                          $
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value) || 0)}
                          className="w-full pl-8 pr-4 py-3 bg-void/60 border border-white/10 rounded-xl text-white focus:border-electric focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => addMutation.mutate(venue.id)}
                        disabled={addMutation.isPending}
                        className="px-6 bg-pulse text-void font-bold rounded-xl uppercase tracking-widest text-xs disabled:opacity-40"
                      >
                        Save slots
                      </button>
                      <button
                        onClick={() => setOpenVenue(null)}
                        className="px-4 border border-white/15 text-white/50 rounded-xl text-xs uppercase tracking-widest"
                      >
                        Close
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setOpenVenue(venue.id);
                      setHours([]);
                      setPrice(venue.price_per_hour);
                    }}
                    className="text-sm font-bold uppercase tracking-widest text-electric"
                  >
                    + Add slots & prices
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
