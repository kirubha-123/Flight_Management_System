import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BookingStatus, FlightStatus } from "@/types/flight";

const statusStyles: Record<BookingStatus | FlightStatus, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/20",
  pending: "bg-amber-500/15 text-amber-200 border border-amber-400/20",
  cancelled: "bg-rose-500/15 text-rose-200 border border-rose-400/20",
  rescheduled: "bg-sky-500/15 text-sky-200 border border-sky-400/20",
  scheduled: "bg-sky-500/15 text-sky-200 border border-sky-400/20",
  delayed: "bg-orange-500/15 text-orange-200 border border-orange-400/20",
  boarding: "bg-indigo-500/15 text-indigo-200 border border-indigo-400/20",
  departed: "bg-slate-500/15 text-slate-200 border border-slate-400/20",
};

export function StatusBadge({ status }: { status: BookingStatus | FlightStatus }) {
  return <Badge className={cn("capitalize", statusStyles[status])}>{status}</Badge>;
}
