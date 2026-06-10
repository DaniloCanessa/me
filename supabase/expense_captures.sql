-- ═══════════════════════════════════════════════════════════════════════════
-- Captura de gastos / boletas de compra (sesión 24)
-- Bandeja de boletas: se capturan (foto + proyecto opcional), se revisan con
-- OCR y se aprueban. Al aprobar CON proyecto se crea un project_purchase;
-- SIN proyecto queda como gasto general de la empresa en esta misma tabla.
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS expense_captures (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Imagen en Supabase Storage (bucket privado 'receipts')
  image_path        TEXT NOT NULL,

  -- Pipeline de la bandeja
  status            TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (status IN ('pendiente','aprobado','rechazado')),

  -- Asignación. project_id NULL = sin proyecto (gasto general de la empresa).
  project_id        UUID REFERENCES projects(id)        ON DELETE SET NULL,
  project_item_id   UUID REFERENCES project_items(id)   ON DELETE SET NULL,
  sin_proyecto      BOOLEAN NOT NULL DEFAULT false,  -- intención explícita "sin proyecto"
  -- Compra creada al aprobar con proyecto (se enlaza para trazabilidad)
  purchase_id       UUID REFERENCES project_purchases(id) ON DELETE SET NULL,

  -- Datos de la boleta/factura (pre-llenados por OCR, editables en la revisión)
  proveedor         TEXT,
  rut               TEXT,
  tipo              TEXT,            -- 'factura' | 'boleta' | 'anticipo' | otro
  folio             TEXT,
  fecha             DATE,
  neto              NUMERIC,
  iva               NUMERIC,
  total             NUMERIC,
  con_iva           BOOLEAN NOT NULL DEFAULT true,   -- si 'total' ya incluye IVA
  moneda            TEXT NOT NULL DEFAULT 'CLP',
  notas             TEXT,

  -- OCR
  ocr_status        TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (ocr_status IN ('pendiente','ok','error')),
  ocr_json          JSONB,           -- extracción cruda para auditoría

  -- Trazabilidad
  captured_by       TEXT,            -- quién subió la foto (nombre/email o 'link')
  reviewed_by       TEXT,            -- quién aprobó/rechazó
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_captures_status     ON expense_captures (status);
CREATE INDEX IF NOT EXISTS idx_expense_captures_project    ON expense_captures (project_id);
CREATE INDEX IF NOT EXISTS idx_expense_captures_created_at ON expense_captures (created_at DESC);

-- Bucket privado para las imágenes de boletas. El acceso es 100% server-side
-- con la service-role key (que ignora RLS), por eso no se definen políticas.
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;
