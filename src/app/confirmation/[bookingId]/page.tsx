import { createClient } from "@supabase/supabase-js";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDemoBookingById } from "@/services/booking-service";
import { publicEnv } from "@/lib/env";

type PageProps = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ pnr?: string }>;
};

export default async function ConfirmationPage({ params, searchParams }: PageProps) {
  const [{ bookingId }, query] = await Promise.all([params, searchParams]);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let booking = getDemoBookingById(bookingId);

  if (publicEnv.NEXT_PUBLIC_SUPABASE_URL && serviceRoleKey) {
    const supabase = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: bookingRow } = await supabase
      .from("bookings")
      .select("id, status, booked_at, total_price, pnr_code, flight_id, seat_id")
      .eq("id", bookingId)
      .single();

    if (bookingRow) {
      const [{ data: flightRow }, { data: seatRow }] = await Promise.all([
        supabase.from("flights").select("id, flight_no, origin, destination, departs_at, arrives_at, aircraft_type, status, base_price").eq("id", bookingRow.flight_id).single(),
        supabase.from("seats").select("id, seat_number, class, is_available, extra_fee, flight_id").eq("id", bookingRow.seat_id).single(),
      ]);

      booking = {
        id: bookingRow.id,
        userId: "",
        flightId: bookingRow.flight_id,
        seatId: bookingRow.seat_id,
        status: bookingRow.status,
        bookedAt: bookingRow.booked_at,
        totalPrice: Number(bookingRow.total_price),
        pnrCode: bookingRow.pnr_code,
        flight: flightRow
          ? {
              id: flightRow.id,
              flightNo: flightRow.flight_no,
              origin: flightRow.origin,
              destination: flightRow.destination,
              departsAt: flightRow.departs_at,
              arrivesAt: flightRow.arrives_at,
              aircraftType: flightRow.aircraft_type,
              status: flightRow.status,
              basePrice: Number(flightRow.base_price),
            }
          : undefined,
        seat: seatRow
          ? {
              id: seatRow.id,
              flightId: seatRow.flight_id,
              seatNumber: seatRow.seat_number,
              class: seatRow.class,
              isAvailable: seatRow.is_available,
              extraFee: Number(seatRow.extra_fee),
            }
          : undefined,
      };
    }
  }

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Booking confirmed</CardTitle>
          <CardDescription>Your trip is ready. Save this reference for airport check-in.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">PNR code</p>
            <p className="text-2xl font-semibold text-white">{query.pnr ?? booking.pnrCode}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Seat assignment</p>
            <p className="text-2xl font-semibold text-white">{booking.seat?.seatNumber}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Flight</p>
            <p className="text-white">{booking.flight?.flightNo}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Status</p>
            <p className="text-white">{booking.status}</p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
