import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateBookingCode } from "./venue-images";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      venueId: string;
      bookingDate: string;
      startTime: string;
      endTime: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const expiresAt = new Date(
      `${data.bookingDate}T${data.endTime}:00`,
    ).toISOString();

    let code = generateBookingCode();
    let attempts = 0;
    let result: BookingRow | null = null;
    let lastError: unknown = null;

    while (attempts < 5 && !result) {
      const { data: booking, error } = await context.supabase
        .from("bookings")
        .insert({
          venue_id: data.venueId,
          user_id: context.userId,
          booking_date: data.bookingDate,
          start_time: data.startTime,
          end_time: data.endTime,
          code,
          expires_at: expiresAt,
        })
        .select("*")
        .single();

      if (error) {
        lastError = error;
        if (
          typeof error.message === "string" &&
          error.message.includes("duplicate")
        ) {
          code = generateBookingCode();
          attempts++;
          continue;
        }
        throw error;
      }
      if (booking) result = booking;
    }

    if (!result) {
      throw lastError ?? new Error("Failed to create booking");
    }
    return result;
  });

export const getMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Expire any active bookings whose time has passed
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    await supabaseAdmin
      .from("bookings")
      .update({ status: "expired" })
      .eq("user_id", context.userId)
      .eq("status", "active")
      .lt("expires_at", new Date().toISOString());

    const { data, error } = await context.supabase
      .from("bookings")
      .select("*, venues(name, type, image_path)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  });

export type VerifyResult = {
  success: boolean;
  message: string;
  booking?: {
    id: string;
    code: string;
    status: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    venue_name: string;
    venue_type: string;
    user_email?: string;
  };
};

export const verifyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const code = data.code.toUpperCase().trim();

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select("*, venues(name, type)")
      .eq("code", code)
      .maybeSingle();

    if (error || !booking) {
      return {
        success: false,
        message: "Invalid code — no ticket found",
      } satisfies VerifyResult;
    }

    const venueData = booking.venues as { name: string; type: string };

    if (booking.status === "used") {
      return {
        success: false,
        message: "This ticket has already been used",
        booking: {
          id: booking.id,
          code: booking.code,
          status: booking.status,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          venue_name: venueData.name,
          venue_type: venueData.type,
        },
      } satisfies VerifyResult;
    }

    if (
      booking.status === "expired" ||
      new Date(booking.expires_at) < new Date()
    ) {
      await supabaseAdmin
        .from("bookings")
        .update({ status: "expired" })
        .eq("id", booking.id);
      return {
        success: false,
        message: "This ticket has expired",
        booking: {
          id: booking.id,
          code: booking.code,
          status: "expired",
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          venue_name: venueData.name,
          venue_type: venueData.type,
        },
      } satisfies VerifyResult;
    }

    if (booking.status === "cancelled") {
      return {
        success: false,
        message: "This ticket was cancelled",
        booking: {
          id: booking.id,
          code: booking.code,
          status: booking.status,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          venue_name: venueData.name,
          venue_type: venueData.type,
        },
      } satisfies VerifyResult;
    }

    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({ status: "used" })
      .eq("id", booking.id);

    if (updateError) {
      return {
        success: false,
        message: "Failed to verify ticket — try again",
      } satisfies VerifyResult;
    }

    return {
      success: true,
      message: "Ticket verified! Entry granted.",
      booking: {
        id: booking.id,
        code: booking.code,
        status: "used",
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        venue_name: venueData.name,
        venue_type: venueData.type,
      },
    } satisfies VerifyResult;
  });
