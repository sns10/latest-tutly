-- Drop existing restrictive policies on tuitions table
DROP POLICY IF EXISTS "Super admins can manage all tuitions" ON tuitions;
DROP POLICY IF EXISTS "Tuition admins can view their own tuition" ON tuitions;

-- Create PERMISSIVE policy for Super Admins (full access)
CREATE POLICY "Super admins can manage all tuitions"
ON tuitions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Create PERMISSIVE policy for Tuition Admins (SELECT only)
CREATE POLICY "Tuition admins can view their own tuition"
ON tuitions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'tuition_admin') 
  AND id = get_user_tuition_id(auth.uid())
);