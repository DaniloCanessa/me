-- Compras y anticipos por proyecto
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS project_purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_item_id UUID REFERENCES project_items(id) ON DELETE SET NULL,
  tipo            TEXT NOT NULL DEFAULT 'factura'
                    CHECK (tipo IN ('factura', 'anticipo')),
  proveedor       TEXT,
  folio           TEXT,
  monto_clp       NUMERIC NOT NULL DEFAULT 0,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_purchases_project_id_idx ON project_purchases(project_id);
CREATE INDEX IF NOT EXISTS project_purchases_item_id_idx    ON project_purchases(project_item_id);
