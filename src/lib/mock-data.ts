import { addHours, addMinutes, formatISO } from "date-fns";
import type { Booking, Flight, Seat } from "@/types/flight";

const now = new Date();

const routePairs = [
  ["JFK", "LAX"],
  ["SFO", "ORD"],
  ["DXB", "LHR"],
  ["SIN", "SYD"],
] as const;

export const mockFlights: Flight[] = Array.from({ length: 8 }, (_, index) => {
  const [origin, destination] = routePairs[index % routePairs.length];
  const departsAt = addHours(now, index * 6 + 4);
  const arrivesAt = addMinutes(departsAt, 240 + (index % 3) * 45);

  return {
    id: `flight-${index + 1}`,
    flightNo: `FM${120 + index}`,
    origin,
    destination,
    departsAt: formatISO(departsAt),
    arrivesAt: formatISO(arrivesAt),
    aircraftType: index % 2 === 0 ? "Airbus A320neo" : "Boeing 787-9",
    status: index === 6 ? "boarding" : "scheduled",
    basePrice: 180 + index * 35,
  };
});

function createSeats(flightId: string): Seat[] {
  const rows = Array.from({ length: 10 }, (_, rowIndex) => rowIndex + 1);
  const columns = ["A", "B", "C", "D", "E", "F"];

  return rows.flatMap((row) =>
    columns.map((column, columnIndex) => {
      const seatNumber = `${row}${column}`;
      const seatClass = row <= 2 ? "first" : row <= 4 ? "business" : "economy";

      return {
        id: `${flightId}-${seatNumber}`,
        flightId,
        seatNumber,
        class: seatClass,
        isAvailable: !(row === 1 && column === "A") && !(row === 5 && columnIndex === 3),
        extraFee: seatClass === "first" ? 280 : seatClass === "business" ? 140 : 0,
      };
    }),
  );
}

export const mockSeatsByFlightId = Object.fromEntries(
  mockFlights.map((flight) => [flight.id, createSeats(flight.id)]),
);

export const mockBookings: Booking[] = [
  {
    id: "booking-1",
    userId: "user-1",
    flightId: "flight-1",
    seatId: `${mockFlights[0].id}-1B`,
    status: "confirmed",
    bookedAt: new Date().toISOString(),
    totalPrice: 460,
    pnrCode: "FM1A9B2",
    flight: mockFlights[0],
    seat: mockSeatsByFlightId[mockFlights[0].id].find((seat) => seat.seatNumber === "1B"),
    passenger: {
      fullName: "Ayesha Khan",
      passportNo: "X1234567",
      nationality: "Indian",
      dob: "1994-05-12",
    },
  },
];
