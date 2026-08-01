import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withImageUrls } from "./venues.functions";
import type { Database } from "@/integrations/supabase/types";

type VenueType = Database["public"]["Enums"]["venue_type"];

export type SlotInput = {
  date: string;
  start: string;
  end: string;
  price: number;
};

/** Grants the owner role to the signed-in user (idempotent). */
export const becomeOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: context.userId, role: "owner" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    if (error) throw error;
    return { ok: true };
  });

export const createVenueWithSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      name: string;
      type: VenueType;
      description?: string;
      address?: string;
      capacity: number;
      imagePath: string;
      slots: SlotInput[];
    }) => {
      if (!input.name.trim()) throw new Error("Venue name is required");
      if (!input.imagePath) throw new Error("A venue photo is required");
      if (!input.slots || input.slots.length === 0)
        throw new Error("Add at least one slot");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const prices = data.slots.map((s) => Math.max(0, Math.round(s.price)));
    const minPrice = Math.min(...prices);

    const { data: venue, error } = await context.supabase
      .from("venues")
      .insert({
        name: data.name.trim().slice(0, 120),
        type: data.type,
        description: data.description?.trim().slice(0, 500) ?? null,
        address: data.address?.trim().slice(0, 200) ?? null,
        capacity: Math.max(1, Math.min(500, Math.floor(data.capacity))),
        image_path: data.imagePath,
        price_per_hour: minPrice,
        owner_id: context.userId,
        is_active: true,
      })
      .select("*")
      .single();
    if (error) throw error;

    const { error: slotError } = await context.supabase
      .from("venue_slots")
      .insert(
        data.slots.map((s) => ({
          venue_id: venue.id,
          slot_date: s.date,
          start_time: s.start,
          end_time: s.end,
          price_per_person: Math.max(0, Math.round(s.price)),
        })),
      );
    if (slotError) throw slotError;

    return venue;
  });

export const listMyVenues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("venues")
      .select("*")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const venues = await withImageUrls(data ?? []);
    const ids = venues.map((v) => v.id);
    if (ids.length === 0) return [];

    const { data: slots } = await context.supabase
      .from("venue_slots")
      .select("*")
      .in("venue_id", ids)
      .gte("slot_date", new Date().toISOString().slice(0, 10))
      .order("slot_date", { ascending: true })
      .order("start_time", { ascending: true });

    return venues.map((v) => ({
      ...v,
      slots: (slots ?? []).filter((s) => s.venue_id === v.id),
    }));
  });

export const addVenueSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { venueId: string; slots: SlotInput[] }) => {
    if (!input.slots?.length) throw new Error("Add at least one slot");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("venue_slots").upsert(
      data.slots.map((s) => ({
        venue_id: data.venueId,
        slot_date: s.date,
        start_time: s.start,
        end_time: s.end,
        price_per_person: Math.max(0, Math.round(s.price)),
      })),
      { onConflict: "venue_id,slot_date,start_time" },
    );
    if (error) throw error;
    return { ok: true };
  });

export const deleteVenueSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slotId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("venue_slots")
      .delete()
      .eq("id", data.slotId);
    if (error) throw error;
    return { ok: true };
  });
