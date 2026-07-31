ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS party_size integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_price integer NOT NULL DEFAULT 0;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_party_size_check CHECK (party_size > 0 AND party_size <= 100);