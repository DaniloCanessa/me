-- ═══════════════════════════════════════════════════════════════════════════
-- CRM Leads — Fase 3
-- Mercado Energy · Abril 2026
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lead_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL DEFAULT 'nota'
               CHECK (tipo IN ('nota','llamada','email','visita','reunion','otro')),
  contenido  TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
