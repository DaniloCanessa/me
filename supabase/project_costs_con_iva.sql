-- Agregar campo con_iva a project_costs
-- Ejecutar en Supabase SQL Editor

ALTER TABLE project_costs
ADD COLUMN IF NOT EXISTS con_iva BOOLEAN DEFAULT true;

-- Actualizar registros existentes para que sean consistentes
-- Asumimos que los montos existentes ya incluyen IVA
UPDATE project_costs
SET con_iva = true
WHERE con_iva IS NULL;

-- Hacer el campo NOT NULL después de la actualización
ALTER TABLE project_costs
ALTER COLUMN con_iva SET NOT NULL;

-- Agregar comentario para documentar
COMMENT ON COLUMN project_costs.con_iva IS 'true = monto incluye IVA, false = monto sin IVA (se le agregará 19% en cálculos)';