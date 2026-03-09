-- Allow admins to insert mentorships
CREATE POLICY "Admins can insert mentorships"
ON public.mentorships FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Allow admins to update mentorships
CREATE POLICY "Admins can update mentorships"
ON public.mentorships FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));