-- ═══════════════════════════════════════════════════════════════════════════
-- Facturas de venta emitidas (módulo tributario F29 — Fase A)
-- Mercado Energy · Junio 2026
--
-- Hoy las ventas solo existen como pagos recibidos (project_payments, base
-- caja). El F29 necesita el DOCUMENTO de venta (factura emitida) con folio,
-- fecha de emisión y desglose neto/IVA → de aquí sale el IVA DÉBITO (cód. 502).
-- El documento del SII (PDF/imagen) se sube al bucket privado 'receipts'
-- (el mismo de las facturas de compra), bajo prefijo 'ventas/'.
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales_invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Origen (opcionales: una factura puede no estar atada a un proyecto)
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id     UUID REFERENCES clients(id)  ON DELETE SET NULL,

  -- Snapshot del cliente al emitir (no cambia si luego se edita el cliente)
  client_nombre TEXT,
  client_rut    TEXT,

  -- Documento tributario
  tipo          TEXT NOT NULL DEFAULT 'factura'
                  CHECK (tipo IN ('factura', 'boleta', 'nota_credito', 'nota_debito')),
  folio         TEXT,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Montos (CLP). neto + iva = total. El IVA débito del F29 sale de iva_clp.
  neto_clp      NUMERIC NOT NULL DEFAULT 0,
  iva_clp       NUMERIC NOT NULL DEFAULT 0,
  total_clp     NUMERIC NOT NULL DEFAULT 0,

  -- Documento del SII subido (PDF/imagen) en bucket 'receipts', prefijo ventas/
  image_path    TEXT,
  ocr_status    TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (ocr_status IN ('pendiente', 'ok', 'error')),
  ocr_json      JSONB,

  -- Una NC/anulación deja la factura como 'anulada' (no suma al débito)
  estado        TEXT NOT NULL DEFAULT 'emitida'
                  CHECK (estado IN ('emitida', 'anulada')),

  notas         TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_fecha   ON sales_invoices (fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_project ON sales_invoices (project_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_estado  ON sales_invoices (estado);
