-- Parámetros del botón flotante de WhatsApp (sesión 20)
-- La columna value era NUMERIC (solo números). Se convierte a JSONB para
-- soportar también parámetros de texto. Los valores numéricos existentes se
-- preservan como números JSON — la app los sigue leyendo igual (Number(value)).

ALTER TABLE config_parameters
  ALTER COLUMN value TYPE jsonb USING to_jsonb(value);

INSERT INTO config_parameters (key, value, category, description) VALUES
  ('whatsapp.number', to_jsonb('56912345678'::text), 'whatsapp',
   'Número de WhatsApp del botón flotante (código país + número, sin "+" ni espacios)'),
  ('whatsapp.default_message', to_jsonb('Hola, me gustaría cotizar un proyecto de energía solar.'::text), 'whatsapp',
   'Mensaje pre-escrito que se abre al hacer clic en el botón de WhatsApp')
ON CONFLICT (key) DO NOTHING;
