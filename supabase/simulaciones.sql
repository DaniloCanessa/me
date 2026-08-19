-- ═══════════════════════════════════════════════════════════════════════════
-- Simulaciones guardadas (sesión 32)
-- Mercado Energy · Agosto 2026
--
-- Hasta ahora la simulación era efímera: vivía en memoria del navegador y solo
-- dejaba rastro si se generaba una cotización. Además el resumen se archivaba
-- en un único campo de la instalación (`installations.simulation_data`), que se
-- pisaba en cada simulación nueva.
--
-- Con esto la simulación pasa a ser una entidad propia:
--   · Una instalación puede tener MUCHAS simulaciones.
--   · Cada una guarda la FECHA Y HORA en que se hizo y la FECHA DE LA BOLETA
--     de la que salió, para poder distinguirlas (incluso dos del mismo día).
--   · Corregir una simulación no la sobrescribe: se guarda una nueva, así queda
--     el rastro de qué cambió y por qué cambió el número.
--   · Las BOLETAS que se suben quedan archivadas junto a la simulación, para
--     tener todo el historial del cliente en el CRM y no en carpetas sueltas.
--
-- Es IDEMPOTENTE: se puede correr más de una vez.
-- Ejecutar completo en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1) Simulaciones
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  client_id       UUID NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  installation_id UUID          REFERENCES installations(id) ON DELETE SET NULL,

  -- Las dos fechas que permiten identificar de qué es esta simulación.
  -- `fecha_simulacion` lleva hora porque una misma boleta puede reabrirse y
  -- corregirse varias veces el mismo día.
  fecha_simulacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_boleta     DATE,                  -- período principal leído de la boleta
  numero_boleta    TEXT,                  -- n° de documento, si el OCR lo pudo leer

  -- Snapshot de dónde es, para no depender de que la instalación no cambie
  direccion       TEXT,
  comuna          TEXT,
  region_id       TEXT,
  customer_type   TEXT NOT NULL DEFAULT 'natural'
                    CHECK (customer_type IN ('natural', 'business')),

  -- Resultado destacado (el escenario que quedó marcado como recomendado)
  escenario           TEXT,               -- 'A' | 'B' | 'C' | 'empresa'
  kit_size_kwp        NUMERIC,
  panel_count         INTEGER,
  system_cost_clp     NUMERIC,
  battery_kwh         NUMERIC NOT NULL DEFAULT 0,
  annual_benefit_clp  NUMERIC,
  payback_years       NUMERIC,
  bill_savings_percent NUMERIC,
  average_monthly_kwh NUMERIC,

  -- Estado completo del wizard, para poder REABRIR la simulación y editarla
  -- (corregir un consumo mal leído, cambiar el kit) generando una nueva.
  input_json      JSONB,
  -- Resumen del resultado, para mostrar el listado sin recalcular
  result_json     JSONB,

  -- Si de esta simulación salió una cotización, queda enlazada
  quote_id        UUID REFERENCES quotes(id) ON DELETE SET NULL,
  -- Si esta simulación es la corrección de otra, apunta a la original
  corrige_id      UUID REFERENCES simulations(id) ON DELETE SET NULL,

  notas           TEXT,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulations_client       ON simulations (client_id, fecha_simulacion DESC);
CREATE INDEX IF NOT EXISTS idx_simulations_installation ON simulations (installation_id);
CREATE INDEX IF NOT EXISTS idx_simulations_fecha_boleta ON simulations (fecha_boleta);
CREATE INDEX IF NOT EXISTS idx_simulations_numero       ON simulations (numero_boleta);


-- ───────────────────────────────────────────────────────────────────────────
-- 2) Boletas de luz archivadas
--
-- El archivo que se sube para autocompletar queda guardado en el bucket
-- privado 'receipts' (el mismo de las facturas de compra), bajo el prefijo
-- 'boletas-luz/'. Así el historial del cliente vive en el CRM.
-- Una simulación puede apoyarse en varias boletas (se pueden subir varias).
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulation_bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id   UUID          REFERENCES simulations(id)   ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  installation_id UUID          REFERENCES installations(id) ON DELETE SET NULL,

  file_path       TEXT NOT NULL,          -- ruta en el bucket 'receipts'
  file_name       TEXT,                   -- nombre original, para mostrarlo
  content_type    TEXT,

  fecha_boleta    DATE,
  numero_boleta   TEXT,
  distribuidora   TEXT,
  ocr_json        JSONB,                  -- extracción cruda, para auditoría

  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulation_bills_sim    ON simulation_bills (simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_bills_client ON simulation_bills (client_id, fecha_boleta DESC);


-- ───────────────────────────────────────────────────────────────────────────
-- 3) Migración del resumen que vivía en la instalación
--
-- Lo que había en `installations.simulation_data` se convierte en la primera
-- simulación guardada de esa instalación, para no perder el historial.
-- La columna se mantiene por compatibilidad, pero deja de usarse.
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO simulations (
  client_id, installation_id, fecha_simulacion, direccion, comuna, region_id,
  customer_type, escenario, kit_size_kwp, panel_count, system_cost_clp,
  battery_kwh, annual_benefit_clp, payback_years, average_monthly_kwh,
  result_json, notas
)
SELECT
  i.client_id,
  i.id,
  COALESCE(i.updated_at, now()),
  i.direccion, i.comuna, i.region_id,
  COALESCE(i.customer_type, 'natural'),
  i.simulation_data->>'escenario',
  (i.simulation_data->>'kitSizeKWp')::numeric,
  (i.simulation_data->>'panelCount')::integer,
  (i.simulation_data->>'systemCostCLP')::numeric,
  COALESCE((i.simulation_data->>'batteryCapacityKWh')::numeric, 0),
  (i.simulation_data->>'annualBenefitCLP')::numeric,
  (i.simulation_data->>'paybackYears')::numeric,
  (i.simulation_data->>'averageMonthlyKWh')::numeric,
  i.simulation_data,
  'Migrada desde el campo simulation_data de la instalación'
FROM installations i
WHERE i.simulation_data IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM simulations s
     WHERE s.installation_id = i.id
       AND s.notas = 'Migrada desde el campo simulation_data de la instalación'
  );


-- ───────────────────────────────────────────────────────────────────────────
-- 4) Comprobación
-- ───────────────────────────────────────────────────────────────────────────

SELECT
  c.nombre                                   AS cliente,
  i.nombre_instalacion                       AS instalacion,
  to_char(s.fecha_simulacion, 'DD-MM-YYYY HH24:MI') AS simulada,
  s.fecha_boleta,
  s.kit_size_kwp                             AS kwp,
  s.annual_benefit_clp                       AS ahorro_anual
FROM simulations s
JOIN clients c        ON c.id = s.client_id
LEFT JOIN installations i ON i.id = s.installation_id
ORDER BY s.fecha_simulacion DESC;
