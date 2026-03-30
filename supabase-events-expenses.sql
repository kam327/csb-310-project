-- Optional: total event spend for cost-per-attendee trends (matches app `Event.expenses`).
-- If you created the column with a different name (e.g. quoted "Expenses"), align your DB and `fetchEvents` select.

alter table public.events
  add column if not exists expenses double precision;

comment on column public.events.expenses is 'Total event cost; used for dashboard cost-per-attendee charts.';
