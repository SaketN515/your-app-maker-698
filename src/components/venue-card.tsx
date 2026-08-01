import { Link } from "@tanstack/react-router";
import { type Database } from "@/integrations/supabase/types";
import { resolveVenueImage, type VenueType } from "@/lib/venue-images";

type Venue = Database["public"]["Tables"]["venues"]["Row"] & {
  image_url?: string | null;
};

const typeBadge: Record<VenueType, string> = {
  turf: "text-electric",
  gaming_cafe: "text-pulse",
  console_lounge: "text-pulse",
};

export function VenueCard({ venue }: { venue: Venue }) {
  const img = resolveVenueImage(venue.image_path, venue.image_url);

  return (
    <Link
      to="/venue/$id"
      params={{ id: venue.id }}
      className="group no-underline"
    >
      <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-surface transition-transform group-hover:scale-[1.02]">
        <img
          src={img}
          alt={venue.name}
          width={800}
          height={600}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-white">{venue.name}</h3>
          <p className="text-white/40 text-sm">
            {venue.amenities?.slice(0, 3).join(" • ") ?? "Premium venue"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className={`block font-bold ${typeBadge[venue.type]}`}>
            ${venue.price_per_hour}/hr per person
          </span>
          <span className="text-[10px] text-white/40 uppercase">
            {venue.capacity} slots
          </span>
        </div>
      </div>
    </Link>
  );
}
