-- Fix RLS policies for expenses table to allow anonymous access for DCB POS system
-- This script will update the RLS policies to allow the expenses page to work properly

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON expenses;

-- Create new policies that allow all operations for both authenticated and anonymous users
-- This is needed because the expenses page uses anonymous access
CREATE POLICY "Allow all operations" ON expenses
    FOR ALL USING (true);

-- Alternative: If you want more restrictive policies, you can use these instead:
-- CREATE POLICY "Allow insert for all" ON expenses
--     FOR INSERT WITH CHECK (true);
-- 
-- CREATE POLICY "Allow select for all" ON expenses
--     FOR SELECT USING (true);
-- 
-- CREATE POLICY "Allow update for all" ON expenses
--     FOR UPDATE USING (true);
-- 
-- CREATE POLICY "Allow delete for all" ON expenses
--     FOR DELETE USING (true);

-- Verify the policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'expenses';
