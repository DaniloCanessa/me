# Mercado Energy — Contexto del Proyecto

> Última actualización: 26 de abril 2026 (sesión 9)
> Repositorio: https://github.com/DaniloCanessa/me
> Producción: https://me-fawn-eight.vercel.app

---

## ⚡ PRÓXIMO PASO AL REABRIR ESTE PROYECTO

**Sesión 9 completa. CRM avanzado: asignación de vendedor, vista Kanban y recordatorios de seguimiento.**

**SQL ya ejecutado en Supabase** (`supabase/leads_followup.sql`):
- `follow_up_date DATE` en tabla `leads`
- `assigned_to UUID REFERENCES users(id)` en tabla `leads`

Al iniciar la próxima sesión, continuar con las mejoras de prioridad media (ver sección Pendientes):
- Precio de kWh dinámico por distribuidora/tarifa
- Notificaciones por email cuando llega un lead nuevo
- Pipeline de ventas: métricas de conversión por etapa en el dashboard

---

## Objetivo del proyecto

Plataforma web de simulación solar fotovoltaica para Chile. Permite a clientes residenciales y empresas estimar el ahorro, la Planta Fotovoltaica (PFV) recomendada y el retorno de inversión de un sistema solar, en base a sus boletas reales y región geográfica.

El flujo termina con una solicitud de contacto que deriva el lead a un especialista para visita técnica.

**Visión de largo plazo (desde sesión 4):** evolucionar hacia una plataforma completa de gestión comercial y energética con backoffice de configuración, cotizador online y CRM de leads.

---

## Estado actual

**Sesión 7: Cotizador operativo, importación masiva de productos desde Excel/CSV, y flujo lead → cotización implementado. Falta ejecutar SQL en Supabase y agregar JWT_SECRET.**

El wizard de 7 pasos está completamente funcional. Incluye: lectura OCR de boletas (múltiples archivos + Excel), captura de leads por email, lógica de 3 escenarios de PFV (residencial) + dimensionamiento continuo (empresa), baterías modulares (dropdowns 1–10 residencial, 1–100 empresa), toggle base/futuro en resultados, gráfico de líneas mensual, exportación de informe PDF (residencial y empresa), interpolación estacional de meses faltantes, aviso de sobredimensionamiento (Regla 2).

La landing page está completamente construida con identidad visual de marca. El simulador usa la paleta de colores de Mercado Energy (azules) en lugar de verdes.

**Desarrollos sesión 7 (24 abril 2026) — Cotizador + catálogo + flujo lead:**

- **Fix dropdown cotizador:** removido `overflow-hidden` del card de ítems (`QuoteEditor.tsx:402`) — era el ancestro que cortaba el dropdown por z-index. Dropdown ahora tiene `max-h-60 overflow-y-auto` + `z-[200]` para scroll y superposición correcta.
- **Fix ProductsManager:** div de cierre faltante para el contenedor `flex gap-4 items-start` — causaba estructura HTML inválida.
- **Ítem libre en cotizador:** toggle "Desde catálogo" / "Ítem libre" en `AddItemSection` (`QuoteEditor.tsx`). Modo libre muestra 6 botones de acceso rápido (Mano de obra, Despacho, Materiales varios, Ingeniería y proyecto, Puesta en marcha, Garantía extendida) + campo descripción editable + campo **Precio c/IVA directo** (sin costo+margen). Preview de subtotal en tiempo real.
- **Fix `upsertQuoteItem` (`app/admin/quotes/actions.ts`):** soporta campo `unit_price_direct` (precio final con IVA, se divide por 1.19 para obtener `unit_price_clp`). Fix de bug donde `margen_pct = 0` era tratado como 30 por el `|| 30` — corregido con chequeo explícito de string vacío.
- **Importación masiva de productos desde Excel/CSV:**
  - `app/admin/products/import/actions.ts` — Server Action `importProducts(rows[])`: upsert por SKU en lotes de 50. Si el SKU existe se actualiza; si es nuevo se inserta.
  - `components/admin/ProductImporter.tsx` — componente cliente: drag-and-drop o selección de archivo (`.xlsx`, `.xls`, `.csv`), detección automática de columnas (nombres en español e inglés), mapeo configurable de columnas, normalización de categorías y tipo de cliente, preview de primeros 8 productos, contador de productos válidos, botón de descarga de plantilla de ejemplo.
  - `app/admin/products/import/page.tsx` — página `/admin/products/import`.
  - `app/admin/products/page.tsx` — botón "↑ Importar desde Excel" en el header que lleva a la página de importación.
- **Flujo lead → cotización:**
  - `createQuoteFromLead(leadId)` en `app/admin/leads/actions.ts` — crea cotización pre-rellena con datos del lead (`client_name`, `client_email`, `client_phone`), setea `lead_id` en la cotización, actualiza status del lead a `'quoted'`, redirige al editor.
  - `LeadDetail.tsx` actualizado: botón **"+ Nueva cotización"** en el header del drawer (usa `useTransition` + server action). Sección **"Cotizaciones (N)"** muestra todas las cotizaciones vinculadas al lead con número, fecha, monto y estado — clickeables para abrir el editor.
  - `app/admin/leads/page.tsx` actualizado: fetch de cotizaciones agrupadas por `lead_id` (`quotesMap`), pasadas como prop `quotes` a cada `LeadDetail`. Indicador `"X cot."` en azul debajo del estado en la tabla de leads.

**Desarrollos sesión 5 (24 abril 2026) — Backoffice operativo + inicio Fase 2:**
- **Fix proxy.ts (Next.js 16):** `middleware.ts` renombrado a `proxy.ts` y función `middleware` → `proxy`. Era requerido por Next.js 16 (v16.0.0 breaking change); sin el cambio las rutas `/admin/*` devolvían 404.
- **SQL ejecutado en Supabase:** tablas `config_parameters` (15 parámetros) y `products` (14 kits) creadas con seed. Backoffice Fase 1 completamente operativo.
- **Formateo de valores en ConfigTable:** función `formatValue(key, value)` en `ConfigTable.tsx` — detecta claves `_clp` y aplica formato `$1.000.000` (Intl.NumberFormat es-CL). Otros valores usan separador de miles sin símbolo de moneda.
- **Inicio Fase 2 — Cotizador:** tablas `quotes` + `quote_items` creadas en Supabase con numeración automática `COT-YYYY-NNN` (trigger PostgreSQL). `@react-pdf/renderer` instalado. Tipos `Quote`, `QuoteItem`, `QuoteStatus` agregados a `lib/types.ts`. DB helper `lib/db/quotes.ts` con `getQuotes()`, `getQuote(id)`, `getQuoteByToken(token)`.

