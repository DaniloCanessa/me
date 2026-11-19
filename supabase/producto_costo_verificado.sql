-- Fecha de "costo verificado" del producto (sesión 44).
--
-- Responde "¿cuándo fue la última vez que alguien revisó el costo del
-- proveedor?". Se mueve en tres casos:
--   1. Cambia costo_proveedor_clp (trigger: formulario, importador o SQL).
--   2. Se aprieta "✓ Precio vigente" en la ficha o con varios seleccionados
--      (el costo sigue igual, pero se confirmó con el proveedor).
--   3. Se importa una lista Excel que trae columna de costo (el importador
--      confirma todos los productos que vienen, cambien o no).
-- Cambiar solo el margen o el precio de venta NO la mueve: eso no es revisar
-- el costo.

ALTER TABLE products ADD COLUMN IF NOT EXISTS costo_verificado_at timestamptz;

-- Punto de partida: la última edición del producto es lo mejor que sabemos.
UPDATE products SET costo_verificado_at = COALESCE(updated_at, created_at, now())
WHERE costo_verificado_at IS NULL;

ALTER TABLE products ALTER COLUMN costo_verificado_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION products_touch_costo_verificado()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.costo_proveedor_clp IS DISTINCT FROM OLD.costo_proveedor_clp THEN
    NEW.costo_verificado_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_products_costo_verificado ON products;
CREATE TRIGGER trg_products_costo_verificado
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION products_touch_costo_verificado();
