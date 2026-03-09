
-- 1. Create a SECURITY DEFINER function to check staff or admin role without triggering RLS
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role IN ('admin', 'staff')
  );
$$;

-- 2. Fix mentorships: replace staff/admin SELECT policy that queries profiles
DROP POLICY IF EXISTS "Staff/admin can read all mentorships" ON public.mentorships;
CREATE POLICY "Staff/admin can read all mentorships"
  ON public.mentorships FOR SELECT TO authenticated
  USING (is_staff_or_admin(auth.uid()));

-- 3. Fix profiles: replace "Admins can read all profiles" to use SECURITY DEFINER function (already does)
-- The "Staff can read mentee profiles" policy queries mentorships, which now uses is_staff_or_admin (SECURITY DEFINER) instead of querying profiles back. This breaks the recursion.

-- 4. Also fix other mentorships policies that query profiles directly
DROP POLICY IF EXISTS "Admins can insert mentorships" ON public.mentorships;
CREATE POLICY "Admins can insert mentorships"
  ON public.mentorships FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update mentorships" ON public.mentorships;
CREATE POLICY "Admins can update mentorships"
  ON public.mentorships FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
