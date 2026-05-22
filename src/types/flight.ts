export type FlightStatus = "scheduled" | "delayed" | "boarding" | "departed" | "cancelled";

export type SeatClass = "economy" | "business" | "first";

export type BookingStatus = "confirmed" | "pending" | "cancelled" | "rescheduled";

export interface Flight {
  id: string;
  flightNo: string;
  origin: string;
  destination: string;
  departsAt: string;
  arrivesAt: string;
  aircraftType: string;
  status: FlightStatus;
  basePrice: number;
}

export interface Seat {
  id: string;
  flightId: string;
  seatNumber: string;
  class: SeatClass;
  isAvailable: boolean;
  extraFee: number;
}

export interface BookingPassenger {
  fullName: string;
  passportNo: string;
  nationality: string;
  dob: string;
}

export interface Booking {
  id: string;
  userId: string;
  flightId: string;
  seatId: string;
  status: BookingStatus;
  bookedAt: string;
  totalPrice: number;
  pnrCode: string;
  flight?: Flight;
  seat?: Seat;
  passenger?: BookingPassenger;
}

export interface RescheduleRequest {
  id: string;
  bookingId: string;
  oldFlightId: string;
  newFlightId: string;
  requestedAt: string;
  feeCharged: number;
}

export interface SearchQuery {
  origin: string;
  destination: string;
  date: string;
  passengerCount: number;
}