**Desarrollos sesión 4 (23 abril 2026) — Fase 1 Backoffice:**
- **Admin layout + sidebar:** `app/admin/layout.tsx` + `components/admin/AdminSidebar.tsx`. Sidebar con navegación a Leads / Productos / Configuración. Se muestra solo cuando hay sesión activa (no en login).
- **Backoffice de configuración (`/admin/config`):** tabla editable de parámetros del simulador agrupados por categoría (simulator, battery, business, regulatory). Edición inline con Enter/Escape. Server Action `updateConfigParam`. Tabla `config_parameters` en Supabase (15 parámetros).
- **Catálogo de productos (`/admin/products`):** CRUD completo (crear, editar, activar/desactivar, eliminar). Modal con specs dinámicos por categoría (solar_kit, battery). Tabla `products` en Supabase con 14 kits seed. Filtros por categoría.
- **Migración del simulador a Server Component:** `app/simulator/page.tsx` convertido a Server Component que inyecta `config` y `catalog` desde Supabase. Lógica de wizard extraída a `app/simulator/SimulatorClient.tsx`.
- **Config dinámica en el motor de cálculo:** `lib/types.ts` agrega `SimulatorConfig` y extiende `SimulatorInput` con overrides opcionales. `lib/calculations.ts` lee config del input con fallback a `constants.ts`. `buildBusinessKit()` acepta `opts` con parámetros configurables. Catálogo pasado como parámetro a `selectKits()` y `calcThreeScenarios()`.
- **DB helpers:** `lib/db/config.ts` y `lib/db/catalog.ts` — fetch server-side con fallback graceful a constants.ts si la DB no responde.
- **StepResults actualizado:** acepta `config?: SimulatorConfig` y `catalog?: SolarKit[]`. `buildBaseInput()` recibe config y propaga overrides al SimulatorInput.

**Desarrollos sesión 3 (23 abril 2026):**
- PDF empresa: se agregaron campos **Potencia contratada** (kW) y **Tensión de suministro** (BT/AT) en el bloque "Información eléctrica" del informe. Aparecen solo cuando `isBusiness === true`. Archivo modificado: `SimulationReportHtml.tsx` (bloque líneas ~320–335).

**Desarrollos sesión 2 (21 abril 2026):**
- Fix análisis tarifario: BT1 eliminada de lista de tarifas comparables para clientes en BT2/BT3 (instalaciones trifásicas no pueden bajar a BT1 sin cambio de infraestructura)
- Aviso de capacidad de empalme: nuevo bloque informativo en paso 7 cuando equipos futuros superan el 60% o 90% del empalme. Incluye amperajes de pico por tipo de equipo y sugiere empalmes adicionales de 40A. Mercado Energy puede gestionar la factibilidad con la distribuidora.
- Selector de tipo de cargador EV: Modo 2 (16A) o Wallbox (32A) en paso 6
- Selector de reserva de batería: 10%–50% configurable por el usuario en el bloque ámbar del paso 7 (residencial y empresa). Default 30%.
- Fix bug financiero batería: `batteryDischargeSavingsCLP` no se contabilizaba en el beneficio anual. Corregido: ahorro nocturno de batería ahora se suma correctamente. Nueva línea "Ahorro nocturno por batería" visible en el desglose financiero.
- UI paso 5: leyenda de colores permanente en el gráfico de barras (azul = mes mayor consumo, verde = datos reales, gris = interpolados)
- UI paso 7: botones de consumo actual/futuro y escenarios A/B/C rediseñados con borde y relleno explícito para mayor claridad visual. Estado inicial del toggle = "Consumo actual".

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.3 (App Router) |
| UI | React 19.2.4 + Tailwind CSS v4 |
| Lenguaje | TypeScript (strict) |
| Hosting | Vercel (deploy automático desde GitHub) |
| Email | Resend (`app/api/leads/route.ts`) |
| OCR | Claude Haiku 4.5 (`app/api/parse-bill/route.ts`) |
| PDF simulador | html2canvas + jsPDF (`PDFDownloadButton.tsx`) |
| PDF cotizaciones | `@react-pdf/renderer` server-side (Fase 2, pendiente) |
| BD | Supabase (leads + config_parameters + products) |
| Auth admin | Cookie `admin_token` vs `ADMIN_SECRET` + middleware |

**Nota importante:** Tailwind v4 usa `@import "tailwindcss"` en lugar de directivas `@tailwind`. No mezclar con la sintaxis de v3.

**Nota importante Vercel:** `new Resend(...)` y lectura de `process.env.ANTHROPIC_API_KEY` deben hacerse **dentro del handler** (no a nivel módulo), o el build de Vercel falla porque las variables no están disponibles en tiempo de evaluación del módulo.

---

## Arquitectura

