import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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

export const listVenues = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("venues")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
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
    return venue;
  });
