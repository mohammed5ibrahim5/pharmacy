-- ============================================================
-- Migration: Fix is_site_admin() function
-- The function was failing when site_admins table doesn't exist
-- or has issues, causing ALL queries to fail.
-- This migration makes it resilient with exception handling.
-- ============================================================

-- Recreate with proper error handling (no DROP to avoid losing dependent policies)
CREATE OR REPLACE FUNCTION public.is_site_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.site_admins
    WHERE user_id = auth.uid()
  );
EXCEPTION WHEN OTHERS THEN
  -- If site_admins table doesn't exist or any error occurs, return false
  RETURN false;
END;
$$;
