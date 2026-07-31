-- App role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'user');

-- Venue type enum
CREATE TYPE public.venue_type AS ENUM ('turf', 'gaming_cafe', 'console_lounge');

-- Booking status enum
CREATE TYPE public.booking_status AS ENUM ('active', 'used', 'expired', 'cancelled');

-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- has_role function (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Venues table
CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type venue_type NOT NULL,
  description text,
  image_path text NOT NULL,
  price_per_hour integer NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  address text,
  amenities text[],
  capacity integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.venues TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venues TO authenticated;
GRANT ALL ON public.venues TO service_role;

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active venues" ON public.venues
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Owners can insert venues" ON public.venues
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner') AND owner_id = auth.uid());
CREATE POLICY "Owners can update own venues" ON public.venues
  FOR UPDATE TO authenticated USING (owner_id = auth.uid());

-- Bookings table
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  code text NOT NULL UNIQUE,
  status booking_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bookings" ON public.bookings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners can read bookings for their venues" ON public.bookings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_id AND v.owner_id = auth.uid()
    )
  );
CREATE POLICY "Users can create own bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed demo venues (owner_id NULL — managed by admin/service role)
INSERT INTO public.venues (name, type, description, image_path, price_per_hour, address, amenities, capacity) VALUES
('Apex Arena: Pitch A', 'turf', 'Premium 5-a-side artificial turf with pro-grade lighting. Open 24/7 with climate control and locker rooms.', 'turf', 45, '12 Industrial Way, Downtown', ARRAY['Pro Turf', '24/7 Access', 'Locker Rooms', 'Floodlights'], 10),
('Neural Node Gaming', 'gaming_cafe', 'High-performance PC gaming cafe with RTX 4090 rigs, 360Hz monitors, and fiber internet. Esports ready.', 'gaming', 8, '88 Cyber Street, Tech District', ARRAY['RTX 4090', '360Hz Monitors', 'Fiber Internet', 'Snack Bar'], 24),
('The Vault: PS5 Suite', 'console_lounge', 'Luxury console gaming lounge with private booths, 4K OLED screens, and premium seating. Perfect for parties.', 'console', 25, '55 Entertainment Blvd, Uptown', ARRAY['PS5', '4K OLED', 'Private Booths', 'Drinks Service'], 6),
('Strike Zone Turf', 'turf', 'Full-size 7-a-side turf with professional goals and spectator seating. Tournament standard.', 'turf', 60, '200 Sports Park Road', ARRAY['7-a-side', 'Spectator Seating', 'Tournament Standard', 'Parking'], 14),
('Pixel Forge Gaming', 'gaming_cafe', 'Community-focused gaming cafe with streaming setups, VR stations, and competitive weekly tournaments.', 'gaming', 10, '140 Arcade Lane, Midtown', ARRAY['VR Stations', 'Streaming Setup', 'Tournaments', 'Cafe'], 20),
('Console Kingdom', 'console_lounge', 'Premium gaming lounge with Xbox Series X, PS5, and Nintendo Switch. Party packages available.', 'console', 18, '77 Kingdom Square, Westside', ARRAY['Xbox Series X', 'PS5', 'Nintendo Switch', 'Party Packages'], 8);