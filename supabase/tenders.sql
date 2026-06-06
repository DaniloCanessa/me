-- ═══════════════════════════════════════════════════════════════════════════
-- Licitaciones de Mercado Público (sesión 19)
-- Ejecutar en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════════════════

-- Licitaciones que calzan con los servicios de Mercado Energy
CREATE TABLE IF NOT EXISTS tenders (
  codigo_externo    TEXT PRIMARY KEY,           -- ID de Mercado Público (ej: "1234-56-LE26")
  nombre            TEXT NOT NULL,
  descripcion       TEXT,
  organismo         TEXT,
  unidad            TEXT,
  region            TEXT,
  fecha_publicacion DATE,
  fecha_cierre      TIMESTAMPTZ,
  estado_mp         TEXT,                        -- estado en Mercado Público (Publicada, Cerrada...)
  monto_estimado    NUMERIC,
  moneda            TEXT,
  keywords_matched  TEXT[] NOT NULL DEFAULT '{}',
  estado_interno    TEXT NOT NULL DEFAULT 'nueva'
                    CHECK (estado_interno IN ('nueva','vista','interesa','descartada','postulada')),
  notificada        BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenders_estado_interno ON tenders (estado_interno);
CREATE INDEX IF NOT EXISTS idx_tenders_fecha_cierre   ON tenders (fecha_cierre);

-- Palabras clave parametrizables para el filtro de licitaciones
CREATE TABLE IF NOT EXISTS tender_keywords (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword    TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed inicial (alineado a los 5 servicios). El match es por substring sin
-- acentos ni mayúsculas, por eso "eolic" cubre eólica/eólico/eólicas.
INSERT INTO tender_keywords (keyword) VALUES
  ('fotovoltaic'),
  ('panel solar'),
  ('paneles solares'),
  ('energia solar'),
  ('planta solar'),
  ('eolic'),
  ('climatizacion'),
  ('aire acondicionado'),
  ('calefaccion'),
  ('bomba de calor'),
  ('eficiencia energetica'),
  ('asesoria energetica'),
  ('auditoria energetica'),
  ('banco de baterias'),
  ('respaldo energetico'),
  ('sistema hibrido'),
  ('off grid'),
  ('off-grid'),
  ('ernc'),
  ('energia renovable'),
  ('electrificacion'),
  ('alumbrado publico solar'),
  ('termo electrico'),
  ('termo solar')
ON CONFLICT (keyword) DO NOTHING;
