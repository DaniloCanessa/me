-- Agrega el campo con_iva a project_purchases (sesión 21).
-- false = el monto ingresado es NETO (comportamiento histórico: la cuenta corriente le aplica ×1.19)
-- true  = el monto ingresado YA INCLUYE IVA (la cuenta corriente lo usa tal cual)
ALTER TABLE project_purchases ADD COLUMN IF NOT EXISTS con_iva BOOLEAN DEFAULT false;
UPDATE project_purchases SET con_iva = false WHERE con_iva IS NULL;
ALTER TABLE project_purchases ALTER COLUMN con_iva SET NOT NULL;
