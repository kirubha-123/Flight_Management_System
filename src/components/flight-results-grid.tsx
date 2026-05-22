import Link from "next/link";
import { ArrowRight, Clock3, PlaneTakeoff, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { calculateDuration } from "@/utils/flight-metrics";
import type { Flight } from "@/types/flight";

export function FlightResultsGrid({ flights }: { flights: Flight[] }) {
  if (flights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No flights found</CardTitle>
          <CardDescription>Adjust the route or travel date and try again.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {flights.map((flight) => (
        <Card key={flight.id} className="h-full">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PlaneTakeoff className="size-4 text-sky-300" />
                  {flight.flightNo}
                </CardTitle>
                <CardDescription>
                  {flight.origin} → {flight.destination} · {flight.aircraftType}
                </CardDescription>
              </div>
              <StatusBadge status={flight.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300 md:grid-cols-3">
              <div>
                <p className="text-slate-500">Departure</p>
                <p className="font-medium text-white">{new Date(flight.departsAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500">Duration</p>
                <p className="font-medium text-white">{calculateDuration(flight.departsAt, flight.arrivesAt)}</p>
              </div>
              <div>
                <p className="text-slate-500">Starting at</p>
                <p className="font-medium text-white">${flight.basePrice.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1"><Clock3 className="size-3" /> Flexible rebooking</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1"><Ticket className="size-3" /> Economy, business, first</span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link className="flex-1" href={`/seats/${flight.id}`}>
                <Button className="w-full" type="button">
                  Select seats
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link className="flex-1" href={`/booking?flightId=${flight.id}`}>
                <Button className="w-full" variant="secondary" type="button">
                  Book now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
