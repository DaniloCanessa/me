-- ═══════════════════════════════════════════════════════════════════════════
-- Gasto general: flag de activo fijo
-- Mercado Energy · Junio 2026
--
-- Una factura de compra puede ser un GASTO (resta al resultado) o un ACTIVO FIJO
-- (bien durable: no es gasto, se activa y se deprecia; su IVA es crédito de
-- activo fijo, F29 cód. 525). Este flag distingue ambos en el balance.
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE expense_captures
  ADD COLUMN IF NOT EXISTS activo_fijo BOOLEAN NOT NULL DEFAULT false;