```
mercado-energy/
├── app/
│   ├── layout.tsx                  # Metadata global, font Geist, lang="es"
│   ├── page.tsx                    # Landing page (10 secciones)
│   ├── icon.png                    # Favicon (logotipo-2.png — Next.js lo detecta automáticamente)
│   ├── simulator/
│   │   ├── page.tsx                # Server Component: fetch config+catalog → <SimulatorClient>
│   │   └── SimulatorClient.tsx     # 'use client': wizard completo, recibe config+catalog como props
│   ├── net-billing/
│   │   ├── page.tsx                # Página explicativa Net Billing
│   │   └── NetBillingClient.tsx    # Diagrama animado SVG con toggle día/noche
│   ├── terminos/page.tsx           # Términos y condiciones (Ley 19.496, 19.799, 21.719)
│   ├── privacidad/page.tsx         # Política de privacidad (Ley 21.719 completa, 7 derechos)
│   ├── devoluciones/page.tsx       # Política de devoluciones (Ley 19.496, 21.398, SERNAC)
│   ├── admin/
│   │   ├── layout.tsx              # Admin layout: sidebar + main (sin sidebar en login)
│   │   ├── login/page.tsx          # Login con ADMIN_SECRET
│   │   ├── leads/                  # CRM leads: tabla + filtros + drawer detalle + botón crear cotización
│   │   ├── config/                 # Parámetros del simulador (CRUD inline)
│   │   ├── products/               # Catálogo: CRUD + sidebar categorías + filtro stock
│   │   │   └── import/             # Importación masiva Excel/CSV (página + server action upsert por SKU)
│   │   └── quotes/                 # Cotizaciones: lista + editor + PDF
│   ├── lab/
│   │   └── bill-parser/page.tsx    # Laboratorio experimental de OCR
│   └── api/
│       ├── leads/route.ts          # POST: recibe lead, envía email via Resend
│       ├── contact/route.ts        # POST: formulario de contacto landing (Resend)
│       ├── parse-bill/route.ts     # POST: recibe imagen/PDF/Excel, devuelve JSON via Claude Haiku
│       └── send-report/route.ts    # POST: envía informe PDF por email al lead
│
├── components/
│   ├── landing/
│   │   ├── HeroSection.tsx         # Nav + video de fondo (video-poroma.mp4) + stats bar
│   │   ├── HowItWorks.tsx          # Cómo funciona el proceso
│   │   ├── ValueProposition.tsx    # Propuesta de valor
│   │   ├── SimulatorCTA.tsx        # CTA intermedio al simulador
│   │   ├── AboutUs.tsx             # Quiénes somos + equipo
│   │   ├── Solutions.tsx           # Soluciones residencial/empresa
│   │   ├── Brands.tsx              # Marcas de equipos
│   │   ├── Projects.tsx            # Grilla de proyectos ejecutados (9 proyectos)
│   │   ├── FinalCTA.tsx            # CTA final
│   │   ├── ContactSection.tsx      # Formulario de contacto (Persona natural / Empresa)
│   │   ├── Footer.tsx              # Footer con logotipo-2, mapa, pagos, legal
│   │   └── LegalLayout.tsx         # Layout compartido para páginas legales
│   ├── lab/
│   │   └── BillParser.tsx          # UI standalone del lab OCR
│   └── simulator/
│       ├── StepCustomerType.tsx    # Paso 1: Residencial / Empresa y grandes consumidores
│       ├── StepContact.tsx         # Paso 2: datos de contacto (región obligatoria)
│       ├── StepSupply.tsx          # Paso 3: propiedad, empalme (residencial) o potencia/tensión (empresa)
│       ├── StepBills.tsx           # Paso 4: ingreso de boletas + OCR + distribuidora/tarifa manual
│       ├── BillOCRUpload.tsx       # Sub-componente: upload múltiple (JPG/PNG/PDF/Excel)
│       ├── StepBillReview.tsx      # Paso 5: revisión visual (gráfico 12 meses)
│       ├── StepFutureConsumption.tsx # Paso 6: AA, termo, auto eléctrico
│       ├── StepResults.tsx         # Paso 7: escenarios, baterías, CTA, PDF
│       ├── PDFDownloadButton.tsx   # Botón + modal de informe (html2canvas + jsPDF)
│       ├── SimulationReportHtml.tsx # HTML del informe para captura
│       └── SimulatorResults.tsx    # Componente legacy
│   ├── admin/
│   │   ├── AdminSidebar.tsx        # 'use client': nav lateral con usePathname (active state)
│   │   ├── ConfigTable.tsx         # 'use client': tabla editable de config_parameters
│   │   ├── ProductsManager.tsx     # 'use client': tabla + modal CRUD + filtros categoría/stock
│   │   ├── ProductImporter.tsx     # 'use client': importación masiva Excel/CSV con mapeo de columnas
│   │   ├── QuoteEditor.tsx         # 'use client': editor de cotización con ítems catálogo/libre
│   │   ├── LeadsFilter.tsx         # 'use client': filtros tipo/región + toggle "⚠ Seguimiento pendiente"
│   │   ├── LeadsKanban.tsx         # 'use client': vista Kanban con drag & drop entre columnas de estado
│   │   ├── ClientsManager.tsx      # 'use client': lista clientes con búsqueda + modal crear
│   │   ├── ClientDetail.tsx        # 'use client': detalle cliente (tabs info/instalaciones/actividades/cotizaciones/proyectos)
│   │   └── UserFilter.tsx          # 'use client': filtro de usuario en dashboard
│   └── ui/
│       └── ProgressBar.tsx         # Barra de progreso de 7 pasos (colores de marca)
│
└── lib/
    ├── types.ts                    # Interfaces TypeScript (incluye SimulatorConfig, SimulatorInput extendido)
    ├── constants.ts                # Valores por defecto (fallback cuando DB no responde)
    ├── regions.ts                  # 16 regiones de Chile con producción mensual kWh/kWp
    ├── calculations.ts             # Motor: runSimulation, calcThreeScenarios, selectKits, buildBusinessKit
    ├── consumption.ts              # Cálculos de consumo futuro (AA, termo, EV, calcEmpalmeLoad)
    ├── tariffAnalysis.ts           # runTariffAnalysis(): comparación de tarifas BT/AT, alternativas y ahorro
    ├── format.ts                   # Formateo de valores (CLP, kWh, %, payback)
    └── db/
        ├── config.ts               # getSimConfig(): fetch DB → SimulatorConfig (fallback a constants)
        ├── catalog.ts              # getResidentialCatalog(): fetch DB → SolarKit[] (fallback a KIT_CATALOG)
        └── quotes.ts               # getQuotes(), getQuote(id), getQuoteByToken(token)
```

---

## Wizard — 7 pasos

### Paso 1 — Tipo de cliente (`StepCustomerType`)
- Selección: **Residencial** (casa/departamento) o **Empresa** (oficina/colegio/otro)
- El valor interno sigue siendo `'natural' | 'business'` en `CustomerCategory`
- Avance automático al seleccionar

### Paso 2 — Contacto (`StepContact`)
- **Residencial:** nombre, email, teléfono, dirección, ciudad, comuna, región
- **Empresa:** razón social, contacto, email, teléfono, dirección, ciudad, comuna, región
- Región **obligatoria** — determina la producción solar en la simulación

### Paso 3 — Suministro (`StepSupply`)
- Tipo de propiedad (filtrado por categoría de cliente)
- **Residencial:** amperaje del empalme (obligatorio) — botones 10 / 15 / 20 / 25 / 32 / 40 / 50 / 63 A
  - Limita el tamaño máximo de la PFV (`empalmeMaxKW = amperajeA × 220 / 1000`)
  - SVG ilustrativo de referencia para ubicar el número en el tablero eléctrico
- **Empresa:** dos campos obligatorios:
  1. **Potencia contratada (kW)** — presets 10, 20, 30, 50, 75, 100, 150, 200, 300 kW + campo libre
     - Se usa directamente como `empalmeMaxKW` para limitar el dimensionamiento de la PFV
  2. **Tensión de suministro (BT / AT)** — determina el régimen tarifario aplicable
     - BT: Baja Tensión < 1 kV → tarifas BT1–BT4
     - AT: Alta Tensión ≥ 1 kV → tarifas AT2–AT4, transformador propio
- Toggle: ¿Ya tiene paneles solares? (+ campo kWp si aplica)
- **Distribuidora y tarifa NO se piden aquí** — se extraen de la boleta en el paso 4

### Paso 4 — Boletas (`StepBills`)
- Tabla con los últimos 12 meses generados dinámicamente
- Por mes: consumo en **kWh** (requerido) + monto variable CLP (opcional)
- **OCR integrado:** botón "Subir boleta para autocompletar" usando `BillOCRUpload`
  - Soporta JPG, PNG, PDF
  - **Múltiples archivos a la vez** — procesamiento secuencial, merge por mes-año
  - Claude Haiku extrae datos; el usuario revisa y confirma antes de aplicar
  - Al confirmar, pre-rellena la tabla y propaga distribuidora/tarifa al wizard
  - Para duplicados de mes: se prefiere el registro con `variableAmountCLP` informado
  - Mock mode cuando no hay `ANTHROPIC_API_KEY`
- **Ingreso manual:** campos opcionales de distribuidora y tarifa al ingresar el primer mes
- **Interpolación estacional:** meses sin dato se estiman promediando ±2 vecinos del calendario. Requiere ≥2 meses reales
- Requiere al menos 1 mes para continuar

### Paso 5 — Revisión de boletas (`StepBillReview`)
- Estadísticas: promedio, máximo, mínimo, completitud (X/12)
- **Gráfico de barras CSS con los 12 meses — leyenda permanente de 3 colores:**
  - Azul (`#389fe0`): mes de mayor consumo
  - Verde: meses con datos reales
  - Gris: meses estimados por interpolación estacional
  - kWh mostrado encima de **todas** las barras (máxima en bold)
- Tabla detallada: mes, kWh, monto CLP, $/kWh calculado
- Avisos contextuales: precio promedio calculado, meses faltantes

