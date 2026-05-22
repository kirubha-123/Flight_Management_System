"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Seat } from "@/types/flight";

type SeatChangeHandler = (seat: Seat) => void;

export function useRealtimeSeats(flightId: string, onSeatChange: SeatChangeHandler) {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel(`seats:${flightId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "seats", filter: `flight_id=eq.${flightId}` },
        (payload) => {
          const row = payload.new as {
            id: string;
            flight_id: string;
            seat_number: string;
            class: Seat["class"];
            is_available: boolean;
            extra_fee: number;
          };

          onSeatChange({
            id: row.id,
            flightId: row.flight_id,
            seatNumber: row.seat_number,
            class: row.class,
            isAvailable: row.is_available,
            extraFee: Number(row.extra_fee),
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [flightId, onSeatChange]);
}
