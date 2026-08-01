CREATE POLICY "Owners can upload venue images in own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'venue-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can update own venue images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'venue-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can delete own venue images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'venue-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can read own venue images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'venue-images' AND (storage.foldername(name))[1] = auth.uid()::text);