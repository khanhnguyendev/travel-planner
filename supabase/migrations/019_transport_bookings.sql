-- Transport bookings: rent, bus, plane
-- Stored separately from places so tickets/references can be saved

create type transport_type as enum ('rent', 'bus', 'plane');

create table transport_bookings (
  id              uuid        primary key default gen_random_uuid(),
  trip_id         uuid        not null references trips(id) on delete cascade,
  created_by      uuid        not null references auth.users(id),
  transport_type  transport_type not null,
  provider        text,
  from_location   text,
  to_location     text,
  departure_date  date,
  departure_time  time,
  arrival_date    date,
  arrival_time    time,
  cost            numeric(12, 2),
  currency        text        not null default 'VND',
  reference_code  text,
  note            text,
  expense_id      uuid        references expenses(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes
create index transport_bookings_trip_id_idx on transport_bookings(trip_id);
create index transport_bookings_departure_date_idx on transport_bookings(departure_date);

-- RLS
alter table transport_bookings enable row level security;

create policy "trip members can view transport bookings"
  on transport_bookings for select
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = transport_bookings.trip_id
        and trip_members.user_id = auth.uid()
        and trip_members.invite_status = 'accepted'
    )
  );

create policy "editors can insert transport bookings"
  on transport_bookings for insert
  with check (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = transport_bookings.trip_id
        and trip_members.user_id = auth.uid()
        and trip_members.invite_status = 'accepted'
        and trip_members.role in ('owner', 'admin', 'editor')
    )
  );

create policy "editors can update transport bookings"
  on transport_bookings for update
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = transport_bookings.trip_id
        and trip_members.user_id = auth.uid()
        and trip_members.invite_status = 'accepted'
        and trip_members.role in ('owner', 'admin', 'editor')
    )
  );

create policy "editors can delete transport bookings"
  on transport_bookings for delete
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = transport_bookings.trip_id
        and trip_members.user_id = auth.uid()
        and trip_members.invite_status = 'accepted'
        and trip_members.role in ('owner', 'admin', 'editor')
    )
  );
