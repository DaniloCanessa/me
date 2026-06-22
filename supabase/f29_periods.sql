-- ═══════════════════════════════════════════════════════════════════════════
-- Planilla F29 mensual (módulo tributario — Fase B)
-- Mercado Energy · Junio 2026
--
-- El F29 del SII tiene renglones que el sistema CALCULA desde los documentos
-- (débito de ventas, crédito de compras, IVA determinado) y renglones que el
-- usuario COMPLETA al declarar para corroborar contra el SII (remanente del mes
-- anterior, PPM, retenciones, reajustes/multas). Esta tabla guarda solo los
-- campos manuales por mes; lo calculado se deriva en vivo de sales_invoices /
-- project_purchases / expense_captures (NO se persiste para no quedar desfasado).
--
-- Códigos del F29 (SII) entre paréntesis. Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS f29_periods (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo               TEXT NOT NULL UNIQUE,           -- 'AAAA-MM'

  -- Crédito arrastrado: lo que el SII trae del mes anterior (cód. 504).
  -- Se pre-llena con el remanente siguiente (77) del mes previo, editable.
  remanente_anterior    NUMERIC NOT NULL DEFAULT 0,     -- cód. 504

  -- PPM 1ª categoría
  ppm_base              NUMERIC NOT NULL DEFAULT 0,      -- cód. 563 (base imponible)
  ppm_tasa              NUMERIC NOT NULL DEFAULT 0,      -- cód. 115 (tasa %)
  ppm_neto              NUMERIC NOT NULL DEFAULT 0,      -- cód. 062 (PPM determinado)

  -- Retenciones / otros que suman al total a pagar
  retencion_honorarios  NUMERIC NOT NULL DEFAULT 0,      -- cód. 151 (2ª categoría)
  otros_impuestos       NUMERIC NOT NULL DEFAULT 0,      -- otros débitos varios

  -- Recargos (solo si se declara fuera de plazo)
  reajustes             NUMERIC NOT NULL DEFAULT 0,      -- cód. 92
  multas                NUMERIC NOT NULL DEFAULT 0,      -- cód. 93

  notas                 TEXT,
  revisado              BOOLEAN NOT NULL DEFAULT false,  -- el usuario cuadró el mes con el SII
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_f29_periods_periodo ON f29_periods (periodo);
