-- ═══════════════════════════════════════════════════════════════════════════
-- Módulo de FACTURAS v2 (sesión 32)
-- Mercado Energy · Agosto 2026
--
-- Rediseño del ciclo de facturas al estilo ERP:
--   · La factura de COMPRA es un documento independiente que se clasifica por
--     CUENTA (plan de cuentas editable). El proyecto deja de pedirse al
--     ingresar: pasa a ser un centro de costo opcional que se vincula después
--     desde la ficha del proyecto.
--   · Las facturas de VENTA llevan estado de pago (compromiso, pagos parciales,
--     % pagado) y alimentan la cobranza automática por correo.
--   · La conciliación con el SII pasa a ser documento por documento también en
--     ventas (antes solo comparaba totales).
--
-- Es IDEMPOTENTE: se puede correr más de una vez sin romper nada.
-- Ejecutar completo en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1) Plan de cuentas de compras (editable desde el back-office)
--
-- Cada cuenta declara a qué GRUPO del balance pertenece. Ese grupo es lo único
-- que el balance necesita saber:
--   costo_giro   → Costo de ventas          (resta al resultado)
--   gasto_admin  → Gastos de administración (resta al resultado)
--   activo_fijo  → Activo fijo              (NO es gasto: se activa y deprecia)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_accounts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo     TEXT NOT NULL UNIQUE,          -- slug estable, se usa en el código
  nombre     TEXT NOT NULL,                 -- etiqueta visible (editable)
  grupo      TEXT NOT NULL
               CHECK (grupo IN ('costo_giro', 'gasto_admin', 'activo_fijo')),
  descripcion TEXT,                         -- ayuda que se muestra bajo la opción
  orden      INTEGER NOT NULL DEFAULT 100,
  activo     BOOLEAN NOT NULL DEFAULT true, -- se desactiva en vez de borrar
  es_default BOOLEAN NOT NULL DEFAULT false,-- cuenta preseleccionada al ingresar
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_accounts_grupo ON purchase_accounts (grupo, orden);

-- Solo una cuenta puede ser la preseleccionada
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_accounts_default
  ON purchase_accounts (es_default) WHERE es_default;

INSERT INTO purchase_accounts (codigo, nombre, grupo, descripcion, orden, es_default) VALUES
  -- Costo del giro
  ('materiales',    'Materiales y equipos',            'costo_giro',  'Paneles, inversores, estructura, cables, baterías', 10, true),
  ('subcontratos',  'Subcontratos y servicios de terceros', 'costo_giro', 'Instaladores, eléctricos, obras civiles',      20, false),
  ('fletes',        'Fletes y despachos',              'costo_giro',  'Transporte de materiales a obra',                  30, false),
  -- Gasto de administración
  ('arriendo',      'Arriendo',                        'gasto_admin', 'Oficina, bodega, estacionamiento',                 40, false),
  ('servicios',     'Servicios básicos',               'gasto_admin', 'Luz, agua, internet, telefonía',                   50, false),
  ('combustible',   'Combustible y peajes',            'gasto_admin', 'Bencina, TAG, estacionamientos',                   60, false),
  ('marketing',     'Marketing y publicidad',          'gasto_admin', 'Avisos, redes, material gráfico',                  70, false),
  ('oficina',       'Oficina e insumos computacionales','gasto_admin','Papelería, licencias de software, suscripciones',  80, false),
  ('mantencion',    'Mantención y reparaciones',       'gasto_admin', 'Vehículo, herramientas, oficina',                  90, false),
  ('seguros',       'Seguros',                         'gasto_admin', 'Pólizas de vehículo, responsabilidad civil',      100, false),
  ('comisiones',    'Comisiones bancarias',            'gasto_admin', 'Transbank, mantención de cuenta, transferencias', 110, false),
  ('otros_gastos',  'Otros gastos',                    'gasto_admin', 'Lo que no calza en ninguna cuenta anterior',      120, false),
  -- Activo fijo
  ('herramientas',  'Herramientas e instrumentos',     'activo_fijo', 'Taladros, multímetros, andamios',                 130, false),
  ('computacion',   'Equipos computacionales',         'activo_fijo', 'Notebooks, monitores, impresoras',                140, false),
  ('vehiculos',     'Vehículos',                       'activo_fijo', 'Camionetas, furgones',                            150, false)
ON CONFLICT (codigo) DO NOTHING;


