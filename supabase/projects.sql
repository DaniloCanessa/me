-- ═══════════════════════════════════════════════════════════════════════════
-- Módulo de Proyectos — Fase 3
-- Mercado Energy · Abril 2026
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Ítems de venta del proyecto (copia editable de quote_items)
CREATE TABLE IF NOT EXISTS project_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  quote_item_id        UUID REFERENCES quote_items(id) ON DELETE SET NULL,
  description          TEXT NOT NULL,
  quantity             NUMERIC NOT NULL DEFAULT 1,
  unit_price_clp       NUMERIC NOT NULL DEFAULT 0,
  costo_proveedor_clp  NUMERIC NOT NULL DEFAULT 0,
  discount_percent     NUMERIC NOT NULL DEFAULT 0,
  total_clp            NUMERIC NOT NULL DEFAULT 0,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Costos adicionales de ejecución (imprevistos)
CREATE TABLE IF NOT EXISTS project_costs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  monto_clp   NUMERIC NOT NULL DEFAULT 0,
  categoria   TEXT NOT NULL DEFAULT 'otro'
                CHECK (categoria IN ('mano_de_obra','materiales','transporte','subcontrato','otro')),
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
