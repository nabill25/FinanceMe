-- Step 13: Split Bill Migration
-- Menambahkan kolom is_split dan split_details ke tabel transactions

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS is_split BOOLEAN DEFAULT false;

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS split_details JSONB;

-- Comment on columns for documentation
COMMENT ON COLUMN public.transactions.is_split IS 'Menandakan apakah transaksi ini adalah hasil patungan (Split Bill)';
COMMENT ON COLUMN public.transactions.split_details IS 'Detail patungan. Format JSON: [{ "name": "Budi", "amount": 50000, "is_paid": false }]';
