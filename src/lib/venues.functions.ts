import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type VenueRow = Database["public"]["Tables"]["venues"]["Row"];
export type VenueSlotRow = Database["public"]["Tables"]["venue_slots"]["Row"];
export type VenuePublic = VenueRow & { image_url: string | null };

function createPublicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (
          key.startsWith("sb_") &&
          h.get("Authorization") === `Bearer ${key}`
        )
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Turns uploaded storage object paths into temporary viewable links. */
export async function withImageUrls(
  venues: VenueRow[],
): Promise<VenuePublic[]> {
  const uploaded = venues.filter((v) => v.image_path.includes("/"));
  if (uploaded.length === 0)
    return venues.map((v) => ({ ...v, image_url: null }));

  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data } = await supabaseAdmin.storage
    .from("venue-images")
    .createSignedUrls(
      uploaded.map((v) => v.image_path),
      60 * 60 * 24 * 7,
    );

  const map = new Map<string, string>();
  (data ?? []).forEach((entry) => {
    if (entry.path && entry.signedUrl) map.set(entry.path, entry.signedUrl);
  });

  return venues.map((v) => ({ ...v, image_url: map.get(v.image_path) ?? null }));
}

export const listVenues = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("venues")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return withImageUrls(data ?? []);
  },
);

export const getVenue = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    const { data: venue, error } = await supabase
      .from("venues")
      .select("*")
      .eq("id", data.id)
      .single();

    if (error) throw error;
    const [withUrl] = await withImageUrls([venue]);
    return withUrl!;
  });

/** Upcoming owner-defined slots for a venue, minus already-booked ones. */
export const listVenueSlots = createServerFn({ method: "GET" })
  .inputValidator((input: { venueId: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: slots, error } = await supabase
      .from("venue_slots")
      .select("*")
      .eq("venue_id", data.venueId)
      .gte("slot_date", today)
      .order("slot_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) throw error;

    const { data: booked } = await supabase
      .from("bookings")
      .select("booking_date, start_time")
      .eq("venue_id", data.venueId)
      .in("status", ["active", "used"]);

    const takenKeys = new Set(
      (booked ?? []).map((b) => `${b.booking_date}|${b.start_time}`),
    );

    return (slots ?? []).map((s) => ({
      ...s,
      taken: takenKeys.has(`${s.slot_date}|${s.start_time}`),
    }));
  });
