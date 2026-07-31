import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listVenues } from "@/lib/venues.functions";
import { VenueCard } from "@/components/venue-card";
import type { VenueType } from "@/lib/venue-images";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VELOCITY — Book Turf & Gaming Venues" },
      {
        name: "description",
        content:
          "Browse and book turf fields, gaming cafes, and console lounges by the hour.",
      },
    ],
  }),
  component: Index,
});

const categories: { key: VenueType | "all"; label: string }[] = [
  { key: "all", label: "All Venues" },
  { key: "turf", label: "Turf Fields" },
  { key: "gaming_cafe", label: "Gaming Cafes" },
  { key: "console_lounge", label: "Console Lounges" },
];

function Index() {
  const [filter, setFilter] = useState<VenueType | "all">("all");
  const { data: venues, isPending } = useQuery({
    queryKey: ["venues"],
    queryFn: () => listVenues(),
  });

  const filtered =
    filter === "all"
      ? venues
      : venues?.filter((v) => v.type === filter);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Hero */}
      <section className="mb-12">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white leading-none">
          BOOK YOUR
          <br />
          <span className="text-electric">PLAY TIME</span>
        </h1>
        <p className="mt-4 text-white/40 text-lg max-w-xl">
          Reserve turf fields, gaming cafes, and console lounges by the hour.
          Instant tickets. Verifiable codes. Zero hassle.
        </p>
      </section>

      {/* Category filter */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-5 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-colors ${
              filter === cat.key
                ? "bg-electric text-void"
                : "bg-white/5 text-white/50 border border-white/10 hover:text-white hover:border-white/20"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Venue grid */}
      {isPending ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="w-full aspect-[4/3] rounded-2xl bg-surface animate-pulse mb-4" />
              <div className="h-6 bg-surface rounded animate-pulse w-2/3 mb-2" />
              <div className="h-4 bg-surface rounded animate-pulse w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered?.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      )}

      <footer className="mt-20 pt-8 border-t border-white/10 text-center text-white/30 text-sm">
        VELOCITY — Play hard. Book smart.
      </footer>
    </div>
  );
}
