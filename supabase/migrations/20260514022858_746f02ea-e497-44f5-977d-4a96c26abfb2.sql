ALTER TABLE public.mro_orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT; -- 'pix' or 'card'

-- Ensure partners table has necessary fields for the dashboard
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS password TEXT; -- For simple access if not using full Auth

-- Update RLS for mro_orders so partners can see their own orders
CREATE POLICY "Partners can view their own orders" 
ON public.mro_orders 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.partners 
        WHERE id = mro_orders.partner_id AND (user_id = auth.uid() OR partners.slug = (SPLIT_PART(mro_orders.email, ':', 1)))
    )
);