-- ───────────────────────────────────────────────────────────────────────────
-- 2) Facturas de compra (expense_captures): clasificación por cuenta + origen
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE expense_captures
  ADD COLUMN IF NOT EXISTS account_id   UUID REFERENCES purchase_accounts(id) ON DELETE SET NULL,
  -- Cómo entró el documento: 'xml' (DTE del SII), 'foto' (imagen/PDF + OCR),
  -- 'rcv' (dado de alta desde la conciliación), 'manual' (tecleado).
  ADD COLUMN IF NOT EXISTS origen       TEXT NOT NULL DEFAULT 'foto'
                                        CHECK (origen IN ('xml', 'foto', 'rcv', 'manual')),
  -- XML original del DTE guardado en el bucket 'receipts' (respaldo tributario)
  ADD COLUMN IF NOT EXISTS xml_path     TEXT,
  -- Líneas del detalle del DTE (nombre, cantidad, precio) para consulta
  ADD COLUMN IF NOT EXISTS detalle_json JSONB;

-- Backfill de la clasificación de lo ya cargado:
--   activo fijo marcado          → Herramientas e instrumentos
--   categoría de gasto general   → la cuenta equivalente
--   el resto (compras de obra)   → Materiales y equipos
UPDATE expense_captures e
   SET account_id = (SELECT id FROM purchase_accounts WHERE codigo = 'herramientas')
 WHERE e.account_id IS NULL AND e.activo_fijo;

UPDATE expense_captures e
   SET account_id = (SELECT id FROM purchase_accounts WHERE codigo = m.codigo)
  FROM (VALUES
      ('Arriendo',          'arriendo'),
      ('Sueldos',           'otros_gastos'),
      ('Honorarios',        'otros_gastos'),
      ('Servicios básicos', 'servicios'),
      ('Marketing',         'marketing'),
      ('Transporte',        'fletes'),
      ('Oficina',           'oficina'),
      ('Impuestos',         'otros_gastos'),
      ('Comisiones',        'comisiones'),
      ('Otros',             'otros_gastos')
  ) AS m(categoria, codigo)
 WHERE e.account_id IS NULL AND e.categoria = m.categoria;

UPDATE expense_captures
   SET account_id = (SELECT id FROM purchase_accounts WHERE codigo = 'materiales')
 WHERE account_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_expense_captures_account ON expense_captures (account_id);
CREATE INDEX IF NOT EXISTS idx_expense_captures_fecha   ON expense_captures (fecha DESC);

-- Anti-duplicados: el mismo proveedor no puede tener dos veces el mismo folio
-- del mismo tipo de documento. Es exactamente el error que se coló con el
-- Sodimac duplicado. Solo aplica cuando hay RUT y folio (las boletas sueltas
-- sin folio quedan fuera del índice).
-- Normalizamos el RUT igual que en la app: sin puntos ni espacios, mayúsculas.
--
-- Si los datos actuales YA tienen un duplicado, crear el índice fallaría y
-- abortaría la migración completa. Por eso va dentro de un bloque que avisa en
-- vez de romper: el resto queda aplicado y el duplicado se limpia después
-- (la consulta de abajo los lista).
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_captures_doc_unico
    ON expense_captures (
      upper(replace(replace(rut, '.', ''), ' ', '')),
      trim(folio),
      coalesce(tipo, 'factura')
    )
    WHERE rut IS NOT NULL AND folio IS NOT NULL
      AND trim(folio) <> '' AND status <> 'rechazado';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'OJO: hay facturas duplicadas, el índice anti-duplicados NO se creó.';
  RAISE NOTICE 'Ejecuta la consulta del final de este archivo, borra los duplicados y vuelve a correr esta migración.';
END $$;


-- ───────────────────────────────────────────────────────────────────────────
-- 3) Facturas de venta: compromiso de pago y control de cobranza
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE sales_invoices
  -- Fecha en que el cliente se comprometió a pagar (dispara la cobranza)
  ADD COLUMN IF NOT EXISTS fecha_compromiso      DATE,
  -- Condición pactada: 'contado' | '15' | '30' | '60' | '90' | 'manual'
  ADD COLUMN IF NOT EXISTS condicion_pago        TEXT NOT NULL DEFAULT 'contado',
  -- Silenciar la cobranza de una factura puntual (acuerdo especial, etc.)
  ADD COLUMN IF NOT EXISTS cobranza_pausada      BOOLEAN NOT NULL DEFAULT false,
  -- Última vez que se avisó y en qué escalón, para no repetir el mismo correo
  ADD COLUMN IF NOT EXISTS cobranza_ultimo_envio TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cobranza_nivel        TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_invoices_compromiso ON sales_invoices (fecha_compromiso);

