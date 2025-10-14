-- Inventory Table Enhancements for Delhi Chicken Brothers
-- This script adds essential columns for real-time inventory management and profit tracking

-- Add columns to inventory table
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS minimum_stock numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_per_unit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplier_info text DEFAULT '',
ADD COLUMN IF NOT EXISTS last_updated timestamp with time zone DEFAULT now();

-- Create trigger to automatically update last_updated timestamp
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_updated_at();

-- Update existing inventory items with default values
UPDATE public.inventory 
SET 
    minimum_stock = CASE 
        WHEN name = 'Chicken' THEN 2000
        WHEN name = 'Mutton Mince' THEN 1000
        WHEN name = 'Paneer' THEN 500
        WHEN name = 'Tandoori Masala' THEN 200
        WHEN name = 'Roomali Roti' THEN 50
        WHEN name = 'Oil' THEN 1000
        ELSE 100
    END,
    cost_per_unit = CASE 
        WHEN name = 'Chicken' THEN 2.5
        WHEN name = 'Mutton Mince' THEN 4.0
        WHEN name = 'Paneer' THEN 1.8
        WHEN name = 'Tandoori Masala' THEN 0.1
        WHEN name = 'Roomali Roti' THEN 0.5
        WHEN name = 'Oil' THEN 0.08
        ELSE 1.0
    END,
    supplier_info = CASE 
        WHEN name = 'Chicken' THEN 'Local Poultry Farm - 9876543210'
        WHEN name = 'Mutton Mince' THEN 'Meat Supplier - 9876543211'
        WHEN name = 'Paneer' THEN 'Dairy Supplier - 9876543212'
        WHEN name = 'Tandoori Masala' THEN 'Spice Wholesaler - 9876543213'
        WHEN name = 'Roomali Roti' THEN 'Bakery Supplier - 9876543214'
        WHEN name = 'Oil' THEN 'Oil Distributor - 9876543215'
        ELSE 'General Supplier'
    END;

-- Create inventory_usage table for tracking inventory consumption
CREATE TABLE IF NOT EXISTS public.inventory_usage (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ingredient_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE,
    order_id bigint REFERENCES public.orders(id) ON DELETE CASCADE,
    quantity_used numeric NOT NULL,
    cost_incurred numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Create index for better performance
