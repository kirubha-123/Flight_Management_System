import { AppShell } from "@/components/app-shell";
import { BookingList } from "@/components/booking-list";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { mockBookings } from "@/lib/mock-data";

export default function BookingsPage() {
  return (
    <AppShell>
      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>My bookings</CardTitle>
            <CardDescription>Review confirmations, cancellations, and reschedule paths in one place.</CardDescription>
          </CardHeader>
        </Card>
        <BookingList bookings={mockBookings} />
      </section>
    </AppShell>
  );
}
