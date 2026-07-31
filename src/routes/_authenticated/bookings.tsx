import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMyBookings } from "@/lib/bookings.functions";
import { TicketCard } from "@/components/ticket-card";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings — VELOCITY" },
      {
        name: "description",
        content: "View your active and past booking tickets.",
      },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const { data: bookings, isPending } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => getMyBookings(),
  });

  const active = bookings?.filter((b) => b.status === "active") ?? [];
  const past =
    bookings?.filter((b) => b.status !== "active").slice(0, 10) ?? [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold tracking-tighter text-white mb-8">
        MY TICKETS
      </h1>

      {isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 bg-surface rounded-3xl animate-pulse"
            />
          ))}
        </div>
      ) : bookings && bookings.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/30 text-lg">No bookings yet.</p>
          <p className="text-white/20 text-sm mt-2">
            Browse venues and book your first slot.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-[10px] uppercase tracking-widest text-pulse mb-4">
                Active Passes
              </h2>
              <div className="space-y-4">
                {active.map((b) => (
                  <TicketCard key={b.id} booking={b} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-[10px] uppercase tracking-widest text-white/30 mb-4 mt-8">
                History
              </h2>
              <div className="space-y-4">
                {past.map((b) => (
                  <TicketCard key={b.id} booking={b} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
