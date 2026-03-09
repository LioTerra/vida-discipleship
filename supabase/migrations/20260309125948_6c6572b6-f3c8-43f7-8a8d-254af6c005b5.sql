
-- Fix avaliacoes SELECT policies: make them PERMISSIVE
DROP POLICY IF EXISTS "Admin can read all avaliacoes" ON public.avaliacoes;
DROP POLICY IF EXISTS "Mentorship participants can read avaliacoes" ON public.avaliacoes;
DROP POLICY IF EXISTS "Mentorship participants can insert avaliacoes" ON public.avaliacoes;

CREATE POLICY "Admin can read all avaliacoes" ON public.avaliacoes
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Mentorship participants can read avaliacoes" ON public.avaliacoes
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM mentorships WHERE mentorships.id = avaliacoes.mentorship_id AND (mentorships.mentor_id = auth.uid() OR mentorships.mentee_id = auth.uid())));

CREATE POLICY "Mentorship participants can insert avaliacoes" ON public.avaliacoes
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM mentorships WHERE mentorships.id = avaliacoes.mentorship_id AND (mentorships.mentor_id = auth.uid() OR mentorships.mentee_id = auth.uid())));

-- Fix mentorships SELECT policies
DROP POLICY IF EXISTS "Participants can read own mentorships" ON public.mentorships;
DROP POLICY IF EXISTS "Staff/admin can read all mentorships" ON public.mentorships;
DROP POLICY IF EXISTS "Admins can insert mentorships" ON public.mentorships;
DROP POLICY IF EXISTS "Admins can update mentorships" ON public.mentorships;

CREATE POLICY "Participants can read own mentorships" ON public.mentorships
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

CREATE POLICY "Staff/admin can read all mentorships" ON public.mentorships
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'staff')));

CREATE POLICY "Admins can insert mentorships" ON public.mentorships
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update mentorships" ON public.mentorships
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Fix profiles SELECT policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Admins can read all profiles" ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can read own profile" ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Staff can read mentee profiles" ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM mentorships WHERE mentorships.mentor_id = auth.uid() AND mentorships.mentee_id = profiles.id));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
