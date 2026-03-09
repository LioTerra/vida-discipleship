-- Allow staff/admin to delete cursos
CREATE POLICY "Staff/admin can delete cursos"
ON public.cursos
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'staff')
));

-- Allow staff/admin to delete modulos
CREATE POLICY "Staff/admin can delete modulos"
ON public.modulos
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'staff')
));

-- Allow staff/admin to delete aulas
CREATE POLICY "Staff/admin can delete aulas"
ON public.aulas
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'staff')
));