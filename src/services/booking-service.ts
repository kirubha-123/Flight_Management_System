import { formatISO } from "date-fns";
import { mockBookings, mockFlights, mockSeatsByFlightId } from "@/lib/mock-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Booking, BookingPassenger, Flight, Seat } from "@/types/flight";

export function calculateTotalPrice(flight: Flight, seat: Seat) {
  return flight.basePrice + seat.extraFee;
}

export async function reserveSeat(params: {
  flight: Flight;
  seat: Seat;
  passenger: BookingPassenger;
  userId: string;
}): Promise<Booking> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return {
      id: `booking-${Date.now()}`,
      userId: params.userId,
      flightId: params.flight.id,
      seatId: params.seat.id,
      status: "confirmed",
      bookedAt: new Date().toISOString(),
      totalPrice: calculateTotalPrice(params.flight, params.seat),
      pnrCode: `FM${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      flight: params.flight,
      seat: params.seat,
      passenger: params.passenger,
    };
  }

  const response = await fetch("/api/bookings/reserve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      flightId: params.flight.id,
      seatId: params.seat.id,
      userId: params.userId,
      totalPrice: calculateTotalPrice(params.flight, params.seat),
      passenger: params.passenger,
    }),
  });

  const data = (await response.json()) as { booking?: Booking; error?: string };

  if (!response.ok || !data.booking) {
    throw new Error(data.error ?? "Unable to reserve seat");
  }

  return data.booking;
}

export async function cancelBooking(bookingId: string) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { success: true };
  }

  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}

export async function rescheduleBooking(params: {
  bookingId: string;
  oldFlight: Flight;
  newFlight: Flight;
  seat: Seat;
  userId: string;
}) {
  const feeCharged = 75;
  const booking = await reserveSeat({
    flight: params.newFlight,
    seat: params.seat,
    passenger: { fullName: "Transfer Passenger", passportNo: "TRANSFER-ONLY", nationality: "Unknown", dob: "2000-01-01" },
    userId: params.userId,
  });

  return {
    id: `reschedule-${params.bookingId}`,
    bookingId: params.bookingId,
    oldFlightId: params.oldFlight.id,
    newFlightId: params.newFlight.id,
    requestedAt: formatISO(new Date()),
    feeCharged,
    booking,
  };
}

export function getDemoBookingById(bookingId: string) {
  return mockBookings.find((booking) => booking.id === bookingId) ?? mockBookings[0];
}

export function getDemoSeatsForFlight(flightId: string) {
  return mockSeatsByFlightId[flightId] ?? [];
}

export function getDemoFlights() {
  return mockFlights;
}