### Paso 6 — Consumos futuros (`StepFutureConsumption`)
- **Aire acondicionado:** steppers por tamaño BTU (9.000 / 12.000 / 18.000)
- **Termo eléctrico:** steppers de ocupantes → calcula capacidad y kWh/mes
- **Auto eléctrico:** cantidad de autos + **tipo de cargador** (Modo 2 cable portable 16A / Wallbox 32A)
- Resumen en vivo: consumo actual vs. proyectado
- **Las baterías ya NO se seleccionan aquí** — se configuran en el paso 7 (Escenario C)

### Paso 7 — Resultados (`StepResults`)
- **Toggle consumo actual / con equipos nuevos** (cuando hay adiciones en paso 6)
  - Recalcula los escenarios con el kWh correspondiente a cada modo
  - Funciona tanto para residencial como empresa
- **3 escenarios de PFV** (solo residencial — ver sección de lógica)
- KPIs, PFV recomendada, desglose financiero (con VAN y payback descontado), tabla de balance mensual
- **Gráfico de líneas SVG** debajo de la tabla: producción, autoconsumo, inyección, red (12 meses)
- **Avisos regulatorios empresa:**
  - Si la PFV óptima supera 300 kW: aviso sobre límite net billing Art. 149 bis DFL 4
  - Siempre: aviso de tratamiento tributario (Art. 149 quinquies DFL 4)
- **Recomendación de tarifa:**
  - `unknown` → pedir que confirme tarifa en boleta
  - `BT4.x` / `AT` → recomendar batería para gestión de horas de punta
- **Análisis EV:** recomendación día/noche/mixto calculada con el balance energético real
- Impacto ambiental: CO₂ evitado y equivalencia en árboles
- **CTA:** "Coordina una reunión con nuestro equipo técnico" → POST `/api/leads` → email via Resend
- **Exportar informe:** disponible para residencial Y empresa. Modal con preview y descarga PDF

---

## Nomenclatura

| Anterior | Actual |
|---|---|
| Persona natural | Residencial |
| Kit solar / Kit X kWp | PFV X kW (Planta Fotovoltaica) |
| kit-Xkwp | pfv-Xkw (IDs en catálogo) |

El tipo interno `CustomerCategory = 'natural' | 'business'` no cambia — solo cambia la etiqueta en la UI.

---

## Lógica de PFV residencial — 3 escenarios

### Principio fundamental
Siempre se recomienda la PFV de **mayor tamaño que cabe dentro del límite del empalme**. Este es el escenario base (A). Nunca se sub-dimensiona por defecto.

### Cálculo del límite de empalme
```
Residencial:  empalmeMaxKW = amperajeA × 220 / 1000
Empresa:      empalmeMaxKW = potenciaContratadaKW  (directo en kW, sin conversión)
```

### Función `selectKits(empalmeMaxKW)` en `lib/calculations.ts`
- **kitA:** PFV más grande cuyo `sizekWp ≤ empalmeMaxKW`. Es siempre la recomendada principal.
- **kitB:** PFV inmediatamente inferior a kitA en el catálogo (opción económica). Es `null` si kitA ya es la más pequeña.

### Escenario A — PFV máxima, sin batería
- Label en UI: "Recomendado"

### Escenario B — PFV menor, sin batería
- Un escalón abajo de kitA
- Label en UI: "Opción económica"
- Solo se muestra si `kitB !== null`

### Escenario C — PFV máxima con baterías
- Misma PFV que escenario A
- Batería: `N × 5 kWh` donde N ∈ {1, 2, 3, 4, 5, 6} — selector en la UI
- Precio: `pfv.priceReferenceCLP + N × 1.500.000 CLP`
- Label en UI: "Con baterías"

---

## Lógica de baterías

### Parámetros clave (en `lib/constants.ts`)
```typescript
SOLAR_DEFAULTS.batteryUsableFraction        = 0.70  // default 70% disponible (reserva 30%)
SOLAR_DEFAULTS.batteryModuleKWh             = 5     // kWh por módulo de batería
SOLAR_DEFAULTS.batteryModulePriceCLP        = 1_500_000  // CLP por módulo
SOLAR_DEFAULTS.batteryDailyCycleEfficiency  = 0.80  // eficiencia ida+vuelta del ciclo
```

**Reserva configurable por el usuario (sesión 2):** el usuario puede elegir entre 10%–50% en el paso 7. El valor se pasa como `batteryUsableFraction` en `SimulatorInput` y sobreescribe el default. A mayor reserva = menos kWh usables en la noche; a menor reserva = más kWh aprovechados pero menos respaldo ante cortes.

### Modelo de carga y descarga (por mes en `calcMonthlyBalance`)
```
// batteryUsableFraction viene de SimulatorInput (configurable, default 0.70)
capacidad_usable_diaria  = batteryCapacityKWh × batteryUsableFraction
reserva_emergencia       = batteryCapacityKWh × (1 - batteryUsableFraction)

máx_carga_mensual  = (capacidad_usable_diaria / eficiencia) × días_del_mes
máx_descarga_mensual = capacidad_usable_diaria × eficiencia × días_del_mes

carga_batería   = min(excedente_solar, máx_carga_mensual)
descarga_batería = min(
  carga_batería × eficiencia,
  máx_descarga_mensual,
  consumo_nocturno
)
```

### Beneficio mensual — fórmula corregida (sesión 2)
```
totalMonthlyBenefitCLP = selfConsumptionSavingsCLP     // ahorro diurno (autoconsumo × kWhPrice)
                       + injectionIncomeCLP             // inyección × (kWhPrice × 0.5)
                       + batteryDischargeSavingsCLP     // descarga nocturna × kWhPrice (antes faltaba → bug)
```
Bug anterior: el ahorro nocturno de la batería no se contabilizaba, lo que hacía que menor reserva apareciera con *peor* payback aunque económicamente fuera mejor.

---

## Motor de simulación

### Función principal `runSimulation(input, kit, batteryCapacityKWh, systemCostOverride?)`
Corre la simulación completa para una PFV y capacidad de batería dados. Retorna `SimulatorResult` con balance energético mensual (12 meses), KPIs financieros e impacto ambiental.

### Modelo energético mensual
```
producción_mensual = kit.sizekWp × región.productionKWhPerKWp[mes]

consumo_diurno  = consumoMensual × 0.70   ← FIJO, no cambiar
consumo_nocturno = consumoMensual × 0.30  ← FIJO, no cambiar
```

**IMPORTANTE:** `dayConsumptionRatio = 0.70` es un parámetro fijo de negocio. No debe calcularse dinámicamente desde datos de amanecer/atardecer. Es una simplificación deliberada para tener un modelo predecible y auditable.

### Empresas (`runBusinessSimulation`)
- No usa catálogo — dimensionamiento continuo con `buildBusinessKit()`
- Objetivo: cubrir el 90% del consumo anual (`businessCoverageTarget = 0.90`)
- Capped por `empalmeMaxKW` (potencia contratada) y por 300 kW (Art. 149 bis DFL 4)
- Si la PFV óptima supera 300 kW → `exceedsNetBillingLimit = true` (aviso en UI)
- Precio: `$1.000.000/kWp`
- No tiene escenarios A/B/C ni selector de baterías
- Sí tiene informe PDF (escenario único)

