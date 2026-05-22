import { differenceInMinutes } from "date-fns";

export function calculateDuration(start: string, end: string) {
  const totalMinutes = differenceInMinutes(new Date(end), new Date(start));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}
