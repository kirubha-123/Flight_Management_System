"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFlightStore } from "@/store/useFlightStore";
import { useRealtimeSeats } from "@/hooks/useRealtimeSeats";
import { cn } from "@/lib/utils";
import type { Seat } from "@/types/flight";

const columns = ["A", "B", "C", "D", "E", "F"];

function seatClassStyles(seat: Seat) {
  if (seat.class === "first") {
    return "border-sky-300/40 bg-sky-400/15 text-sky-100";
  }

  if (seat.class === "business") {
    return "border-amber-300/40 bg-amber-400/15 text-amber-50";
  }

  return "border-slate-600 bg-slate-900/80 text-slate-100";
}

export function SeatMap({ flightId, seats }: { flightId: string; seats: Seat[] }) {
  const router = useRouter();
  const setSelectedSeat = useFlightStore((state) => state.setSelectedSeat);
  const setBookingStep = useFlightStore((state) => state.setBookingStep);
  const [seatState, setSeatState] = useState(seats);

  useRealtimeSeats(flightId, (updatedSeat) => {
    setSeatState((current) =>
      current.map((seat) => (seat.id === updatedSeat.id ? updatedSeat : seat)),
    );

    if (!updatedSeat.isAvailable) {
      toast.info(`${updatedSeat.seatNumber} is now occupied`);
    }
  });

  const rows = useMemo(() => {
    return Array.from({ length: 10 }, (_, rowIndex) => rowIndex + 1);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seat selection</CardTitle>
        <CardDescription>Tap a seat to reserve it. Occupied seats are locked instantly via realtime sync.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 px-3 py-1">First</span>
          <span className="rounded-full border border-white/10 px-3 py-1">Business</span>
          <span className="rounded-full border border-white/10 px-3 py-1">Economy</span>
        </div>

        <div className="space-y-3 overflow-x-auto pb-2">
          {rows.map((row) => (
            <div key={row} className="grid min-w-[520px] grid-cols-[48px_repeat(6,1fr)] gap-2">
              <div className="flex items-center justify-center rounded-2xl bg-white/5 text-sm text-slate-400">{row}</div>
              {columns.map((column) => {
                const seat = seatState.find((entry) => entry.seatNumber === `${row}${column}`);

                if (!seat) {
                  return <div key={`${row}${column}`} className="rounded-2xl border border-dashed border-white/5 bg-white/2" />;
                }

                return (
                  <button
                    key={seat.id}
                    className={cn(
                      "min-h-12 rounded-2xl border px-2 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40",
                      seatClassStyles(seat),
                    )}
                    disabled={!seat.isAvailable}
                    title={seat.isAvailable ? `${seat.seatNumber} · ${seat.class} · $${seat.extraFee.toFixed(2)} extra` : `${seat.seatNumber} occupied`}
                    onClick={() => {
                      setSelectedSeat(seat);
                      setBookingStep("booking");
                      toast.success(`Selected seat ${seat.seatNumber}`);
                      router.push(`/booking?flightId=${flightId}&seatId=${seat.id}`);
                    }}
                    type="button"
                  >
                    {seat.seatNumber}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">{seatState.filter((seat) => seat.isAvailable).length} seats available</p>
          <Button variant="secondary" type="button" onClick={() => router.push(`/booking?flightId=${flightId}`)}>
            Continue to booking
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
