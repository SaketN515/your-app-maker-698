DROP POLICY IF EXISTS "Owners can insert venues" ON public.venues;

CREATE POLICY "Owners can insert venues"
ON public.venues
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'owner'::app_role
  )
);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;