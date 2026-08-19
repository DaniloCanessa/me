-- ═══════════════════════════════════════════════════════════════════════════
-- Facturas de compra duplicadas — PASO 2: APLICAR (BORRA DATOS)
-- Mercado Energy · Agosto 2026
--
-- ⚠️  ESTE ARCHIVO BORRA FILAS. Corre antes facturas_v2_duplicados.sql y revisa
--     que dentro de cada grupo los montos sean iguales.
--
-- Deja UNA fila por documento (la marcada "✅ SE QUEDA" en la revisión) y borra
-- la compra espejo que la copia hubiera creado en la cuenta corriente de un
-- proyecto — si no, el proyecto quedaría con el costo duplicado y una compra
-- huérfana sin factura detrás.
--
-- Son 3 sentencias INDEPENDIENTES entre sí: ninguna usa una tabla creada por
-- otra. El editor SQL de Supabase planifica todo el script antes de ejecutar la
-- primera sentencia, así que una tabla auxiliar (temporal o no) creada aquí no
-- existiría todavía al planificar las siguientes. Por eso el borrado completo
-- va en UNA sola sentencia con CTEs.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1) Borrar las copias, y con ellas su compra espejo ──────────────────────
--
-- Cómo se lee, de adentro hacia afuera:
--   ranked   → numera las filas de cada documento (mismo RUT + folio + tipo),
--              dejando en el puesto 1 la que se conserva: la vinculada a un
--              proyecto, luego la que tiene documento adjunto y, a igualdad de
--              todo, la más antigua (la original, no la copia posterior).
--   losers   → de la 2 en adelante: las copias.
--   borradas → borra esas copias de expense_captures y devuelve el purchase_id
--              que tenían, para poder limpiar la compra asociada.
--   Y la sentencia final borra esas compras espejo.
--
-- El orden importa: expense_captures.purchase_id apunta a project_purchases con
-- ON DELETE SET NULL. Al borrar la factura ANTES que la compra, cuando se borra
-- la compra ya no queda nadie apuntándola y no hay conflicto.

WITH ranked AS (
  SELECT id, purchase_id,
    row_number() OVER (
      PARTITION BY upper(replace(replace(rut, '.', ''), ' ', '')),
                   trim(folio),
                   coalesce(tipo, 'factura')
      ORDER BY (purchase_id IS NOT NULL) DESC,
               (image_path IS NOT NULL OR xml_path IS NOT NULL) DESC,
               created_at ASC
    ) AS rn
  FROM expense_captures
  WHERE rut IS NOT NULL AND folio IS NOT NULL
    AND trim(folio) <> '' AND status <> 'rechazado'
),
losers AS (
  SELECT id, purchase_id FROM ranked WHERE rn > 1
),
borradas AS (
  DELETE FROM expense_captures e
   USING losers l
   WHERE e.id = l.id
  RETURNING l.purchase_id
)
DELETE FROM project_purchases p
 USING borradas b
 WHERE p.id = b.purchase_id;


-- ─── 2) Crear el índice anti-duplicados ──────────────────────────────────────
-- Es el que no se pudo crear en facturas_v2.sql. Si vuelve a fallar, quedó
-- algún duplicado: repite la revisión.

CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_captures_doc_unico
  ON expense_captures (
    upper(replace(replace(rut, '.', ''), ' ', '')),
    trim(folio),
    coalesce(tipo, 'factura')
  )
  WHERE rut IS NOT NULL AND folio IS NOT NULL
    AND trim(folio) <> '' AND status <> 'rechazado';


-- ─── 3) Verificación final — debe devolver 0 filas ───────────────────────────

SELECT
  upper(replace(replace(rut, '.', ''), ' ', '')) AS rut_normalizado,
  trim(folio) AS folio, coalesce(tipo, 'factura') AS tipo, count(*) AS veces
FROM expense_captures
WHERE rut IS NOT NULL AND folio IS NOT NULL
  AND trim(folio) <> '' AND status <> 'rechazado'
GROUP BY 1, 2, 3
HAVING count(*) > 1;
