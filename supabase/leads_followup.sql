-- Recordatorio de seguimiento y asignación de vendedor en leads
-- Ejecutar en Supabase SQL Editor

ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
