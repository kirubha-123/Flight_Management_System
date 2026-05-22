import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { BookingPassenger, Flight, SearchQuery, Seat } from "@/types/flight";

interface FlightState {
  activeSearchQuery: SearchQuery | null;
  selectedFlight: Flight | null;
  selectedSeat: Seat | null;
  bookingStep: "search" | "results" | "seats" | "booking" | "confirmation";
  passengerFormData: Omit<BookingPassenger, "dob"> & { dob: string };
  setActiveSearchQuery: (query: SearchQuery) => void;
  setSelectedFlight: (flight: Flight | null) => void;
  setSelectedSeat: (seat: Seat | null) => void;
  setBookingStep: (step: FlightState["bookingStep"]) => void;
  updatePassengerFormData: (data: Partial<FlightState["passengerFormData"]>) => void;
  resetSelection: () => void;
}

const initialPassengerFormData = {
  fullName: "",
  passportNo: "",
  nationality: "",
  dob: "",
};

export const useFlightStore = create<FlightState>()(
  persist(
    (set) => ({
      activeSearchQuery: null,
      selectedFlight: null,
      selectedSeat: null,
      bookingStep: "search",
      passengerFormData: initialPassengerFormData,
      setActiveSearchQuery: (query) => set({ activeSearchQuery: query }),
      setSelectedFlight: (flight) => set({ selectedFlight: flight }),
      setSelectedSeat: (seat) => set({ selectedSeat: seat }),
      setBookingStep: (bookingStep) => set({ bookingStep }),
      updatePassengerFormData: (data) =>
        set((state) => ({
          passengerFormData: { ...state.passengerFormData, ...data },
        })),
      resetSelection: () =>
        set({
          selectedFlight: null,
          selectedSeat: null,
          bookingStep: "search",
          passengerFormData: initialPassengerFormData,
        }),
    }),
    {
      name: "flight-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeSearchQuery: state.activeSearchQuery,
        selectedFlight: state.selectedFlight,
        selectedSeat: state.selectedSeat,
        bookingStep: state.bookingStep,
        passengerFormData: {
          fullName: state.passengerFormData.fullName,
          passportNo: state.passengerFormData.passportNo,
          nationality: state.passengerFormData.nationality,
          dob: state.passengerFormData.dob,
        },
      }),
    },
  ),
);
