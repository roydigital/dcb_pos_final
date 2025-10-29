# Fix for Expenses Saving Error

## Problem
When trying to save new expenses, you're getting this error:
```
Error saving expense: {code: 'PGRST204', details: null, hint: null, message: "Could not find the 'quantity' column of 'expenses' in the schema cache"}
```

## Root Cause
The Supabase `expenses` table is missing some columns that the JavaScript code expects. The table schema doesn't match what the application is trying to insert.

## Solution

### Option 1: Quick Fix (Recommended)
Run this SQL script in your Supabase SQL Editor:

```sql
-- Quick fix for missing columns in expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,3);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS quantity_used DECIMAL(10,3);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS inventory_item_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_raw_material BOOLEAN DEFAULT FALSE;
```

### Option 2: Complete Table Recreation
