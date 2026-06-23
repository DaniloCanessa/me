-- ═══════════════════════════════════════════════════════════════════════════
-- Balance anual / Pre-balance + registro de honorarios (BHE) — Fase D
-- Mercado Energy · Junio 2026
--
-- Consolida el año (ingresos/costos/IVA del RCV + PPM del F29 + honorarios) en
-- un pre-balance disponible en cualquier momento y un balance a fin de año, al
-- estilo del balance de 8 columnas (Régimen Pro PyME 14D N°3).
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

-- Saldos de apertura del ejercicio (uno por año). Editables; las cifras de
-- patrimonio (aportes/pérdida acumulada) son saldos a confirmar con el contador.
CREATE TABLE IF NOT EXISTS balance_config (
  anio                        INTEGER PRIMARY KEY,
  capital_social              NUMERIC NOT NULL DEFAULT 0,
  aportes_socio               NUMERIC NOT NULL DEFAULT 0,  -- cta cte socio
  perdida_acumulada_anterior  NUMERIC NOT NULL DEFAULT 0,
  caja_inicial                NUMERIC NOT NULL DEFAULT 0,
  notas                       TEXT,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Boletas de honorarios (BHE) recibidas: gasto por honorarios + retención.
CREATE TABLE IF NOT EXISTS honorarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo       TEXT NOT NULL,                 -- 'AAAA-MM'
  fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
  emisor        TEXT,                          -- profesional que emite la BHE
  rut           TEXT,
  folio         TEXT,                          -- N° de la boleta
  monto_bruto   NUMERIC NOT NULL DEFAULT 0,    -- gasto por honorarios (5.1.02)
  retencion     NUMERIC NOT NULL DEFAULT 0,    -- retención 2ª categoría (2.1.02 / cód 151)
  monto_liquido NUMERIC NOT NULL DEFAULT 0,    -- bruto − retención (lo pagado)
  glosa         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_honorarios_periodo ON honorarios (periodo);
