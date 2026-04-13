-- Manter estados de Contrato, PIX e Desconto no banco de dados
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pix_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contract_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percent' CHECK (discount_type IN ('percent', 'money'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS discount_applied BOOLEAN DEFAULT FALSE;