### Cálculo financiero (DFL 4)
```typescript
// Payback simple
paybackYears = systemCostCLP / annualBenefitCLP

// VAN a 25 años con tasa 10% real (Arts. 165d / 182 bis DFL 4)
annuityFactor = (1 - (1 + 0.10)^-25) / 0.10  ≈ 9.077
vanCLP = annualBenefit × annuityFactor - systemCostCLP

// Payback descontado (tasa 10% real)
t = -ln(1 - 0.10 × Cost/AnnualBenefit) / ln(1.10)
// Si arg ≤ 0 → Infinity → "No recupera" en la UI
```

### Precio del kWh
1. Promedio de `variableAmountCLP / consumptionKWh` de las boletas ingresadas
2. Si no hay boletas con monto: precio referencial **220 CLP/kWh**

### Net billing (inyección a la red)
Valor de inyección = **50%** del precio de compra del kWh (norma vigente CNE, Art. 149 bis DFL 4).

---

## Marco regulatorio — DFL 4 (Ley General de Servicios Eléctricos Chile)

Leída completa (3.666 líneas). Artículos relevantes implementados:

| Artículo | Descripción | Implementación |
|---|---|---|
| Art. 149 bis | Net billing: derecho a inyectar; máx 300 kW por inmueble | `DFL4.netBillingMaxKWp = 300` — caps `buildBusinessKit()` |
| Art. 149 ter | Excedentes transferibles a otras propiedades del mismo dueño | Nota informativa (no afecta cálculo) |
| Art. 149 quinquies | Exención tributaria: ahorro y pagos NO son renta para personas naturales y empresas en régimen simplificado. Empresas Primera Categoría SÍ tributan sobre pagos por excedentes | Banner informativo en resultados empresa |
| Arts. 165d / 182 bis | Tasa de descuento 10% real anual para proyectos eléctricos | `DFL4.discountRateReal = 0.10` — usado en VAN y payback descontado |
| Art. 225 l) | "Potencia conectada": potencia máxima dada la capacidad del empalme | Campo `potenciaContratadaKW` en `SupplyData` para empresas |

### Constante `DFL4` en `lib/constants.ts`
```typescript
export const DFL4 = {
  netBillingMaxKWp: 300,     // Art. 149 bis
  discountRateReal: 0.10,    // Arts. 165d / 182 bis
};
```

### Tratamiento tributario empresas (Art. 149 quinquies)
- **Personas naturales:** ahorro y pagos de excedentes = libre de impuesto
- **Empresas régimen simplificado (14 ter):** igual que personas naturales
- **Empresas Primera Categoría con contabilidad completa:** pagos por excedentes SÍ son renta gravable. El ahorro por autoconsumo no (reduce costos operacionales).
- Nota: se muestra siempre en resultados empresa como aviso

---

## Catálogo PFV Residencial

### Sin batería
| ID | kWp | Paneles | Área | Precio ref. |
|---|---|---|---|---|
| pfv-1.1kw  | 1.1  | 2  | 5 m²  | $1.320.000 |
| pfv-2.2kw  | 2.2  | 4  | 10 m² | $2.640.000 |
| pfv-3.3kw  | 3.3  | 6  | 15 m² | $3.960.000 |
| pfv-5.5kw  | 5.5  | 10 | 25 m² | $6.600.000 |
| pfv-6.6kw  | 6.6  | 12 | 30 m² | $7.920.000 |
| pfv-8.8kw  | 8.8  | 16 | 40 m² | $10.560.000 |
| pfv-10kw   | 10   | 18 | 45 m² | $12.000.000 |
| pfv-11kw   | 11   | 20 | 50 m² | $13.200.000 |
| pfv-13.9kw | 13.9 | 26 | 65 m² | $16.680.000 |

### Con batería
| ID | kWp | Batería | Precio ref. |
|---|---|---|---|
| pfv-2.2kw-battery  | 2.2 | 5 kWh  | $4.140.000 |
| pfv-3.3kw-battery  | 3.3 | 5 kWh  | $5.460.000 |
| pfv-5.5kw-battery  | 5.5 | 10 kWh | $9.600.000 |
| pfv-8.8kw-battery  | 8.8 | 10 kWh | $13.560.000 |
| pfv-11kw-battery   | 11  | 15 kWh | $17.700.000 |

**Panel estándar:** 550 Wp, 2,5 m² · **Precio base:** ~$1.200.000/kWp
**Módulo de batería (escenario C):** 5 kWh, $1.500.000 CLP (hasta 6 módulos = 30 kWh)

### Empresas — Dimensionamiento continuo
- Rango: desde ~1 kWp hasta 300 kWp (límite net billing DFL 4)
- Precio: $1.000.000/kWp
- Para sistemas > 300 kW: se requiere otro marco regulatorio (PMGD/PMG)

---

## Regiones de Chile

16 regiones con producción solar mensual (kWh/kWp) calibrada con eficiencia del sistema:

| Zona | Regiones | Producción anual (kWh/kWp) |
|---|---|---|
| Norte | Arica, Tarapacá, Antofagasta, Atacama, Coquimbo | 1.750 – 2.090 |
| Central | Valparaíso, RM, O'Higgins, Maule, Ñuble, Biobío | 1.343 – 1.576 |
| Sur | Araucanía, Los Ríos, Los Lagos | 1.050 – 1.210 |
| Austral | Aysén, Magallanes | 745 – 890 |

---

## Parámetros clave (todos en `lib/constants.ts`)

```typescript
CHILE_BT1.referenceKWhPriceCLP          = 220         // CLP/kWh referencial
CHILE_BT1.fixedChargeCLP                = 1_200       // cargo fijo mensual

DFL4.netBillingMaxKWp                   = 300         // Art. 149 bis DFL 4
DFL4.discountRateReal                   = 0.10        // Arts. 165d / 182 bis DFL 4

SOLAR_DEFAULTS.injectionValueFactor     = 0.50        // net billing 50%
SOLAR_DEFAULTS.dayConsumptionRatio      = 0.70        // 70% consumo diurno — NO CAMBIAR
SOLAR_DEFAULTS.nightConsumptionRatio    = 0.30        // 30% consumo nocturno — NO CAMBIAR
SOLAR_DEFAULTS.systemLifeYears          = 25          // vida útil sistema
SOLAR_DEFAULTS.panelWattage             = 550         // W por panel residencial
SOLAR_DEFAULTS.panelAreaM2              = 2.5         // m² por panel

SOLAR_DEFAULTS.batteryUsableFraction    = 0.70        // 70% usable para descarga nocturna
SOLAR_DEFAULTS.batteryModuleKWh         = 5           // kWh por módulo de batería
SOLAR_DEFAULTS.batteryModulePriceCLP    = 1_500_000   // precio por módulo
SOLAR_DEFAULTS.batteryDailyCycleEfficiency = 0.80     // eficiencia ida+vuelta

SOLAR_DEFAULTS.evConsumptionIncreasePerCar  = 0.33    // +33% por auto eléctrico
SOLAR_DEFAULTS.businessCoverageTarget       = 0.90    // cobertura objetivo empresas

BUSINESS_DEFAULTS.costPerKWpCLP         = 1_000_000  // precio empresa por kWp
```

---

## Exportación de PDF

Implementado con **html2canvas + jsPDF** (compatible con React 19).

