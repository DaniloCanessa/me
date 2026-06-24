-- ═══════════════════════════════════════════════════════════════════════════
-- F29 oficial declarado al SII (por período)
-- Mercado Energy · Junio 2026
--
-- Guarda los códigos del certificado de declaración del F29 de cada mes. Es la
-- referencia oficial para: (1) comparar contra lo que calcula la app desde el
-- RCV, y (2) VERIFICAR EL REMANENTE encadenado mes a mes — el SII a veces no
-- arrastra el remanente del mes anterior (504 ← 77 del mes previo) y se pierde
-- crédito. Todos los códigos nullable (no todos los certificados los muestran).
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS f29_oficial (
  periodo            TEXT PRIMARY KEY,          -- 'AAAA-MM'
  folio              TEXT,
  fecha_declaracion  DATE,
  c502_debito        NUMERIC,                   -- débito facturas
  c538_total_debito  NUMERIC,                   -- total débitos
  c511_credito_neto  NUMERIC,                   -- crédito del giro (neto de NC)
  c520_credito       NUMERIC,                   -- crédito facturas (bruto)
  c504_rem_anterior  NUMERIC,                   -- remanente mes anterior
  c537_total_credito NUMERIC,                   -- total créditos
  c77_rem_siguiente  NUMERIC,                   -- remanente mes siguiente
  c563_base_ppm      NUMERIC,
  c062_ppm           NUMERIC,
  c91_total_pagar    NUMERIC,
  notas              TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
