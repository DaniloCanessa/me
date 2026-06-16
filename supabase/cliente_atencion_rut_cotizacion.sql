-- "Atención a" en clientes (contacto que solicitó la cotización en una empresa)
-- + snapshot de RUT y atención en la cotización (para el PDF), igual que ya se
-- snapshotean nombre/email/teléfono: así editar el cliente luego no altera
-- cotizaciones históricas.

alter table clients add column if not exists atencion_a text;

alter table quotes add column if not exists client_rut text;
alter table quotes add column if not exists client_atencion text;