- Componente: `SimulationReportHtml.tsx` — HTML puro con estilos inline para captura
- Botón: `PDFDownloadButton.tsx` — captura con html2canvas, genera PDF con jsPDF, con caché
- Modal con preview del informe antes de descargar
- Al abrir el modal: envía el informe por email al lead automáticamente (una sola vez)
- Disponible para **residencial y empresa**

### Contenido del informe residencial
- Header verde: nombre, región, tarifa, fecha
- Datos del cliente (identificación + ubicación + datos eléctricos)
- Gráfico de consumo mensual (barras SVG)
- PFV recomendada: tamaño, paneles, área, precio, batería si aplica
- 4 KPIs: cobertura, ahorro mensual, ahorro anual, período de retorno
- Texto explicativo generado
- Gráfico de generación mensual proyectada (línea SVG)
- Desglose financiero: autoconsumo, inyección, total anual, ROI
- **Sección de comparación A/B/C** con los 3 escenarios
- Impacto ambiental y nota metodológica

### Contenido del informe empresa
- Igual que residencial, pero **sin sección de comparación A/B/C**
- Header dice "Sistema dimensionado · PFV X kW" en lugar de escenario recomendado
- Tipo de cliente: "Empresa"

### Props de `PDFDownloadButton`
```typescript
interface Props {
  state: WizardState;
  scenarios?: KitScenarios;       // residencial
  recommendedScenario?: 'A'|'B'|'C'; // residencial
  businessResult?: SimulatorResult;  // empresa
  clientName: string;
  clientEmail: string;
}
```

---

## Captura de leads

**Funcionando.** Al hacer clic en el CTA:
- `StepResults` hace POST a `/api/leads` con todos los datos del lead y simulación activa
- El payload incluye `supply_details` con `amperajeA` (residencial) o `potenciaContratadaKW` + `tensionSuministro` (empresa)
- Resend envía email HTML al operador con `replyTo` del lead
- `from: 'Mercado Energy <onboarding@resend.dev>'`
- Variables de entorno necesarias: `RESEND_API_KEY`, `LEAD_RECIPIENT_EMAIL`

---

## OCR de boletas

**Funcionando end-to-end en producción.**

```
Usuario sube 1 o más archivos (JPG/PNG/PDF)
  → BillOCRUpload procesa secuencialmente
  → POST /api/parse-bill por cada archivo
    → Claude Haiku (claude-haiku-4-5-20251001) lee la boleta
    → Retorna JSON: distribuidora, tarifa, períodos con kWh y montos
  → Se mergean períodos de todos los archivos (prioridad: el que tiene variableAmountCLP)
  → Usuario revisa tabla editable y confirma
    → Se rellenan los meses en la tabla del paso 4
    → distribuidora y tarifa se propagan al WizardState
```

**Reglas del prompt OCR:**
- Períodos que cruzan meses (ej: 17 jul → 18 ago) → mes de **término** (agosto)
- Montos en CLP como enteros (sin puntos de miles)
- Incluye historial completo visible en la boleta
- Header `anthropic-beta: pdfs-2024-09-25` solo se envía para archivos PDF (no para imágenes)

**Mock mode:** cuando no hay `ANTHROPIC_API_KEY`, retorna datos simulados con patrón estacional realista.

---

## Decisiones de diseño clave

### PFV siempre al máximo del empalme
Se recomienda la PFV más grande posible dentro del límite físico del empalme. Nunca se sub-dimensiona por defecto.

### Empresas usan potencia contratada, no amperaje
Para empresas, el límite del empalme es la **potencia contratada en kW** (campo `potenciaContratadaKW`), capturada directamente sin conversión. El amperaje se muestra solo para residencial (monofásico 220 V).

### `dayConsumptionRatio` fijo en 0.70
Parámetro de negocio fijo y deliberado — **no debe calcularse dinámicamente** desde datos de amanecer/atardecer. Simplificación que hace el modelo predecible y auditable.

### Baterías: 70% uso / 30% reserva
El 30% se reserva para cortes de luz. Controlado con `batteryUsableFraction = 0.70`.

### Tarifa `'unknown'`
Se guarda sin resolver en `SupplyData.tarifa`. Solo se resuelve a `'BT1'` dentro del motor de cálculo en `buildBaseInput`. Permite mostrar avisos diferenciados en resultados.

### Distribuidora y tarifa — captura diferida al paso 4
Se capturan automáticamente si el usuario sube una boleta (OCR), o manualmente en el paso 4. Se propagan al `WizardState` mediante `onUpdateSupply`.

### VAN usa tasa 10% real (DFL 4)
La tasa del 10% real anual es la tasa de actualización referencial del sector eléctrico chileno (Arts. 165d y 182 bis DFL 4). Se usa para calcular el VAN a 25 años y el payback descontado. Un VAN positivo significa que el proyecto crea valor por encima de esta tasa de referencia.

### Protección de entregables
`select-none` + `onCopy preventDefault` en `StepBillReview` y `StepResults`.

---

## Landing page

### Estructura (10 secciones en `app/page.tsx`)
1. `HeroSection` — nav, video de fondo (`/videos/video-poroma.mp4`), headline, CTA, stats bar
2. `HowItWorks` — proceso en 3 pasos
3. `ValueProposition` — beneficios clave
4. `SimulatorCTA` — CTA intermedio
5. `AboutUs` — equipo e historia
6. `Solutions` — residencial vs empresa
7. `Brands` — marcas de equipos
8. `Projects` — 9 proyectos ejecutados con imagen y tags
9. `FinalCTA` — CTA final
10. `ContactSection` — formulario (Persona natural / Empresa + nombre de contacto)
11. `Footer` — logotipo-2, mapa Google, pagos, navegación, legal

### Proyectos en la grilla
| Proyecto | Imagen |
|---|---|
| Poroma, Tarapacá | `/images/poroma-img.jpg` |
| Panadería San Bernardo | `/images/panaderia-san-bernardo.jpg` |
| Casa Carlos Alvarado, Las Condes | `/images/casa-carlos-alvarado.jpg` |
| Coscaya, Huara | `/images/proyecto-coscaya.jpg` |
| Caleta Los Bronces, Atacama | `/images/proyecto-caleta-los-bronces.jpg` |
| Universidad de Talca | `/images/proyecto-talca.jpg` |
| Río Ibáñez, Aysén | `/images/proyecto-rio-ibanez.jpg` |
| Lonquimay, Araucanía | `/images/proyecto-lonquimay.jpg` |
| Puerto Carmen, Quellón | `/images/proyecto-quellon.jpg` |

### Formulario de contacto (`/api/contact`)
- Campos Persona natural: nombre, email, teléfono, mensaje
- Campos Empresa: empresa/razón social, nombre de contacto, teléfono, email, mensaje
- Envío via Resend al operador

### Paleta de colores de marca
```
#389fe0  — azul primario (CTAs, acentos, barras de progreso)
#1d65c5  — azul oscuro (hover, fondos de sección)
#ade1ed  — azul claro (badges, textos secundarios en oscuro)
#70caca  — teal (decorativo)
#b0cedd  — gris azulado (bordes, fondos suaves)
#dde3e9  — gris claro (fondos, backgrounds)
#010101  — casi negro (nav, footer, textos principales)
#ffffff  — blanco
```

