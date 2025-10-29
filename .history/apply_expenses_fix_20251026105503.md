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
If the quick fix doesn't work, you can recreate the entire table by running the `expenses_table_setup.sql` file again in Supabase SQL Editor.

### Option 3: Use the Comprehensive Fix Script
Run the `fix_expenses_quantity_column.sql` file in Supabase SQL Editor.

## Steps to Apply the Fix

1. **Go to Supabase Dashboard**
   - Navigate to your project at https://supabase.com/dashboard
   - Select your DCB POS project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Create a new query

3. **Run the Quick Fix SQL**
   - Copy and paste the SQL from Option 1 above
   - Click "Run" to execute the query

4. **Verify the Fix**
   - Go to "Table Editor" 
   - Find the "expenses" table
   - Check that all the columns listed above now exist

5. **Test the Expenses Page**
   - Open your expenses page at `http://localhost:8080/expenses.html`
   - Try adding a new expense
   - It should save successfully without errors

## Expected Result
After applying this fix:
- ✅ Expenses can be saved without errors
- ✅ All form fields work correctly
- ✅ Inventory integration works for raw materials
- ✅ Charts and statistics display properly

## Troubleshooting
If you still encounter issues:

1. **Clear Browser Cache**
   - Hard refresh the page (Ctrl+F5)
   - Clear browser cache and cookies

2. **Check Console for Errors**
   - Open browser developer tools (F12)
   - Look for any new error messages

3. **Verify Database Connection**
   - Ensure your Supabase URL and API key are correct in the code
   - Check that RLS policies are properly configured

## Prevention
To avoid similar issues in the future:
- Always run the complete table setup script when creating new tables
- Test database operations immediately after setup
- Keep database schema documentation updated

