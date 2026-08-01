CREATE TABLE public.venue_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  price_per_person integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, slot_date, start_time)
);

GRANT SELECT ON public.venue_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_slots TO authenticated;
GRANT ALL ON public.venue_slots TO service_role;

ALTER TABLE public.venue_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read slots of active venues"
ON public.venue_slots FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_slots.venue_id AND v.is_active = true));

CREATE POLICY "Owners can read own venue slots"
ON public.venue_slots FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_slots.venue_id AND v.owner_id = auth.uid()));

CREATE POLICY "Owners can insert own venue slots"
ON public.venue_slots FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_slots.venue_id AND v.owner_id = auth.uid()));

CREATE POLICY "Owners can update own venue slots"
ON public.venue_slots FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_slots.venue_id AND v.owner_id = auth.uid()));

CREATE POLICY "Owners can delete own venue slots"
ON public.venue_slots FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_slots.venue_id AND v.owner_id = auth.uid()));

CREATE POLICY "Owners can delete own venues"
ON public.venues FOR DELETE TO authenticated
USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_venue_slots_updated_at
BEFORE UPDATE ON public.venue_slots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  requested_role app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  requested_role := CASE
    WHEN COALESCE(NEW.raw_user_meta_data->>'account_type', '') = 'owner' THEN 'owner'::app_role
    ELSE 'user'::app_role
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;