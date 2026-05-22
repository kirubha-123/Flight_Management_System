import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BookingForm } from "@/components/booking-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFlightById, getSeatsByFlightId } from "@/services/flight-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ flightId?: string; seatId?: string; booking?: string }>;
};

export default async function BookingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login");
  }

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    redirect("/login");
  }

  const flightId = params.flightId;

  if (!flightId) {
    notFound();
  }

  const flight = await getFlightById(flightId);

  if (!flight) {
    notFound();
  }

  const seats = await getSeatsByFlightId(flightId);
  const selectedSeat = seats.find((seat) => seat.id === params.seatId) ?? seats.find((seat) => seat.isAvailable) ?? seats[0];

  if (!selectedSeat) {
    notFound();
  }

  return (
    <AppShell>
      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Booking form</CardTitle>
            <CardDescription>
              You are booking {flight.flightNo} and seat {selectedSeat.seatNumber}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-slate-300 md:grid-cols-3">
            <div><p className="text-slate-500">Origin</p><p className="text-white">{flight.origin}</p></div>
            <div><p className="text-slate-500">Destination</p><p className="text-white">{flight.destination}</p></div>
            <div><p className="text-slate-500">Seat fee</p><p className="text-white">${selectedSeat.extraFee.toFixed(2)}</p></div>
          </CardContent>
        </Card>
        <BookingForm flight={flight} seat={selectedSeat} userId={user.id} />
      </section>
    </AppShell>
  );
}
