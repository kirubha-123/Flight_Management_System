insert into public.flights (flight_no, origin, destination, departs_at, arrives_at, aircraft_type, status, base_price)
values
  ('FM120', 'JFK', 'LAX', now() + interval '6 hours', now() + interval '11 hours', 'Airbus A320neo', 'scheduled', 185),
  ('FM121', 'SFO', 'ORD', now() + interval '9 hours', now() + interval '14 hours', 'Boeing 787-9', 'scheduled', 220),
  ('FM122', 'DXB', 'LHR', now() + interval '12 hours', now() + interval '18 hours', 'Airbus A350', 'boarding', 410),
  ('FM123', 'SIN', 'SYD', now() + interval '15 hours', now() + interval '22 hours', 'Boeing 777-300ER', 'scheduled', 365),
  ('FM124', 'JFK', 'LAX', now() + interval '24 hours', now() + interval '29 hours', 'Airbus A321neo', 'scheduled', 195),
  ('FM125', 'SFO', 'ORD', now() + interval '30 hours', now() + interval '35 hours', 'Boeing 787-8', 'delayed', 210),
  ('FM126', 'DXB', 'LHR', now() + interval '36 hours', now() + interval '42 hours', 'Airbus A380', 'scheduled', 450),
  ('FM127', 'SIN', 'SYD', now() + interval '42 hours', now() + interval '49 hours', 'Boeing 787-10', 'scheduled', 380)
on conflict (flight_no) do nothing;

insert into public.seats (flight_id, seat_number, class, is_available, extra_fee)
select
  flights.id,
  seat_data.seat_number,
  seat_data.class,
  true,
  seat_data.extra_fee
from public.flights as flights
cross join lateral (
  select
    row_num::text || seat_letter as seat_number,
    case
      when row_num <= 2 then 'first'
      when row_num <= 4 then 'business'
      else 'economy'
    end as class,
    case
      when row_num <= 2 then 280
      when row_num <= 4 then 140
      else 0
    end as extra_fee
  from generate_series(1, 10) as row_num
  cross join unnest(array['A', 'B', 'C', 'D', 'E', 'F']) as seat_letter
) as seat_data
on conflict (flight_id, seat_number) do nothing;