-- Pagos recibidos contra una factura de venta.
-- Si la factura está vinculada a un proyecto, al registrar el pago se crea
-- TAMBIÉN el project_payment correspondiente y se enlaza aquí, para que la
-- cuenta corriente del proyecto y la caja no se cuenten dos veces.
CREATE TABLE IF NOT EXISTS sales_invoice_payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_invoice_id   UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  fecha              DATE NOT NULL DEFAULT CURRENT_DATE,
  monto_clp          NUMERIC NOT NULL DEFAULT 0,
  metodo             TEXT NOT NULL DEFAULT 'transferencia'
                       CHECK (metodo IN ('transferencia', 'cheque', 'efectivo', 'credito', 'otro')),
  referencia         TEXT,
  notas              TEXT,
  -- Espejo en la cuenta corriente del proyecto (si la factura tiene proyecto)
  project_payment_id UUID REFERENCES project_payments(id) ON DELETE SET NULL,
  created_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_invoice_payments_invoice
  ON sales_invoice_payments (sales_invoice_id);


-- ───────────────────────────────────────────────────────────────────────────
-- 4) RCV de ventas: detalle documento por documento
--
-- La tabla sii_rcv_ventas (resumen por tipo de documento) se mantiene tal cual
-- porque de ahí sale el IVA débito del F29. Esta tabla nueva guarda el DETALLE
-- cuando el CSV descargado del SII lo trae, para poder cruzar folio a folio.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sii_rcv_ventas_detalle (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo       TEXT NOT NULL,                -- 'AAAA-MM'
  tipo_doc      TEXT,                         -- 33 factura, 39 boleta, 61 NC…
  rut_cliente   TEXT,
  razon_social  TEXT,
  folio         TEXT,
  fecha_docto   DATE,
  monto_exento  NUMERIC NOT NULL DEFAULT 0,
  monto_neto    NUMERIC NOT NULL DEFAULT 0,
  monto_iva     NUMERIC NOT NULL DEFAULT 0,
  monto_total   NUMERIC NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (periodo, tipo_doc, rut_cliente, folio)
);

CREATE INDEX IF NOT EXISTS idx_sii_rcv_ventas_detalle_periodo
  ON sii_rcv_ventas_detalle (periodo);


-- ───────────────────────────────────────────────────────────────────────────
-- 5) Configuración de la cobranza (editable en /admin/config)
-- ───────────────────────────────────────────────────────────────────────────

-- La columna `value` es JSONB (se convirtió en whatsapp_config.sql), por eso el
-- texto va envuelto en to_jsonb(...::text) y no como literal suelto.
INSERT INTO config_parameters (key, value, category, description) VALUES
  ('cobranza.email', to_jsonb('ventas@mercadoenergy.cl'::text), 'cobranza',
   'Correo que recibe los avisos de facturas de venta por vencer y vencidas'),
  ('cobranza.activa', to_jsonb('true'::text), 'cobranza',
   'Activa o desactiva el envío automático de avisos de cobranza ("true" / "false")')
ON CONFLICT (key) DO NOTHING;


-- ───────────────────────────────────────────────────────────────────────────
-- 6) Comprobación: facturas duplicadas (mismo proveedor + folio + tipo)
--
-- Debería devolver 0 filas. Si devuelve alguna, borra la copia sobrante y
-- vuelve a correr esta migración para que quede creado el índice que impide
-- que el problema se repita.
-- ───────────────────────────────────────────────────────────────────────────

SELECT
  upper(replace(replace(rut, '.', ''), ' ', '')) AS rut_normalizado,
  trim(folio)                                    AS folio,
  coalesce(tipo, 'factura')                      AS tipo,
  count(*)                                       AS veces,
  string_agg(id::text, ', ')                     AS ids,
  string_agg(coalesce(proveedor, '?'), ' | ')    AS proveedores
FROM expense_captures
WHERE rut IS NOT NULL AND folio IS NOT NULL
  AND trim(folio) <> '' AND status <> 'rechazado'
GROUP BY 1, 2, 3
HAVING count(*) > 1
ORDER BY veces DESC;
