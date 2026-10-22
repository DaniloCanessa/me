-- ═══════════════════════════════════════════════════════════════════════════
-- Búsquedas de licitaciones (sesión 40)
-- Cada búsqueda tiene sus propias palabras clave y sus propios correos: la
-- revisión diaria consulta Mercado Público una vez y cada búsqueda envía su
-- correo solo con sus licitaciones. Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tender_searches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL UNIQUE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_email_date DATE,          -- último día (Chile) en que esta búsqueda envió correo
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO tender_searches (nombre) VALUES ('Solar y energía'), ('Climatización')
ON CONFLICT (nombre) DO NOTHING;

-- ── Palabras clave: pasan a pertenecer a una búsqueda ──────────────────────
ALTER TABLE tender_keywords ADD COLUMN IF NOT EXISTS search_id UUID
  REFERENCES tender_searches(id) ON DELETE CASCADE;

UPDATE tender_keywords SET search_id = (SELECT id FROM tender_searches WHERE nombre = 'Climatización')
WHERE search_id IS NULL
  AND keyword IN ('aire acondicionado', 'climatizacion', 'calefaccion', 'bomba de calor', 'termo electrico');

UPDATE tender_keywords SET search_id = (SELECT id FROM tender_searches WHERE nombre = 'Solar y energía')
WHERE search_id IS NULL;

ALTER TABLE tender_keywords ALTER COLUMN search_id SET NOT NULL;
-- La misma palabra puede estar en dos búsquedas distintas.
ALTER TABLE tender_keywords DROP CONSTRAINT IF EXISTS tender_keywords_keyword_key;
ALTER TABLE tender_keywords DROP CONSTRAINT IF EXISTS tender_keywords_search_keyword_key;
ALTER TABLE tender_keywords ADD CONSTRAINT tender_keywords_search_keyword_key UNIQUE (search_id, keyword);

-- Variantes que se estaban escapando (análisis de 10 días de publicaciones).
INSERT INTO tender_keywords (search_id, keyword)
SELECT s.id, k.keyword
FROM tender_searches s,
     (VALUES ('luminaria solar'), ('luminarias solares'), ('autoconsumo'), ('termosolar'),
             ('termos solares'), ('colector solar'), ('colectores solares')) AS k(keyword)
WHERE s.nombre = 'Solar y energía'
ON CONFLICT (search_id, keyword) DO NOTHING;

INSERT INTO tender_keywords (search_id, keyword)
SELECT id, 'termoelectrico' FROM tender_searches WHERE nombre = 'Climatización'
ON CONFLICT (search_id, keyword) DO NOTHING;

-- ── Correos: cada búsqueda tiene los suyos ─────────────────────────────────
ALTER TABLE tender_recipients ADD COLUMN IF NOT EXISTS search_id UUID
  REFERENCES tender_searches(id) ON DELETE CASCADE;

ALTER TABLE tender_recipients DROP CONSTRAINT IF EXISTS tender_recipients_email_key;

-- Los correos actuales quedan en las dos búsquedas: nadie deja de recibir nada.
INSERT INTO tender_recipients (email, is_active, search_id)
SELECT r.email, r.is_active, s.id
FROM tender_recipients r, tender_searches s
WHERE r.search_id IS NULL AND s.nombre = 'Climatización';

UPDATE tender_recipients SET search_id = (SELECT id FROM tender_searches WHERE nombre = 'Solar y energía')
WHERE search_id IS NULL;

ALTER TABLE tender_recipients ALTER COLUMN search_id SET NOT NULL;
ALTER TABLE tender_recipients DROP CONSTRAINT IF EXISTS tender_recipients_search_email_key;
ALTER TABLE tender_recipients ADD CONSTRAINT tender_recipients_search_email_key UNIQUE (search_id, email);

-- ── Licitaciones: con qué búsquedas calzaron ───────────────────────────────
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS searches_matched UUID[] NOT NULL DEFAULT '{}';

UPDATE tenders t SET searches_matched = COALESCE((
  SELECT array_agg(DISTINCT k.search_id)
  FROM tender_keywords k
  WHERE k.keyword = ANY (t.keywords_matched)
), '{}')
WHERE searches_matched = '{}';
