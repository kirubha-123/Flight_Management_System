import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const bookingRequestSchema = z.object({
  flightId: z.string().uuid(),
  seatId: z.string().uuid(),
  userId: z.string().uuid(),
  totalPrice: z.number().nonnegative(),
  passenger: z.object({
    fullName: z.string().min(1),
    passportNo: z.string().min(1),
    nationality: z.string().min(1),
    dob: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server booking API is missing Supabase configuration." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bookingRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking payload." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: seatRow, error: seatReadError } = await supabase
    .from("seats")
    .select("id, is_available")
    .eq("id", parsed.data.seatId)
    .eq("flight_id", parsed.data.flightId)
    .single();

  if (seatReadError || !seatRow) {
    return NextResponse.json({ error: "Seat not found." }, { status: 404 });
  }

  if (!seatRow.is_available) {
    return NextResponse.json({ error: "Seat is already reserved." }, { status: 409 });
  }

  const { error: seatUpdateError } = await supabase
    .from("seats")
    .update({ is_available: false })
    .eq("id", parsed.data.seatId)
    .eq("is_available", true);

  if (seatUpdateError) {
    return NextResponse.json({ error: seatUpdateError.message }, { status: 400 });
  }

  const { data: bookingRow, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      user_id: parsed.data.userId,
      flight_id: parsed.data.flightId,
      seat_id: parsed.data.seatId,
      status: "confirmed",
      total_price: parsed.data.totalPrice,
    })
    .select("id, user_id, flight_id, seat_id, status, booked_at, total_price, pnr_code")
    .single();

  if (bookingError || !bookingRow) {
    await supabase.from("seats").update({ is_available: true }).eq("id", parsed.data.seatId);
    return NextResponse.json({ error: bookingError?.message ?? "Unable to reserve seat." }, { status: 400 });
  }

  const { error: passengerError } = await supabase.from("passengers").insert({
    booking_id: bookingRow.id,
    full_name: parsed.data.passenger.fullName,
    passport_no: parsed.data.passenger.passportNo,
    nationality: parsed.data.passenger.nationality,
    dob: parsed.data.passenger.dob,
  });

  if (passengerError) {
    await supabase.from("bookings").delete().eq("id", bookingRow.id);
    await supabase.from("seats").update({ is_available: true }).eq("id", parsed.data.seatId);
    return NextResponse.json({ error: passengerError.message }, { status: 400 });
  }

  return NextResponse.json({
    booking: bookingRow,
  });
}
