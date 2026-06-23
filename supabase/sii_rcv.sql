-- ═══════════════════════════════════════════════════════════════════════════
-- Conciliación SII — Registro de Compras y Ventas (RCV) importado del SII
-- Mercado Energy · Junio 2026
--
-- El usuario descarga del SII cada mes los CSV del RCV:
--   RCV_COMPRA_REGISTRO_<rut>_<AAAAMM>.csv  → detalle de facturas de compra
--   RCV_RESUMEN_VENTA_<rut>_<AAAAMM>.csv     → resumen de ventas por tipo doc
-- Estas tablas guardan esa "verdad tributaria" para:
--  (1) alimentar el crédito/débito del F29 (cuadra exacto con el SII), y
--  (2) conciliar mes a mes contra lo registrado en la app (gastos / ventas),
--      detectando facturas que faltan en un lado u otro (incluido crédito que
--      el SII a veces olvida).
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

-- Detalle de compras (una fila por factura recibida del RCV)
CREATE TABLE IF NOT EXISTS sii_rcv_compras (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo        TEXT NOT NULL,                 -- 'AAAA-MM'
  tipo_doc       TEXT,                          -- 33 factura, 34 exenta, 61 NC…
  tipo_compra    TEXT,                          -- 'Del Giro', etc.
  rut_proveedor  TEXT,
  razon_social   TEXT,
  folio          TEXT,
  fecha_docto    DATE,
  monto_exento   NUMERIC NOT NULL DEFAULT 0,
  monto_neto     NUMERIC NOT NULL DEFAULT 0,
  monto_iva      NUMERIC NOT NULL DEFAULT 0,    -- IVA recuperable
  monto_total    NUMERIC NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Reimportar el mismo período no duplica (upsert sobre el documento)
  UNIQUE (periodo, tipo_doc, rut_proveedor, folio)
);

CREATE INDEX IF NOT EXISTS idx_sii_rcv_compras_periodo ON sii_rcv_compras (periodo);

-- Resumen de ventas por tipo de documento (el RCV de ventas es agregado)
CREATE TABLE IF NOT EXISTS sii_rcv_ventas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo          TEXT NOT NULL,               -- 'AAAA-MM'
  tipo_documento   TEXT NOT NULL,               -- 'Comprobantes Pago Electrónico(48)'…
  total_documentos INTEGER NOT NULL DEFAULT 0,
  monto_exento     NUMERIC NOT NULL DEFAULT 0,
  monto_neto       NUMERIC NOT NULL DEFAULT 0,
  monto_iva        NUMERIC NOT NULL DEFAULT 0,
  monto_total      NUMERIC NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (periodo, tipo_documento)
);

CREATE INDEX IF NOT EXISTS idx_sii_rcv_ventas_periodo ON sii_rcv_ventas (periodo);
