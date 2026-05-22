import { mockFlights, mockSeatsByFlightId } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Booking, Flight, SearchQuery, Seat } from "@/types/flight";

export async function searchFlights(query: Partial<SearchQuery>): Promise<Flight[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return mockFlights.filter((flight) => {
      const originMatch = !query.origin || flight.origin === query.origin;
      const destinationMatch = !query.destination || flight.destination === query.destination;
      return originMatch && destinationMatch;
    });
  }

  const { data } = await supabase
    .from("flights")
    .select("*")
    .ilike("origin", query.origin ? query.origin : "%")
    .ilike("destination", query.destination ? query.destination : "%")
    .order("departs_at", { ascending: true });

  return (data ?? []).map((flight) => ({
    id: flight.id,
    flightNo: flight.flight_no,
    origin: flight.origin,
    destination: flight.destination,
    departsAt: flight.departs_at,
    arrivesAt: flight.arrives_at,
    aircraftType: flight.aircraft_type,
    status: flight.status,
    basePrice: Number(flight.base_price),
  }));
}

export async function getFlightById(flightId: string): Promise<Flight | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return mockFlights.find((flight) => flight.id === flightId) ?? null;
  }

  const { data } = await supabase.from("flights").select("*").eq("id", flightId).maybeSingle();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    flightNo: data.flight_no,
    origin: data.origin,
    destination: data.destination,
    departsAt: data.departs_at,
    arrivesAt: data.arrives_at,
    aircraftType: data.aircraft_type,
    status: data.status,
    basePrice: Number(data.base_price),
  };
}

export async function getSeatsByFlightId(flightId: string): Promise<Seat[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return mockSeatsByFlightId[flightId] ?? [];
  }

  const { data } = await supabase.from("seats").select("*").eq("flight_id", flightId).order("seat_number");

  return (data ?? []).map((seat) => ({
    id: seat.id,
    flightId: seat.flight_id,
    seatNumber: seat.seat_number,
    class: seat.class,
    isAvailable: seat.is_available,
    extraFee: Number(seat.extra_fee),
  }));
}

export async function getBookingsByUserId(userId: string): Promise<Booking[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("bookings")
    .select("id, user_id, flight_id, seat_id, status, booked_at, total_price, pnr_code, flights(*), seats(*)")
    .eq("user_id", userId)
    .order("booked_at", { ascending: false });

  return (data ?? []).map((booking) => ({
    id: booking.id,
    userId: booking.user_id,
    flightId: booking.flight_id,
    seatId: booking.seat_id,
    status: booking.status,
    bookedAt: booking.booked_at,
    totalPrice: Number(booking.total_price),
    pnrCode: booking.pnr_code,
  }));
}
