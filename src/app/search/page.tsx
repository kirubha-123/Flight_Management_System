import { PlaneTakeoff, ShieldCheck, Wifi } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FlightSearchForm } from "@/components/flight-search-form";
import { AppShell } from "@/components/app-shell";

export default function SearchPage() {
  return (
    <AppShell>
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl">Dashboard</CardTitle>
            <CardDescription>Search flights, reserve seats in real time, and manage bookings from one authenticated workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <FlightSearchForm />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><PlaneTakeoff className="size-4 text-sky-300" />Live booking flow</CardTitle>
              <CardDescription>Search, choose, book, confirm, and reschedule in one consistent flow.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Wifi className="size-4 text-sky-300" />Realtime seat sync</CardTitle>
              <CardDescription>Seat availability updates are pushed immediately through Supabase Realtime.</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-sky-300" />RLS-first backend</CardTitle>
            <CardDescription>Policies restrict access to the owning user while RPC functions handle critical state changes atomically.</CardDescription>
          </CardHeader>
        </Card>
      </section>
    </AppShell>
  );
}
