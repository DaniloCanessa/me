-- Redes sociales del footer (sesión 20) — YA EJECUTADO vía API el 6 jun 2026.
-- Categoría 'social' en config_parameters, editable desde /admin/config.
-- Valor vacío = la red no se muestra en el footer. Requiere columna value JSONB
-- (convertida en whatsapp_config.sql).

INSERT INTO config_parameters (key, value, category, description) VALUES
  ('social.instagram', to_jsonb(''::text), 'social',
   'URL del perfil de Instagram (vacío = no se muestra en el footer)'),
  ('social.facebook', to_jsonb(''::text), 'social',
   'URL de la página de Facebook (vacío = no se muestra en el footer)'),
  ('social.youtube', to_jsonb(''::text), 'social',
   'URL del canal de YouTube (vacío = no se muestra en el footer)'),
  ('social.tiktok', to_jsonb(''::text), 'social',
   'URL del perfil de TikTok (vacío = no se muestra en el footer)')
ON CONFLICT (key) DO NOTHING;
