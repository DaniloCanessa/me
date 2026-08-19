-- ═══════════════════════════════════════════════════════════════════════════
-- Facturas de compra duplicadas — PASO 1: REVISAR (no modifica nada)
-- Mercado Energy · Agosto 2026
--
-- Este archivo SOLO CONSULTA. Se puede correr entero sin riesgo.
-- Cuando hayas revisado el resultado, corre facturas_v2_duplicados_aplicar.sql
-- para borrar las copias y crear el índice que impide que vuelva a pasar.
--
-- CONTEXTO: la migración facturas_v2.sql quedó aplicada completa MENOS el
-- índice anti-duplicados, porque los datos ya traían documentos repetidos
-- (mismo RUT + folio + tipo).
--
-- Causa: getConciliacion buscaba las facturas de la app solo DENTRO del mes,
-- así que una registrada sin fecha (o con la fecha fuera del período) aparecía
-- siempre como "falta en app" y "registrar todas las que faltan" la reinsertaba
-- en cada corrida. Ya está corregido en el código (sesión 32).
--
-- Qué se vio afectado por los duplicados:
--   · El F29 NO: su crédito sale del RCV del SII, no de expense_captures.
--   · El costo total del balance TAMPOCO: también sale del RCV.
--   · Sí se infló el P&L de caja de Finanzas (gastos generales) y el desglose
--     por cuenta del balance, que leen expense_captures.
--
-- QUÉ REVISAR EN EL RESULTADO:
--   Dentro de cada grupo (mismo proveedor + folio), los MONTOS deben ser
--   iguales. Si difieren, no son copias sino dos documentos distintos mal
--   digitados: ésos hay que corregirlos a mano, no borrarlos.
-- ═══════════════════════════════════════════════════════════════════════════

WITH ranked AS (
  SELECT
    id, rut, folio, tipo, proveedor, fecha, total, neto, iva,
    image_path, xml_path, project_id, purchase_id, created_at,
    upper(replace(replace(rut, '.', ''), ' ', '')) AS rut_norm,
    row_number() OVER (
      PARTITION BY upper(replace(replace(rut, '.', ''), ' ', '')),
                   trim(folio),
                   coalesce(tipo, 'factura')
      -- Se queda la más "rica": la vinculada a un proyecto, luego la que tiene
      -- el documento adjunto, y a igualdad de todo la más antigua (la original,
      -- no la copia que se insertó después).
      ORDER BY (purchase_id IS NOT NULL) DESC,
               (image_path IS NOT NULL OR xml_path IS NOT NULL) DESC,
               created_at ASC
    ) AS rn,
    count(*) OVER (
      PARTITION BY upper(replace(replace(rut, '.', ''), ' ', '')),
                   trim(folio),
                   coalesce(tipo, 'factura')
    ) AS veces
  FROM expense_captures
  WHERE rut IS NOT NULL AND folio IS NOT NULL
    AND trim(folio) <> '' AND status <> 'rechazado'
)
SELECT
  CASE WHEN rn = 1 THEN '✅ SE QUEDA' ELSE '🗑️ SE BORRA' END AS decision,
  proveedor, rut_norm, folio, fecha, total, neto, iva,
  CASE WHEN project_id IS NOT NULL THEN 'sí' ELSE '—' END AS en_proyecto,
  CASE WHEN image_path IS NOT NULL OR xml_path IS NOT NULL THEN 'sí' ELSE '—' END AS con_documento,
  created_at, id
FROM ranked
WHERE veces > 1
ORDER BY rut_norm, folio, rn;
