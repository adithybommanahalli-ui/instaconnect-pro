
-- Fix function search_path + revoke execute
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Replace broad bucket SELECT with per-user folder SELECT (uploads still public via getPublicUrl)
DROP POLICY IF EXISTS "Post images publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Avatars publicly readable" ON storage.objects;

CREATE POLICY "Users list own post images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users list own avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
