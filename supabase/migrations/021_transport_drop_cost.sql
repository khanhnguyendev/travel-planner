-- cost and currency are no longer used on transport_bookings.
-- Expenses are tracked separately via transport_booking_id on expenses.
alter table transport_bookings
  drop column if exists cost,
  drop column if exists currency,
  drop column if exists expense_id;
