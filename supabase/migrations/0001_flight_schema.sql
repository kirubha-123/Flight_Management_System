create extension if not exists pgcrypto;

create table if not exists public.flights (
  id uuid primary key default gen_random_uuid(),
  flight_no text not null unique,
  origin text not null,
  destination text not null,
  departs_at timestamptz not null,
  arrives_at timestamptz not null,
  aircraft_type text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'delayed', 'boarding', 'departed', 'cancelled')),
  base_price numeric(10, 2) not null check (base_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.seats (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references public.flights(id) on delete cascade,
  seat_number text not null,
  class text not null check (class in ('economy', 'business', 'first')),
  is_available boolean not null default true,
  extra_fee numeric(10, 2) not null default 0 check (extra_fee >= 0),
  created_at timestamptz not null default now(),
  unique (flight_id, seat_number)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flight_id uuid not null references public.flights(id) on delete restrict,
  seat_id uuid not null references public.seats(id) on delete restrict unique,
  status text not null default 'confirmed' check (status in ('confirmed', 'pending', 'cancelled', 'rescheduled')),
  booked_at timestamptz not null default now(),
  total_price numeric(10, 2) not null check (total_price >= 0),
  pnr_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.passengers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  full_name text not null,
  passport_no text not null,
  nationality text not null,
  dob date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reschedules (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  old_flight_id uuid not null references public.flights(id) on delete restrict,
  new_flight_id uuid not null references public.flights(id) on delete restrict,
  requested_at timestamptz not null default now(),
  fee_charged numeric(10, 2) not null default 0 check (fee_charged >= 0)
);

alter table public.flights enable row level security;
alter table public.seats enable row level security;
alter table public.bookings enable row level security;
alter table public.passengers enable row level security;
alter table public.reschedules enable row level security;

create policy "Flights are readable by everyone"
on public.flights
for select
using (true);

create policy "Seats are readable by everyone"
on public.seats
for select
using (true);

create policy "Users can read their bookings"
on public.bookings
for select
using (auth.uid() = user_id);

create policy "Users can insert their bookings"
on public.bookings
for insert
with check (auth.uid() = user_id);

create policy "Users can update their bookings"
on public.bookings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read their passengers"
on public.passengers
for select
using (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and b.user_id = auth.uid()
  )
);

create policy "Users can insert passenger details for own booking"
on public.passengers
for insert
with check (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and b.user_id = auth.uid()
  )
);

create policy "Users can read their reschedules"
on public.reschedules
for select
using (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and b.user_id = auth.uid()
  )
);

create policy "Users can insert their reschedules"
on public.reschedules
for insert
with check (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and b.user_id = auth.uid()
  )
);

create or replace function public.generate_pnr_code()
returns text
language sql
as $$
  select upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 6));
$$;

create or replace function public.set_pnr_code()
returns trigger
language plpgsql
as $$
begin
  if new.pnr_code is null or new.pnr_code = '' then
    new.pnr_code := public.generate_pnr_code();
  end if;

  return new;
end;
$$;

create trigger bookings_set_pnr_code
before insert on public.bookings
for each row
execute function public.set_pnr_code();

create or replace function public.reserve_seat(
  p_flight_id uuid,
  p_seat_id uuid,
  p_user_id uuid,
  p_total_price numeric,
  p_passenger jsonb default '[]'::jsonb
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  seat_row public.seats%rowtype;
  booking_row public.bookings%rowtype;
begin
  select *
  into seat_row
  from public.seats
  where id = p_seat_id and flight_id = p_flight_id
  for update;

  if not found then
    raise exception 'Seat not found';
  end if;

  if seat_row.is_available = false then
    raise exception 'Seat is already reserved';
  end if;

  update public.seats
  set is_available = false
  where id = p_seat_id;

  insert into public.bookings (user_id, flight_id, seat_id, status, total_price, pnr_code)
  values (p_user_id, p_flight_id, p_seat_id, 'confirmed', p_total_price, public.generate_pnr_code())
  returning * into booking_row;

  if jsonb_array_length(p_passenger) > 0 then
    insert into public.passengers (booking_id, full_name, passport_no, nationality, dob)
    select
      booking_row.id,
      passenger_item->>'full_name',
      passenger_item->>'passport_no',
      passenger_item->>'nationality',
      (passenger_item->>'dob')::date
    from jsonb_array_elements(p_passenger) as passenger_item;
  end if;

  return booking_row;
end;
$$;

create or replace function public.prevent_last_minute_cancellation()
returns trigger
language plpgsql
as $$
declare
  departure_time timestamptz;
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    select f.departs_at into departure_time
    from public.flights f
    where f.id = new.flight_id;

    if departure_time <= now() + interval '2 hours' then
      raise exception 'Cancellations within 2 hours of departure are not allowed';
    end if;
  end if;

  return new;
end;
$$;

create trigger bookings_prevent_last_minute_cancellation
before update on public.bookings
for each row
execute function public.prevent_last_minute_cancellation();

create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
begin
  select * into booking_row
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  update public.bookings
  set status = 'cancelled'
  where id = p_booking_id;

  update public.seats
  set is_available = true
  where id = booking_row.seat_id;
end;
$$;
