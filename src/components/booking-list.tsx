"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cancelBooking } from "@/services/booking-service";
import type { Booking } from "@/types/flight";

export function BookingList({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No bookings yet</CardTitle>
          <CardDescription>Search for a flight and complete your first reservation.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {bookings.map((booking) => (
        <Card key={booking.id}>
          <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{booking.flight?.flightNo ?? booking.pnrCode}</CardTitle>
                <CardDescription>
                  {booking.flight?.origin} → {booking.flight?.destination} · Seat {booking.seat?.seatNumber}
                </CardDescription>
              </div>
              <StatusBadge status={booking.status} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-300">
              <p>PNR: {booking.pnrCode}</p>
              <p>Total: ${booking.totalPrice.toFixed(2)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => router.push(`/search?booking=${booking.id}`)} type="button">
                Reschedule
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  const confirmed = window.confirm("Cancel this booking? Cancellations within 2 hours of departure will fail.");

                  if (!confirmed) {
                    return;
                  }

                  try {
                    await cancelBooking(booking.id);
                    toast.success("Booking cancelled");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to cancel booking");
                  }
                }}
                type="button"
              >
                Cancel
              </Button>
              <Link href={`/confirmation/${booking.id}?pnr=${booking.pnrCode}`}>
                <Button size="sm" type="button">
                  View confirmation
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
