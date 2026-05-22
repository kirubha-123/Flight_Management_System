import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SeatMap } from "@/components/seat-map";
import { getFlightById, getSeatsByFlightId } from "@/services/flight-service";

type PageProps = {
  params: Promise<{ flightId: string }>;
};

export default async function SeatSelectionPage({ params }: PageProps) {
  const { flightId } = await params;
  const flight = await getFlightById(flightId);
  const seats = await getSeatsByFlightId(flightId);

  if (!flight) {
    notFound();
  }

  return (
    <AppShell>
      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{flight.flightNo} seat map</CardTitle>
            <CardDescription>
              {flight.origin} → {flight.destination} · {flight.aircraftType}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3 text-sm text-slate-300">
            <div><p className="text-slate-500">Departure</p><p className="text-white">{new Date(flight.departsAt).toLocaleString()}</p></div>
            <div><p className="text-slate-500">Arrival</p><p className="text-white">{new Date(flight.arrivesAt).toLocaleString()}</p></div>
            <div><p className="text-slate-500">Base price</p><p className="text-white">${flight.basePrice.toFixed(2)}</p></div>
          </CardContent>
        </Card>
        <SeatMap flightId={flightId} seats={seats} />
      </section>
    </AppShell>
  );
}
