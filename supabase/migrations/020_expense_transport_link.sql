-- Link expenses to transport bookings
alter table expenses
  add column transport_booking_id uuid references transport_bookings(id) on delete set null;

create index expenses_transport_booking_id_idx on expenses(transport_booking_id);
