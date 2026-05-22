"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFlightStore } from "@/store/useFlightStore";
import { reserveSeat } from "@/services/booking-service";
import type { Flight, Seat } from "@/types/flight";

export function BookingForm({ flight, seat, userId }: { flight: Flight; seat: Seat; userId: string }) {
  const router = useRouter();
  const passengerFormData = useFlightStore((state) => state.passengerFormData);
  const updatePassengerFormData = useFlightStore((state) => state.updatePassengerFormData);
  const [passportNo, setPassportNo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passenger details</CardTitle>
        <CardDescription>Passport numbers are handled locally and never persisted to browser storage.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);

            try {
              const booking = await reserveSeat({
                flight,
                seat,
                passenger: {
                  fullName: passengerFormData.fullName,
                  passportNo,
                  nationality: passengerFormData.nationality,
                  dob: passengerFormData.dob,
                },
                userId,
              });

              toast.success("Seat reserved successfully");
              router.push(`/confirmation/${booking.id}?pnr=${booking.pnrCode}`);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Unable to complete booking");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <Input
            className="md:col-span-2"
            placeholder="Full name"
            value={passengerFormData.fullName}
            onChange={(event) => updatePassengerFormData({ fullName: event.target.value })}
          />
          <Input
            placeholder="Nationality"
            value={passengerFormData.nationality}
            onChange={(event) => updatePassengerFormData({ nationality: event.target.value })}
          />
          <Input type="date" value={passengerFormData.dob} onChange={(event) => updatePassengerFormData({ dob: event.target.value })} />
          <Input className="md:col-span-2" placeholder="Passport number" value={passportNo} onChange={(event) => setPassportNo(event.target.value)} />
          <Button className="md:col-span-2" disabled={submitting} type="submit">
            {submitting ? "Booking..." : `Book ${seat.seatNumber} for ${flight.flightNo}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