### Identidad visual del simulador
- Nav con fondo `#b0cedd` y logo `logotipo.png`
- Fondo general `#f4f8fb`
- Todos los colores verdes reemplazados por azules de marca
- ProgressBar en `#389fe0` / `#1d65c5`
- Favicon: `app/icon.png` (logotipo-2.png)

---

## Páginas públicas adicionales

| Ruta | Descripción |
|---|---|
| `/net-billing` | Explicación del Net Billing con diagrama SVG animado (toggle día/noche) y marco regulatorio |
| `/terminos` | Términos y condiciones (Ley 19.496, 19.799, 21.719, 17.336) — incluye sección de condiciones del simulador |
| `/privacidad` | Política de privacidad (Ley 21.719 completa: 7 derechos, bases legales, Agencia de Datos) |
| `/devoluciones` | Política de devoluciones (Ley 19.496, 21.398, 21.521, SERNAC, plazos legales) |

---

## Advertencias conocidas

- Sin advertencias activas.

---

## Pendientes y próximos pasos

### ✅ Completado en sesión 9 (26 abril 2026)

- [x] **Asignar vendedor a lead** — campo `assigned_to UUID` en tabla `leads`. Dropdown "Vendedor:" en header de LeadCRM (se guarda automáticamente al cambiar). Nombre del vendedor visible en la lista de leads (columna Cliente, en azul) y en tarjetas Kanban (badge azul)
- [x] **Vista Kanban de leads** — `components/admin/LeadsKanban.tsx`. 5 columnas (Nuevo/Contactado/Cotizado/Ganado/Perdido). Drag & drop con HTML5 DnD — `moveLeadToStatus()` server action actualiza estado y registra historial. Toggle "≡ Lista / ⊞ Kanban" en filtros de `/admin/leads`. Tarjetas muestran vendedor, follow_up_date y ahorro/mes
- [x] **Recordatorios de seguimiento** — campo `follow_up_date DATE` en tabla `leads`. Selector de fecha "Próximo contacto:" en header de LeadCRM. `min` = hoy (bloquea fechas pasadas). Badge rojo si vencido / ámbar si futuro en lista y Kanban. Filtro "⚠ Seguimiento pendiente" en leads (toggle activo = filter `follow_up_date <= hoy AND status != won/lost`)
- [x] **Dashboard seguimientos pendientes** — sección ámbar en `/admin` entre KPIs y grilla. Aparece solo cuando hay leads con `follow_up_date <= hoy`. Grilla de hasta 8 leads con fecha destacada (rojo si pasada, ámbar si hoy). Enlace "Ver todos →" a la lista filtrada. Respeta filtro de usuario activo
- [x] **SQL ejecutado** — `supabase/leads_followup.sql` con ambas columnas nuevas en `leads`

### ✅ Completado en sesión 8 (25 abril 2026)

- [x] **Fase 3 CRM — Detalle de lead** — `app/admin/leads/[id]/page.tsx` + `LeadCRM.tsx`: 4 tabs (simulación, cotizaciones, notas, historial). Header con selector de estado, banner verde "Venta cerrada" cuando status=`won`
- [x] **Notas de lead** — tabla `lead_notes` (SQL: `supabase/lead_crm.sql`). Formulario con tipo (nota/llamada/email/visita/reunión/otro) + textarea. Timeline con iconos. Actualización optimista
- [x] **Historial de estado** — tabla `lead_status_history`. Se registra automáticamente cada cambio de estado. Tab "Historial" muestra from→to con timestamps
- [x] **"Convertir a cliente"** — botón aparece solo cuando `lead.status === 'won'`. Si ya tiene cliente muestra "Ver cliente →". Fix NOT NULL en `clients.nombre` con fallback `name ?? contact_name ?? email`
- [x] **Cotización desde simulación** — botón "⚡ Crear desde simulación" en tab cotizaciones del lead. Lee `scenarios_json.A` o fallback `kit_size_kwp`/`kit_price_clp`. Pre-carga `quote_items` con margen 30%
- [x] **Auto-sync lead status desde cotización** — `updateQuoteStatus` en `quotes/actions.ts`: cuando cotización se acepta → lead pasa a `won`; cuando se rechaza → lead pasa a `lost`. Registra en `lead_status_history`
- [x] **Módulo de proyectos** — flujo completo: `app/admin/projects/` (lista + detalle). SQL: `supabase/projects.sql` (tablas `project_items` y `project_costs`)
- [x] **Proyecto desde cotización** — botón "🏗️ Crear proyecto" en QuoteEditor cuando `status === 'accepted'`. Copia ítems de la cotización a `project_items`. Resuelve `client_id` desde lead si no está en cotización directamente
- [x] **Protección duplicados de proyecto** — 1 cotización = 1 proyecto. Si ya existe, botón cambia a "🏗️ Ver proyecto →". Server action redirige al existente sin crear nuevo
- [x] **ProjectDetail** — KPIs financieros (ingresos, costo base, costos adicionales, utilidad bruta, margen). 4 tabs: Resumen (form editable), Ítems (tabla editable inline), Costos adicionales (agregar/eliminar), Cotización original (read-only)
- [x] **Tab Proyectos en ClientDetail** — `getProjectsByClient()` en `lib/db/projects.ts`. Lista de proyectos con nombre, número de cotización, fecha inicio y badge de estado
- [x] **AdminSidebar** — "🏗️ Proyectos" agregado a sección CRM
- [x] **Labels de estados de cotización** — "Marcar enviada/aceptada" → "Enviada" / "Aceptada" / "Rechazada"

### ✅ Completado en sesión 7

- [x] **Fix dropdown cotizador** — removido `overflow-hidden` del card padre; dropdown ahora tiene scroll (`max-h-60 overflow-y-auto`) y flota sobre todo (`z-[200]`)
- [x] **Ítem libre en cotizador** — toggle "Desde catálogo" / "Ítem libre" con 6 botones de acceso rápido y campo de precio directo con IVA. Action `upsertQuoteItem` soporta `unit_price_direct` y fix de `margen=0`
- [x] **Importación masiva Excel/CSV** — `ProductImporter.tsx` con drag-drop, detección automática de columnas, mapeo configurable, preview, upsert por SKU. Plantilla descargable. Página `/admin/products/import`
- [x] **Flujo lead → cotización** — botón "+ Nueva cotización" en drawer del lead crea cotización pre-rellena, actualiza status a `quoted` y redirige al editor. Sección de cotizaciones existentes en el drawer con links directos. Indicador de cantidad de cotizaciones en la tabla de leads

### ✅ Completado en sesión 6

