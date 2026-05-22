"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFlightStore } from "@/store/useFlightStore";

const airports = ["JFK", "LAX", "SFO", "ORD", "DXB", "LHR", "SIN", "SYD"];

export function FlightSearchForm() {
  const router = useRouter();
  const setActiveSearchQuery = useFlightStore((state) => state.setActiveSearchQuery);
  const [origin, setOrigin] = useState("JFK");
  const [destination, setDestination] = useState("LAX");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [passengerCount, setPassengerCount] = useState(1);

  return (
    <form
      className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_160px_160px]"
      onSubmit={(event) => {
        event.preventDefault();

        const query = { origin, destination, date, passengerCount };
        setActiveSearchQuery(query);

        router.push(
          `/results?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(date)}&passengerCount=${passengerCount}`,
        );
      }}
    >
      <label className="space-y-2 text-sm text-slate-200">
        <span>Origin</span>
        <select className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 outline-none" value={origin} onChange={(event) => setOrigin(event.target.value)}>
          {airports.map((airport) => (
            <option key={airport}>{airport}</option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm text-slate-200">
        <span>Destination</span>
        <select className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 outline-none" value={destination} onChange={(event) => setDestination(event.target.value)}>
          {airports.map((airport) => (
            <option key={airport}>{airport}</option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm text-slate-200">
        <span>Date</span>
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <label className="space-y-2 text-sm text-slate-200">
        <span>Passengers</span>
        <Input type="number" min={1} max={9} value={passengerCount} onChange={(event) => setPassengerCount(Number(event.target.value))} />
      </label>
      <Button className="lg:mt-8" type="submit">
        <Search className="size-4" />
        Search Flights
      </Button>
    </form>
  );
}
