-- ═══════════════════════════════════════════════════════════════════════════
-- Migración Fase 2 — Cotizador + CRM
-- Mercado Energy · Abril 2026
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. USUARIOS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user'
                  CHECK (role IN ('admin', 'user')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Primer usuario administrador
-- Contraseña inicial: MercadoAdmin2026!
INSERT INTO users (email, password_hash, name, role)
VALUES (
  'danilo.canessa@gmail.com',
  '$2b$12$h/7tUWaUo0UuL4gsJ1pTPOoH8la7s2V/8YkLqmD3MzHY2q3qCytzO',
  'Danilo Canessa',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- ─── 2. CLIENTES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID REFERENCES leads(id) ON DELETE SET NULL,
  nombre      TEXT NOT NULL,
  rut         TEXT,
  empresa     TEXT,
  ciudad      TEXT,
  telefono    TEXT,
  email       TEXT,
  notas       TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  source      TEXT DEFAULT 'manual'
                CHECK (source IN ('simulador','referido','llamada','visita','manual','otro')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. INSTALACIONES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS installations (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  lead_id                       UUID REFERENCES leads(id) ON DELETE SET NULL,
  nombre_instalacion            TEXT NOT NULL,
  direccion                     TEXT,
  ciudad                        TEXT,
  region_id                     TEXT,
  customer_type                 TEXT CHECK (customer_type IN ('natural','business')),
  distribuidora                 TEXT,
  tarifa                        TEXT,
  amperaje_a                    INTEGER,
  potencia_contratada_kw        NUMERIC,
  tension_suministro            TEXT CHECK (tension_suministro IN ('BT','AT')),
  consumo_promedio_mensual_kwh  NUMERIC,
  simulation_data               JSONB,
  notas                         TEXT,
  is_active                     BOOLEAN NOT NULL DEFAULT true,
  created_at                    TIMESTAMPTZ DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. CONTACTOS DE CLIENTE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL,
  cargo        TEXT,
  email        TEXT,
  telefono     TEXT,
  es_principal BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. ACTIVIDADES (timeline CRM) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  lead_id     UUID REFERENCES leads(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL
                CHECK (tipo IN ('llamada','visita','email','nota','reunion','otro')),
  descripcion TEXT NOT NULL,
  fecha       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. PROYECTOS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id        UUID REFERENCES quotes(id) ON DELETE SET NULL,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  installation_id UUID REFERENCES installations(id) ON DELETE SET NULL,
  nombre          TEXT NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','en_ejecucion','completado','cancelado')),
  fecha_inicio    DATE,
  fecha_termino   DATE,
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. ALTER: leads ─────────────────────────────────────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id)   ON DELETE SET NULL;

-- ─── 8. ALTER: products ──────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS stock               INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_proveedor_clp NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margen_pct          NUMERIC;

-- ─── 9. ALTER: quotes ────────────────────────────────────────────────────────
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS client_id       UUID REFERENCES clients(id)       ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS installation_id UUID REFERENCES installations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to     UUID REFERENCES users(id)         ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by       UUID REFERENCES users(id)         ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS validity_days   INTEGER NOT NULL DEFAULT 10;

-- ─── 10. ALTER: quote_items ──────────────────────────────────────────────────
ALTER TABLE quote_items
  ADD COLUMN IF NOT EXISTS costo_proveedor_clp NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margen_pct          NUMERIC NOT NULL DEFAULT 30;

-- ─── 11. Parámetro de margen global ──────────────────────────────────────────
INSERT INTO config_parameters (key, value, category, description)
VALUES ('default_margin_pct', '30', 'business',
        'Margen % aplicado a nuevos ítems de cotización cuando el producto no tiene margen propio')
ON CONFLICT (key) DO NOTHING;
