# Coupon RLS Fix Instructions

## Problem
When creating new coupons in the POS system, you get the error:
```
"Failed to save coupon: new row violates row-level security policy for table 'discount_coupons'"
```

## Root Cause
The current Row Level Security (RLS) policies on the `discount_coupons` table are too restrictive and don't allow the POS system (which uses anonymous authentication) to create new coupons.

## Solution
Apply the RLS fix by running the SQL script in your Supabase project.

## Step-by-Step Instructions

### 1. Apply the RLS Fix

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **+ New query**
5. Copy and paste the entire content from `coupon_rls_fix.sql` file
6. Click **RUN**

### 2. Verify the Fix

After running the SQL script, verify that the policies are correctly set:

1. Go to **Authentication** → **Policies** in your Supabase dashboard
2. Find the `discount_coupons` table
3. You should see these policies:
   - "Public users can view all coupons" (SELECT)
   - "Public users can create coupons" (INSERT)
   - "Public users can update coupons" (UPDATE)
   - "Public users can delete coupons" (DELETE)
   - "Service role full access to coupons" (ALL)

### 3. Test Coupon Creation

1. Open your POS system (`pos.html`)
2. Click the coupon management button (ticket icon)
3. Click "Create New Coupon"
4. Fill in the coupon details and click "Save Coupon"
5. The coupon should now save successfully without RLS errors

## Alternative: Manual Policy Setup

If you prefer to set up policies manually:

1. Go to **Authentication** → **Policies**
2. Select the `discount_coupons` table
3. Delete any existing restrictive policies
4. Create these new policies:

**Policy 1: Public SELECT**
- Operation: SELECT
- Policy name: "Public users can view all coupons"
- Expression: `true`

**Policy 2: Public INSERT**
- Operation: INSERT
- Policy name: "Public users can create coupons"
- Expression: `true`

**Policy 3: Public UPDATE**
- Operation: UPDATE
- Policy name: "Public users can update coupons"
- Expression: `true`

**Policy 4: Public DELETE**
- Operation: DELETE
- Policy name: "Public users can delete coupons"
- Expression: `true`

## Security Considerations

This fix allows public access to coupon operations. For enhanced security in production:

1. Consider implementing user authentication in your POS system
2. Use service role keys for sensitive operations
3. Add additional validation in your application code
4. Monitor coupon usage and creation patterns

## Troubleshooting

If you still encounter issues:

1. **Check RLS is enabled**: Ensure RLS is enabled on the `discount_coupons` table
2. **Verify permissions**: Make sure the `anon` role has INSERT permissions
3. **Clear browser cache**: Sometimes cached JavaScript can cause issues
4. **Check Supabase logs**: Look for detailed error messages in the Supabase logs

## Files Created

- `coupon_rls_fix.sql` - The SQL script to fix the RLS policies
- `COUPON_RLS_FIX_INSTRUCTIONS.md` - These instructions

## Support

If you continue to experience issues after applying this fix, please check:
- Supabase documentation on RLS policies
- Your Supabase project settings
