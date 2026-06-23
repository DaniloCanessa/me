-- ═══════════════════════════════════════════════════════════════════════════
-- Ciclo anticipo → factura (módulo tributario — Fase C)
-- Mercado Energy · Junio 2026
--
-- Un anticipo (pago a proveedor sin factura todavía) cuenta como salida de caja
-- pero NO da crédito IVA. Cuando llega la factura del proveedor, se enlaza al
-- anticipo que salda y se indica si el monto de la factura YA INCLUYE ese
-- anticipo ("absorbe") o si es adicional (varía por proveedor).
--
--   absorbs_anticipo = true  → el anticipo absorbido no se cuenta de nuevo en
--                              caja (la factura ya lo incluye); evita doble conteo.
--   absorbs_anticipo = false → factura adicional; anticipo y factura cuentan ambos.
--
-- El crédito IVA siempre se toma en el mes de la factura (lógica del F29 ya
-- vigente: tipo='anticipo' excluido, tipo='factura' incluido).
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE project_purchases
  ADD COLUMN IF NOT EXISTS settles_anticipo_id UUID
    REFERENCES project_purchases(id) ON DELETE SET NULL;

ALTER TABLE project_purchases
  ADD COLUMN IF NOT EXISTS absorbs_anticipo BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_project_purchases_settles
  ON project_purchases (settles_anticipo_id);

COMMENT ON COLUMN project_purchases.settles_anticipo_id IS
  'Si esta compra es una factura que salda un anticipo, apunta a la fila del anticipo.';
COMMENT ON COLUMN project_purchases.absorbs_anticipo IS
  'true = el monto de la factura ya incluye el anticipo saldado (no se cuenta el anticipo de nuevo en caja).';
