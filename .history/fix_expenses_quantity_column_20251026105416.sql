-- Fix for missing 'quantity' column in expenses table
-- This script adds the missing column that's causing the error when saving expenses

-- Check if the column exists and add it if it doesn't
DO $$ 
BEGIN
    -- Check if the quantity column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'quantity'
    ) THEN
        -- Add the missing quantity column
        ALTER TABLE expenses ADD COLUMN quantity DECIMAL(10,3);
        RAISE NOTICE 'Added quantity column to expenses table';
    ELSE
        RAISE NOTICE 'Quantity column already exists in expenses table';
    END IF;
    
    -- Check if the unit_price column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'unit_price'
    ) THEN
        -- Add the missing unit_price column
        ALTER TABLE expenses ADD COLUMN unit_price DECIMAL(10,2);
        RAISE NOTICE 'Added unit_price column to expenses table';
    ELSE
        RAISE NOTICE 'unit_price column already exists in expenses table';
    END IF;
    
    -- Check if the gst_amount column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'gst_amount'
    ) THEN
        -- Add the missing gst_amount column
        ALTER TABLE expenses ADD COLUMN gst_amount DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Added gst_amount column to expenses table';
    ELSE
        RAISE NOTICE 'gst_amount column already exists in expenses table';
    END IF;
    
    -- Check if the total_amount column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'total_amount'
    ) THEN
        -- Add the missing total_amount column
        ALTER TABLE expenses ADD COLUMN total_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added total_amount column to expenses table';
    ELSE
        RAISE NOTICE 'total_amount column already exists in expenses table';
    END IF;
    
    -- Check if the created_by column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'created_by'
    ) THEN
        -- Add the missing created_by column
        ALTER TABLE expenses ADD COLUMN created_by UUID;
        RAISE NOTICE 'Added created_by column to expenses table';
    ELSE
        RAISE NOTICE 'created_by column already exists in expenses table';
    END IF;
    
    -- Check if the unit column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'unit'
    ) THEN
        -- Add the missing unit column
        ALTER TABLE expenses ADD COLUMN unit TEXT;
        RAISE NOTICE 'Added unit column to expenses table';
    ELSE
        RAISE NOTICE 'unit column already exists in expenses table';
    END IF;
    
    -- Check if the quantity_used column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'quantity_used'
    ) THEN
        -- Add the missing quantity_used column
        ALTER TABLE expenses ADD COLUMN quantity_used DECIMAL(10,3);
        RAISE NOTICE 'Added quantity_used column to expenses table';
    ELSE
        RAISE NOTICE 'quantity_used column already exists in expenses table';
    END IF;
    
    -- Check if the inventory_item_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'inventory_item_id'
    ) THEN
        -- Add the missing inventory_item_id column
        ALTER TABLE expenses ADD COLUMN inventory_item_id UUID;
        RAISE NOTICE 'Added inventory_item_id column to expenses table';
    ELSE
        RAISE NOTICE 'inventory_item_id column already exists in expenses table';
    END IF;
    
    -- Check if the is_raw_material column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'is_raw_material'
    ) THEN
        -- Add the missing is_raw_material column
        ALTER TABLE expenses ADD COLUMN is_raw_material BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_raw_material column to expenses table';
    ELSE
        RAISE NOTICE 'is_raw_material column already exists in expenses table';
    END IF;
    
END $$;

-- Verify the columns were added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'expenses' 
ORDER BY ordinal_position;

-- Show a summary of the current table structure
SELECT 
    COUNT(*) as total_columns,
    STRING_AGG(column_name, ', ') as column_names
FROM information_schema.columns 