- [x] **Auth multi-usuario** — JWT con `jose` + bcrypt. `proxy.ts`, `login/route.ts` y `login/page.tsx` actualizados
- [x] **SQL migration_fase2.sql** — tablas `users`, `clients`, `installations`, `client_contacts`, `activities`, `projects` + ALTER `leads`, `products`, `quotes`, `quote_items`
- [x] **lib/types.ts** — nuevos tipos: `AdminUser`, `Client`, `Installation`, `ClientContact`, `Activity`, `Project`. `Quote` y `QuoteItem` extendidos
- [x] **DB helpers** — `lib/db/users.ts`, `lib/db/clients.ts`, `lib/db/quotes.ts` actualizado
- [x] **AdminSidebar** — secciones CRM (Leads, Clientes, Cotizaciones), Configuración, Sistema (Usuarios solo para admin). Muestra nombre y rol del usuario
- [x] **Módulo usuarios `/admin/users`** — CRUD completo, cambio de contraseña, protección del último admin
- [x] **Módulo clientes `/admin/clients`** — lista con búsqueda, detalle con tabs (info, instalaciones, actividades, cotizaciones), crear/editar, agregar instalaciones y actividades
- [x] **Conversión lead → cliente** — `convertLeadToClient()` crea cliente + primera instalación desde datos del lead
- [x] **Módulo cotizaciones `/admin/quotes`** — lista con filtros, editor completo con tabla de ítems (columnas internas de margen vs columnas de cliente), totales en tiempo real, gestión de estados
- [x] **PDF cotización** — `lib/pdf/QuotePDF.tsx` con `@react-pdf/renderer` server-side. Route `/api/admin/quotes/[id]/pdf`
- [x] **Productos actualizados** — nuevos campos `stock`, `costo_proveedor_clp`, `margen_pct` en tabla y modal

### ✅ Completado en sesión 5

- [x] **Fix proxy.ts** — `middleware.ts` → `proxy.ts`, función `middleware` → `proxy` (Next.js 16)
- [x] **SQL ejecutado** — tablas `config_parameters` y `products` operativas en Supabase
- [x] **Backoffice Fase 1 operativo** — `/admin/config` y `/admin/products` funcionando con datos reales
- [x] **Formateo CLP en ConfigTable** — `$` y separador de miles para parámetros `_clp`
- [x] **Tablas Fase 2 creadas** — `quotes` + `quote_items` en Supabase con autonumeración
- [x] **`@react-pdf/renderer` instalado**
- [x] **Tipos Quote/QuoteItem/QuoteStatus** — en `lib/types.ts`
- [x] **DB helper quotes** — `lib/db/quotes.ts` con `getQuotes`, `getQuote`, `getQuoteByToken`

### ✅ Completado en sesión 4

- [x] **Backoffice Fase 1 completo** — config_parameters, products, admin layout, simulador wired
- [x] **Regla 1: escenario óptimo automático** — si payback A > 12 años y B < 10 años → recomendar B
- [x] **PDF empresa completo** — Potencia contratada y tensión de suministro (sesión 3)

### 🟡 Próximo — Media prioridad

- [ ] **Precio de kWh dinámico por distribuidora/tarifa** — hoy usa $220 fijo cuando no hay monto en la boleta
- [ ] **Notificaciones por email** — avisar al admin cuando un lead nuevo llega o un proyecto cambia de estado
- [ ] **Métricas de conversión en dashboard** — tasa de conversión lead→cotización→proyecto, tiempo promedio por etapa

### ⚪ Baja prioridad / futuro

- [ ] **Múltiples tarifas en resultados** — comparar qué tarifa conviene según perfil de demanda
- [ ] **Modelo horario para BT4.x/AT** — integrar precios por bloque horario con batería
- [ ] **Ajuste de consumo AA por zona climática** — norte vs. sur tienen perfiles distintos
- [ ] **PMGD/PMG para empresas > 300 kW** — marco regulatorio diferente al net billing

---

## Flujo de datos resumido

```
StepCustomerType      → customerCategory ('natural' | 'business')
StepContact           → contact { regionId, email, ... }
StepSupply            → supply {
                          amperajeA,             ← solo residencial
                          potenciaContratadaKW,  ← solo empresa
                          tensionSuministro,     ← solo empresa
                          propertyType,
                          hasExistingSolar
                        }
StepBills             → consumptionProfile { bills[], averageMonthlyKWh, ... }
                      → supply.distribuidora + supply.tarifa (vía onUpdateSupply)
StepBillReview        → (solo visualización — confirma y avanza)
StepFutureConsumption → futureConsumption { airConditioners, waterHeater, evCharger,
                         totalAdditionalMonthlyKWh }
StepResults           → buildBaseInput() → empalmeMaxKW según tipo de cliente
                      → calcThreeScenarios(baseInput, batteryCount)   ← residencial
                      → calcThreeScenarios(futureInput, batteryCount)  ← si hay adiciones
                      → runBusinessSimulation(input)                   ← empresa
                      → calcEVCharger() con balance energético real
                      → POST /api/leads si el usuario hace clic en CTA
                      → PDFDownloadButton genera informe (residencial o empresa)
```

---

---

## Backoffice — Arquitectura y decisiones (sesión 4)

### Auth admin
Cookie `admin_token` comparada contra `ADMIN_SECRET` en `proxy.ts` (renombrado desde `middleware.ts` en sesión 5, requerido por Next.js 16) y en Server Components. Simple y funcional para un solo admin. No usa Supabase Auth (se deja para cuando haya múltiples usuarios).

### Patrón de config dinámica

```
DB config_parameters (15 parámetros)
  → getSimConfig() en lib/db/config.ts
    → SimulatorConfig (typed)
      → app/simulator/page.tsx (Server Component) lo inyecta
        → SimulatorClient recibe como prop
          → StepResults recibe como prop
            → buildBaseInput() popula SimulatorInput con overrides
              → calculations.ts lee override ?? constante_ts
```

Si la DB falla → graceful fallback a `constants.ts`. El simulador nunca se rompe.

### Patrón de catálogo dinámico

```
DB products (tabla solar_kit, is_active=true)
  → getResidentialCatalog() en lib/db/catalog.ts
    → SolarKit[] (misma interfaz que constants.ts)
      → app/simulator/page.tsx lo inyecta junto con config
        → StepResults lo pasa a calcThreeScenarios(input, count, catalog)
          → selectKits(empalmeMaxKW, catalog ?? KIT_CATALOG)
```

### Tablas Supabase (sesión 4)

| Tabla | Descripción |
|---|---|
| `leads` | Leads del simulador |
| `config_parameters` | 15 parámetros del simulador editables desde `/admin/config` |
| `products` | Catálogo de kits y componentes, editables desde `/admin/products` |
| `quotes` | Cabecera de cotización — número auto (`COT-YYYY-NNN`), estado, cliente, totales, token público |
| `quote_items` | Líneas de cotización — producto del catálogo o ítem libre, cantidad, precio, descuento |

**Tablas Fase 3 (sesiones 8–9):**

| Tabla | Descripción |
|---|---|
| `lead_notes` | Notas sobre leads (tipo, contenido, fecha) |
| `lead_status_history` | Auditoría de cambios de estado del lead |
| `project_payments` | Pagos recibidos por proyecto (monto, fecha, método, referencia) |

**Columnas agregadas en sesión 9:**

| Tabla | Columna | Descripción |
|---|---|---|
| `leads` | `follow_up_date DATE` | Fecha de próximo contacto programado |
| `leads` | `assigned_to UUID → users` | Vendedor asignado al lead |

---

## Comandos útiles

```bash
# Desarrollo local
npm run dev          # http://localhost:3000

# Verificar tipos
npx tsc --noEmit

# Deploy
git push origin main  # Vercel despliega automáticamente

# Variables de entorno necesarias (.env.local y en Vercel)
RESEND_API_KEY=...
LEAD_RECIPIENT_EMAIL=danilo.canessa@gmail.com
ANTHROPIC_API_KEY=...   # Si no está, OCR funciona en mock mode
```
