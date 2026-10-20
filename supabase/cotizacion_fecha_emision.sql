-- Fecha de emisión editable en la cotización (sesión 40).
-- NULL = se usa la fecha de creación (created_at), así que las cotizaciones
-- existentes no cambian.
alter table quotes add column if not exists fecha_emision date;
