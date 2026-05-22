import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Booking } from "@/types/flight";
import type { Session } from "@supabase/supabase-js";

interface UserState {
  session: Session | null;
  sessionToken: string | null;
  cachedBookings: Booking[];
  hasHydrated: boolean;
  setSession: (session: Session | null) => void;
  setCachedBookings: (bookings: Booking[]) => void;
  setHasHydrated: (hydrated: boolean) => void;
  clearSession: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      session: null,
      sessionToken: null,
      cachedBookings: [],
      hasHydrated: false,
      setSession: (session) =>
        set({
          session,
          sessionToken: session?.access_token ?? null,
        }),
      setCachedBookings: (cachedBookings) => set({ cachedBookings }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      clearSession: () => set({ session: null, sessionToken: null, cachedBookings: [] }),
    }),
    {
      name: "user-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessionToken: state.sessionToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    },
  ),
);
