-- ═══════════════════════════════════════════════════════════════════════════
-- CATÁLOGO DE PANELES SOLARES
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Por qué existe: la potencia de los paneles cambia rápido (550 W → 700 W → …)
-- y hasta ahora los kWp de cada kit se escribían a mano en `specs.sizekWp`.
-- Eso permitió que el kit `pfv-8.8kw` quedara con 12 paneles y 8,8 kWp a la vez:
-- 12 × 550 W = 6,6 kW y 12 × 700 W = 8,4 kW, así que 8,8 no correspondía a
-- ninguna combinación real. La simulación generaba con 8,8 → sobreestimaba el
-- ahorro ~4,8 % en toda cotización que usara ese kit.
--
-- Con esta tabla el panel pasa a ser una entidad propia y cada kit apunta a
-- uno. La potencia real del kit se DERIVA (paneles × W del panel) y deja de
-- poder contradecir a sus propios componentes.
--
-- El nombre comercial del kit NO cambia: `specs.sizekWp` se conserva tal cual
-- y se sigue usando para rotularlo ("PFV 8,8 kW"). Lo que cambia es que los
-- cálculos pasan a usar la potencia derivada, y el informe muestra las dos:
-- "PFV 8,8 kW (8,4 kW)".
--
-- Idempotente: se puede correr más de una vez sin efecto.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Tabla de paneles ────────────────────────────────────────────────────

create table if not exists solar_panels (
  id           uuid primary key default gen_random_uuid(),
  nombre       text    not null,               -- marca y modelo, ej. "Astroenergy"
  potencia_w   integer not null check (potencia_w > 0),
  peso_kg      numeric(6,2),
  ancho_mm     integer not null check (ancho_mm > 0),
  largo_mm     integer not null check (largo_mm > 0),
  espesor_mm   integer,                        -- ficha técnica; no entra en el cálculo de superficie
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Las columnas de la matriz de asignación se ordenan por potencia (550, 600,
-- 650, 700…), así que el índice acompaña ese orden.
create index if not exists solar_panels_potencia_idx on solar_panels (potencia_w);

-- Dos paneles distintos pueden llamarse igual si son de potencias distintas,
-- pero no tiene sentido repetir el mismo modelo con la misma potencia.
create unique index if not exists solar_panels_nombre_potencia_key
  on solar_panels (lower(trim(nombre)), potencia_w);

comment on table solar_panels is
  'Catálogo de paneles. Cada kit solar apunta a uno y su potencia real se deriva de paneles × potencia_w.';

-- ─── 2. Vínculo kit → panel ─────────────────────────────────────────────────
--
-- `on delete restrict` es la mitad de la garantía de "no se puede borrar un
-- panel con kits asociados". La otra mitad vive en la UI, que además nombra los
-- kits que hay que reasignar antes — un error de FK a secas no dice cuáles son.

alter table products
  add column if not exists panel_id uuid references solar_panels(id) on delete restrict;

create index if not exists products_panel_id_idx on products (panel_id);

comment on column products.panel_id is
  'Panel usado por este kit solar. Null en productos que no son kits.';

-- ─── 3. Semilla ─────────────────────────────────────────────────────────────
--
-- El de 700 W son los datos reales del panel en uso (Astroenergy, 2384 × 1303
-- × 33 mm, 38 kg). El de 550 W se siembra con las dimensiones que ya estaban
-- en `SOLAR_DEFAULTS` del código; MARCA Y PESO QUEDAN POR CONFIRMAR — editar
-- en /admin/paneles.

insert into solar_panels (nombre, potencia_w, peso_kg, ancho_mm, largo_mm, espesor_mm)
values ('Astroenergy', 700, 38.00, 1303, 2384, 33)
on conflict do nothing;

insert into solar_panels (nombre, potencia_w, peso_kg, ancho_mm, largo_mm, espesor_mm)
values ('Panel 550 W (marca por confirmar)', 550, null, 1134, 2278, null)
on conflict do nothing;

-- ─── 4. Asignación inicial de los kits existentes ───────────────────────────
--
-- Todos los kits actuales cuadran con paneles de 550 W (10 kW = 18 paneles,
-- 11 kW = 20, 6,6 kW = 12, 8,8 kW con batería = 16…). La única excepción es
-- `pfv-8.8kw`, que tiene 12 paneles: esa cantidad corresponde al panel de
-- 700 W (12 × 700 = 8,4 kW), y es el kit que estaba a medio migrar.
--
-- Solo se tocan los kits que aún no tienen panel, para no pisar asignaciones
-- hechas a mano si esto se vuelve a correr.

update products
   set panel_id = (select id from solar_panels where potencia_w = 550 order by created_at limit 1),
       updated_at = now()
 where category = 'solar_kit'
   and panel_id is null
   and sku <> 'pfv-8.8kw';

update products
   set panel_id = (select id from solar_panels where potencia_w = 700 order by created_at limit 1),
       updated_at = now()
 where category = 'solar_kit'
   and panel_id is null
   and sku = 'pfv-8.8kw';

-- ─── 5. Verificación ────────────────────────────────────────────────────────
--
-- Compara el kWp comercial con el que sale de los componentes. Una diferencia
-- grande no es necesariamente un error (el nombre comercial puede quedarse
-- atrás a propósito, que es justo el caso del 8,8), pero conviene revisarla.

select
  p.sku                                              as kit,
  (p.specs->>'sizekWp')::numeric                     as kwp_comercial,
  (p.specs->>'panelCount')::int                      as paneles,
  sp.potencia_w                                      as panel_w,
  sp.nombre                                          as panel,
  round((p.specs->>'panelCount')::int * sp.potencia_w / 1000.0, 2) as kwp_real,
  round((p.specs->>'panelCount')::int * sp.potencia_w / 1000.0
        - (p.specs->>'sizekWp')::numeric, 2)         as diferencia
from products p
left join solar_panels sp on sp.id = p.panel_id
where p.category = 'solar_kit' and p.is_active
order by (p.specs->>'sizekWp')::numeric;
