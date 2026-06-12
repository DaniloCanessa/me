-- ═══════════════════════════════════════════════════════════════════════════
-- Finanzas / gastos generales (sesión 26)
-- - Permite registrar gastos generales A MANO (sin foto): image_path nullable.
-- - Agrega categoría a los gastos (arriendo, sueldos, servicios…) para el
--   desglose del módulo de Finanzas.
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE expense_captures ALTER COLUMN image_path DROP NOT NULL;
ALTER TABLE expense_captures ADD COLUMN IF NOT EXISTS categoria TEXT;
