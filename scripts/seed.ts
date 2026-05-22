/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.log("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Seed skipped.");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
  realtime: { transport: ws as any },
});

const demoUser = {
  email: "demo@flight.app",
  password: "DemoFlight123!",
};

const routes = [
  ["JFK", "LAX"],
  ["SFO", "ORD"],
  ["DXB", "LHR"],
  ["SIN", "SYD"],
] as const;

async function main() {
  const { error: userError } = await supabase.auth.admin.createUser({
    email: demoUser.email,
    password: demoUser.password,
    email_confirm: true,
  });

  if (userError && !userError.message.toLowerCase().includes("already registered")) {
    throw userError;
  }

  const flights = Array.from({ length: 8 }, (_, index) => {
    const [origin, destination] = routes[index % routes.length];
    const departsAt = new Date(Date.now() + (index + 1) * 6 * 60 * 60 * 1000);
    const arrivesAt = new Date(departsAt.getTime() + (4 + (index % 3)) * 60 * 60 * 1000);

    return {
      flight_no: `FM${120 + index}`,
      origin,
      destination,
      departs_at: departsAt.toISOString(),
      arrives_at: arrivesAt.toISOString(),
      aircraft_type: index % 2 === 0 ? "Airbus A320neo" : "Boeing 787-9",
      status: index === 2 ? "boarding" : "scheduled",
      base_price: 185 + index * 35,
    };
  });

  const { data: flightRows, error: flightError } = await supabase
    .from("flights")
    .upsert(flights, { onConflict: "flight_no" })
    .select("id, flight_no");

  if (flightError) {
    throw flightError;
  }

  const seats = (flightRows ?? []).flatMap((flight) => {
    return Array.from({ length: 10 }, (_, rowIndex) => rowIndex + 1).flatMap((rowNumber) => {
      return ["A", "B", "C", "D", "E", "F"].map((seatLetter) => {
        const className = rowNumber <= 2 ? "first" : rowNumber <= 4 ? "business" : "economy";
        return {
          flight_id: flight.id,
          seat_number: `${rowNumber}${seatLetter}`,
          class: className,
          is_available: true,
          extra_fee: className === "first" ? 280 : className === "business" ? 140 : 0,
        };
      });
    });
  });

  const { error: seatError } = await supabase.from("seats").upsert(seats, { onConflict: "flight_id,seat_number" });

  if (seatError) {
    throw seatError;
  }

  console.log(`Seeded ${flightRows?.length ?? 0} flights and ${seats.length} seats.`);
  console.log(`Demo user ready: ${demoUser.email} / ${demoUser.password}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});