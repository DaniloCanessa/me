-- Pagos recibidos por proyecto
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS project_payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  monto_clp   NUMERIC NOT NULL DEFAULT 0,
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  metodo      TEXT NOT NULL DEFAULT 'transferencia'
                CHECK (metodo IN ('transferencia', 'cheque', 'efectivo', 'credito', 'otro')),
  referencia  TEXT,
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
