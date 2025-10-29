-- Quick Fix for Expenses Table - Missing Columns
-- Run this in Supabase SQL Editor to fix the "Could not find the 'quantity' column" error

-- Add missing columns to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,3);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS quantity_used DECIMAL(10,3);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS inventory_item_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_raw_material BOOLEAN DEFAULT FALSE;

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'expenses' 
ORDER BY ordinal_position;

-- Show success message
