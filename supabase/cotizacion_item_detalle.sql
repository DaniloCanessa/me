-- Descripción opcional por ítem de cotización (sesión 42).
-- Se marca con un check en el editor y aparece en el PDF bajo el nombre del
-- producto. null = sin descripción (las cotizaciones existentes no cambian).
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS detalle text;
