import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FlightResultsGrid } from "@/components/flight-results-grid";
import { AppShell } from "@/components/app-shell";
import { searchFlights } from "@/services/flight-service";

type PageProps = {
  searchParams: Promise<{ origin?: string; destination?: string; date?: string; passengerCount?: string }>;
};

export default async function ResultsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const flights = await searchFlights({
    origin: params.origin,
    destination: params.destination,
    date: params.date,
    passengerCount: params.passengerCount ? Number(params.passengerCount) : 1,
  });

  return (
    <AppShell>
      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Flight results</CardTitle>
            <CardDescription>
              Showing routes for {params.origin ?? "any origin"} to {params.destination ?? "any destination"}.
            </CardDescription>
          </CardHeader>
        </Card>
        <FlightResultsGrid flights={flights} />
      </section>
    </AppShell>
  );
}
