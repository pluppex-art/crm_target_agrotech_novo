-- Migration 012: Fix casing constraints for seller_origin and partner_origin
-- This ensures that both CRM (lowercase) and Finance (uppercase) values are accepted.

-- Update leads table constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_seller_origin_check;
ALTER TABLE leads ADD CONSTRAINT leads_seller_origin_check 
  CHECK (seller_origin IN ('target', 'pluppex', 'TARGET', 'PLUPPEX'));

-- Update lead_class_enrollments table constraint
ALTER TABLE lead_class_enrollments DROP CONSTRAINT IF EXISTS lead_class_enrollments_seller_origin_check;
ALTER TABLE lead_class_enrollments ADD CONSTRAINT lead_class_enrollments_seller_origin_check 
  CHECK (seller_origin IN ('target', 'pluppex', 'TARGET', 'PLUPPEX'));

-- Update financial_transactions table constraint
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_partner_origin_check;
ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_partner_origin_check 
  CHECK (partner_origin IN ('target', 'pluppex', 'TARGET', 'PLUPPEX'));

-- Normalize existing data to lowercase (safe default for leads)
UPDATE leads SET seller_origin = 'target' WHERE seller_origin = 'TARGET';
UPDATE lead_class_enrollments SET seller_origin = 'target' WHERE seller_origin = 'TARGET';
