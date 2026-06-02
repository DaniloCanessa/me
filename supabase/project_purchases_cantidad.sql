-- Agregar campos de cantidad y precio unitario a project_purchases
-- Ejecutar en Supabase SQL Editor

ALTER TABLE project_purchases
ADD COLUMN IF NOT EXISTS cantidad_comprada NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS precio_unitario_sin_iva NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS costo_referencia_sin_iva NUMERIC;

-- Actualizar registros existentes para que sean consistentes
-- Asumimos que el monto_clp existente es el precio unitario sin IVA para cantidad = 1
UPDATE project_purchases
SET precio_unitario_sin_iva = monto_clp,
    cantidad_comprada = 1
WHERE cantidad_comprada IS NULL OR precio_unitario_sin_iva IS NULL;

-- Agregar constraints
ALTER TABLE project_purchases
ALTER COLUMN cantidad_comprada SET NOT NULL,
ALTER COLUMN precio_unitario_sin_iva SET NOT NULL;

-- Agregar check constraints para valores válidos
ALTER TABLE project_purchases
ADD CONSTRAINT project_purchases_cantidad_positive CHECK (cantidad_comprada > 0),
ADD CONSTRAINT project_purchases_precio_positive CHECK (precio_unitario_sin_iva >= 0),
ADD CONSTRAINT project_purchases_costo_referencia_positive CHECK (costo_referencia_sin_iva IS NULL OR costo_referencia_sin_iva >= 0);