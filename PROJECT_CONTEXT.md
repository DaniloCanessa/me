# Mercado Energy — Contexto del Proyecto

> Última actualización: 5 de junio 2026 (sesión 18 — OCR Opus 4.8 interno, simulador en backoffice, informe de marca)
> Repositorio: https://github.com/DaniloCanessa/me
> Producción: https://mercado-energy.vercel.app

---

## ⚡ PRÓXIMO PASO AL REABRIR ESTE PROYECTO

**Sesiones 17 y 18 completadas, commiteadas y desplegadas** (commits `44c8201` y `77f740e` — push a main → Vercel rebuild automático, build verificado localmente antes del push).

**Estado de Vercel:** proyecto vinculado a `danilo-canessas-projects/mercado-energy`, URL de producción `https://mercado-energy.vercel.app`. Variables de entorno cargadas en production — el OCR con Opus 4.8 **no requiere variables nuevas** (modelo por defecto en código; override opcional `OCR_MODEL`).

**Verificación post-deploy pendiente (producción):**
1. `/simulator` público → sin botón de subir boleta, ingreso flexible kWh/monto $
2. `/admin/simulator` → OCR con badge "Modo interno" funcionando con Opus 4.8
3. `/admin/products` → categoría "Kit Solar" visible con los 14 kits
4. Informe PDF → diseño azul de marca con etiqueta "+ IVA"

**Pendientes (media prioridad):**
- Emojis de avisos condicionales del Paso 7 del simulador (⚠️ 🔋 ⚙️ 💡 ❓ ℹ️ 🔴 ⚡) → íconos SVG (requiere correr el wizard completo para verificar cada aviso)
- Debuggear y arreglar importación de costos como compras (`importCostsAsPurchases()`)
- Precio de kWh dinámico por distribuidora/tarifa (hoy usa $220 fijo cuando no hay monto en boleta; los meses con solo monto $ usan el precio real promedio del usuario si existe)
- Notificaciones por email cuando llega un lead nuevo o un proyecto cambia de estado
- Pipeline de ventas: métricas de conversión por etapa en el dashboard
- Inconsistencia comercial menor: kits pre-armados con batería (ej: `pfv-8.8kw-battery` $13.560.000) vs Escenario C dinámico (kit + N × $1.000.000) — difieren en $1M para la misma capacidad

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

**Desarrollos sesión 17 (4 junio 2026) — Rediseño visual: coherencia y elegancia en landing + simulador:**

> ⚠️ Todos estos cambios están **sin commit** en el working tree. Verificados con `tsc --noEmit` (sin errores) y render local (rutas 200). Capturas reales hechas con Chrome headless (`--headless=new --screenshot`).

- **Reestructuración del home (`app/page.tsx`):** se acortó el home. Quitadas del home las secciones `AboutUs`, `Solutions`, `Projects`, `SimulatorCTA` y `FinalCTA`. El home quedó: Hero → HowItWorks → ValueProposition → Brands → ContactSection → Footer.
- **Páginas independientes nuevas:** `app/soluciones/page.tsx`, `app/proyectos/page.tsx`, `app/nosotros/page.tsx`, `app/contacto/page.tsx`. Cada una con banda de título centrada (gradiente) + el componente correspondiente + Footer.
- **Navbar compartido (`components/landing/Navbar.tsx`):** componente `'use client'` reutilizable con menú móvil (hamburguesa). Dos variantes: `transparent` (sobre el video del hero) y `solid` (blanco con blur, sticky, para páginas internas). Reemplazó los navs duplicados. Enlaces: Soluciones · Proyectos · Nosotros · Contacto · botón "Simulador". El HeroSection ahora usa `<Navbar variant="transparent" />`.
- **Componente `Reveal` (`components/landing/Reveal.tsx`):** `'use client'`, IntersectionObserver para fade-in + translateY al hacer scroll, con `delay` para escalonar. Respeta `prefers-reduced-motion`.
- **Set de íconos SVG (`components/landing/icons.tsx`):** íconos de línea estilo Lucide (stroke 1.5, currentColor) que reemplazaron emojis en todo el sitio. Incluye: Monitor, Ruler, Zap, BarChart, Scale, Battery, MapPin, Handshake, BadgeCheck, Sun, Snowflake, Wind, Headset, Target, Home, Building, Car, Mail, Pin.
- **Pase de elegancia (todas las secciones):** tipografía `tracking-tight` + tamaños mayores, tarjetas premium (`ring-1 ring-[#b0cedd]/30` + sombras suaves azuladas + elevación hover), animaciones `Reveal`, gradientes en hero y stats. Componentes tocados: `HeroSection` (gradientes en capas sobre el video, animación de entrada escalonada, badge "Energía solar inteligente" eliminado), `HowItWorks`, `ValueProposition`, `AboutUs` (fix imágenes `fill` con `relative` + `sizes`), `Projects` (fix `sizes`), `ContactSection` (íconos SVG).
- **Banner de marcas (`components/landing/Brands.tsx`):** reemplazó la lista de texto por un marquee con scroll infinito (CSS keyframes, pausa al hover, difuminado en bordes, respeta reduced-motion). Logos en `public/images/brands/`. Logos oficiales reales: LONGi, Jinko, Livoltek, SMA (campo `wordmark: true` = logo horizontal sin texto al lado). Resto (Huawei, Canadian Solar, Victron, Pylontech, Dyness) usan favicons (pendiente conseguir logos oficiales).
- **Sección Soluciones rediseñada por completo:** alineada al brochure (`202605_Brochure empresas.pdf`). 4 servicios reales: Energía Solar, **Energía Eólica** (nuevo), Climatización Eficiente, **Consultoría y Soporte** (nuevo). Tarjetas horizontales con badge de gradiente azul + barra de acento al hover + banner CTA oscuro. Header interno opcional vía prop `showHeader` (en `/soluciones` se pasa `false` para no duplicar el título de página).
- **Misión y Visión en `/nosotros`:** sección "Lo que nos mueve" con los textos del brochure (orden Misión/Visión corregido al convencional; en el brochure venían intercambiados).
- **Cifras actualizadas:** "16 regiones" → "**+25 localidades**" (Hero, AboutUs, subtítulo de Proyectos). "+200 proyectos" se mantiene. Tercer stat del hero "25 años vida útil garantizada" → "**100% soluciones a medida**" (se quitó el compromiso de garantía).
- **CTAs unificados:** "Simular mi ahorro" → "**Simula tu proyecto**" en hero, FinalCTA, net-billing y formulario simulador. Botón del Navbar → "**Simulador**". Banner Soluciones → "Simula tu sistema ideal".
- **Componentes con props opcionales para reuso:** `Solutions({ showHeader })`, `Projects({ showHeader })`, `ContactSection({ showEyebrow })` — permiten usarlos con header (home) o sin él (bajo el título de página).
- **Simulador alineado al estilo del sitio:** `SimulatorClient` — header pasó de banda azul plana a blanco con blur + sticky + "Simulador solar" en texto con gradiente. `StepCustomerType` — emojis 🏠🏢 → íconos SVG en badges azules + tarjetas premium. Fix coherencia de color: `StepSupply` (texto seleccionado verde → azul de marca), `BillOCRUpload` (spinner verde → azul). **Paso 7 (`StepResults`)**: tarjetas alineadas (`ring` + sombra suave), hero de ahorro refinado (número `text-4xl tracking-tight` + sombra), bloques CTA → negro de marca `#010101`, botón CTA con hover `#1d65c5` + sombra, sección auto eléctrico 🚗 → `IconCar`. **Pendiente:** emojis de avisos condicionales del Paso 7.

**Desarrollos sesión 18 (5 junio 2026) — OCR Opus 4.8 interno, simulador en backoffice, informe de marca:**

- **Ajustes finos de landing (continuación sesión 17):**
  - Video del hero más claro (`opacity-40` → `opacity-65`, gradientes suavizados) — el proyecto Poroma se ve
  - Soluciones: 5ta tarjeta **Asesoría Energética** (análisis de tarifa/consumo/horarios, full-width), banner negro CTA eliminado, subtítulo "...solar, eólico, de climatización y soporte"
  - **Mapa de Chile interactivo** (`components/landing/ProjectsMap.tsx`, 'use client'): marcadores azules pulsantes posicionados en % sobre la imagen `pais-con-proyectos.png`, tooltip con proyecto al hover/tap. Coordenadas en campo `map: {x, y}` de cada proyecto en `Projects.tsx`
  - Proyectos: texto "...hogares, empresas, colegios, jardines infantiles, comunidades rurales..."
  - Nosotros: espacio título→AboutUs reducido a la mitad, subtítulo "Conoce el equipo detrás de Mercado Energy"
  - **Biznexus Group SPA · RUT eliminado** de Footer, LegalLayout y NetBilling (se mantiene en términos/privacidad como razón social legal y en datos bancarios del cotizador)
- **Paso 3 (StepSupply) homogenizado + flujo departamento:**
  - Estilo del sitio: header `text-3xl tracking-tight`, tarjetas `ring-1 ring-[#b0cedd]/30`, íconos SVG en badges con gradiente (emojis eliminados). Íconos nuevos en `icons.tsx`: Briefcase, GraduationCap, Factory, Buildings, Upload
  - Opción "Otro" **oculta** (el tipo `'otro'` se mantiene en `PropertyType` por compatibilidad con leads antiguos)
  - Grilla adaptativa: residencial 2 columnas, empresa 4
  - **Departamento**: oculta el resto del formulario y muestra tarjeta "no instalamos paneles" con 3 alternativas (climatización, respaldo baterías, asesoría energética) + botón "Quiero que me contacten" que envía la solicitud vía `/api/contact` con los datos ya capturados en el Paso 2 (cero fricción)
- **Paso 4 (StepBills) homogenizado + ingreso flexible:**
  - Tabla parte en el **mes anterior al actual** (el mes en curso aún no se factura) — la boleta con gráfico de 13 meses llena los 12 slots completos
  - **Ingreso kWh O monto $**: un mes cuenta con cualquiera de los dos; si solo hay monto, `kWh = monto ÷ precio` (precio real promedio de meses con ambos datos, fallback $220). El campo kWh muestra el estimado `≈ N` en azul, editable
  - Fix bug: clase inválida `bg-[#dde3e9]/50/40` en filas rellenadas → `bg-[#389fe0]/5`
  - Mensaje anti-abandono público: "con 2 o 3 meses basta — estimamos el resto"
- **OCR solo usuarios internos + Opus 4.8:**
  - `lib/auth.ts` (nuevo): `isAdminAuthenticated()` — valida JWT de cookie `admin_token` (server-side)
  - `/simulator` (público): botón OCR **oculto** (prop `ocrEnabled` server-side); `/api/parse-bill` devuelve **401 sin sesión** (antes era público — cualquiera podía consumir crédito Anthropic)
  - Modelo OCR: **`claude-opus-4-8`** por defecto (antes Haiku 4.5). Comparativa con boleta real difícil (foto rotada, gráfico de barras): Haiku inventó valores, Sonnet 4.6 leyó bien pero corrió meses ±1, **Opus 4.8 clavó 13/13 meses exactos** y verificó contra lecturas del medidor. Override vía env `OCR_MODEL`
  - Prompt mejorado: busca el gráfico "consumo últimos 13 meses" (pág. 2), maneja fotos rotadas 90°, empareja cada barra con su etiqueta del eje (no cuenta posiciones), valida primera barra = última barra (mismo mes, un año antes), **prohíbe inventar valores** (omite barras ilegibles y lo reporta en notes)
- **Simulador en el backoffice (`/admin/simulator`):** misma lógica que `/simulator` renderizada junto al sidebar (layout admin, protegido por proxy), `ocrEnabled` siempre. Prop `embedded` en `SimulatorClient` oculta el navbar público. Enlace "Simulador ⚡" en `AdminSidebar`
- **Fix límite 1000 filas de Supabase:** con 1.182 productos, `/admin/products` y el dropdown del cotizador cortaban en 1.000 filas — los 14 kits `solar_kit` (última categoría alfabética) eran invisibles. Ambas consultas ahora paginan con `.range()` + tiebreaker `id`
- **Informe PDF rediseñado a identidad de marca (`SimulationReportHtml.tsx`):**
  - Paleta verde antigua → azules de marca (#1d65c5/#389fe0) + cabecera negra #010101 con eyebrow cian y línea de gradiente. Emojis eliminados. Verde esmeralda solo en impacto ambiental (semántico)
  - **Fix cálculo:** faltaba la línea "Ahorro nocturno por batería" en el desglose (Escenario C no sumaba). KPI dice "autoconsumo + inyección + batería" cuando aplica
  - Usa config viva (`recommended.input.systemLifeYears/injectionValueFactor`) en vez de constantes — vida útil y % inyección del backoffice se reflejan en textos, ROI y payback
  - Cita legal corregida: "Ley 20.936" → "Art. 149 bis DFL 4 — Ley 21.118"
  - Botón "Descargar PDF" del modal en azul de marca
- **Precios "+ IVA" (netos, sin cambiar cálculos):** etiqueta en Paso 7 (tarjeta PFV + bloque CTA) e informe (tarjeta kit + comparación A/B/C) + nota metodológica "Los precios indicados son netos y no incluyen IVA"
- **Config actualizada por el usuario en `/admin/config`:** panel 550 Wp → **650 Wp**, área 2,5 → **2,7 m²**. Solo afecta dimensionamiento de **empresas** (`buildBusinessKit`); los kits residenciales tienen specs propios en `products` (siguen en base 550 Wp — decisión consciente, no se regeneró el catálogo)

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

**Desarrollos sesiones 14-15 (1 junio 2026) — Sistema IVA en proyectos:**

- **Problema inicial:** items libres en cotizaciones no mostraban costos de referencia, IVA no se calculaba correctamente en costos adicionales, subtotales inconsistentes
- **Migración SQL project_costs con campo con_iva:** `supabase/project_costs_con_iva.sql` — agregado campo `con_iva BOOLEAN NOT NULL DEFAULT true` con actualización de registros existentes
- **Migración SQL project_purchases con costo_referencia:** `supabase/project_purchases_cantidad.sql` — agregado campo `costo_referencia_sin_iva NUMERIC`
- **Tipos actualizados en lib/db/projects.ts:** `ProjectCost` incluye `con_iva: boolean`, `ProjectPurchase` incluye `costo_referencia_sin_iva: number | null`
- **Formulario automático de costos en ProjectDetail.tsx:**
  - Campos duales "Sin IVA" y "Con IVA" con cálculo automático bidireccional
  - Detección automática del campo activo por valor ingresado
  - Validación para prevenir bucles infinitos en la sincronización
  - Actualización automática de totales y cuenta corriente
- **Corrección de cuenta corriente:** todos los montos ahora se muestran consistentemente con IVA (19%)
  - Costos adicionales: aplicación de IVA según campo `con_iva`
  - Compras: aplicación de IVA automático (`Math.round(purchase.monto_clp * 1.19)`)
  - Subtotales: cálculo consistente con IVA incluido
- **Fix detección items libres en QuoteEditor.tsx:** cambio de `costo_proveedor_clp === 0` a `product_id === null` para correcta identificación
- **Fix cálculo margen en cotizaciones:** corrección de `margenPesos` para items libres usando precio neto versus costo
- **Función importCostsAsPurchases (pendiente debug):** creada en `actions.ts` para importar costos de referencia de cotizaciones como compras de proyecto
- **Botón importación en cotizaciones:** agregado "📦 Importar costos como compras" en tab cotizaciones de proyectos
- **Problemas solucionados:**
  1. ✅ Items libres sin costos de referencia visibles
  2. ✅ IVA no calculado en formulario de costos 
  3. ✅ Subtotales inconsistentes entre secciones
  4. ✅ Cuenta corriente no mostraba montos con IVA
  5. ⚠️ **PENDIENTE:** importación de costos como compras no funciona

**SQL ejecutado esta sesión:**
```sql
-- project_costs_con_iva.sql
ALTER TABLE project_costs ADD COLUMN IF NOT EXISTS con_iva BOOLEAN DEFAULT true;
UPDATE project_costs SET con_iva = true WHERE con_iva IS NULL;
ALTER TABLE project_costs ALTER COLUMN con_iva SET NOT NULL;

-- project_purchases_cantidad.sql  
ALTER TABLE project_purchases ADD COLUMN IF NOT EXISTS costo_referencia_sin_iva NUMERIC;
```

**Desarrollos sesión 16 (2 junio 2026) — Eliminación de proyectos e items libres corregidos:**

- **Problema reportado:** usuario no podía agregar items libres en cotizaciones, y el margen no se mostraba correctamente
- **Eliminación de proyectos con selección múltiple:**
  - Función `deleteProject(projectId)` en `actions.ts` — elimina proyecto y todas las entidades relacionadas (payments, purchases, costs, items)
  - Función `deleteMultipleProjects(projectIds[])` — eliminación en lote de múltiples proyectos
  - Componente `ProjectsTable.tsx` con checkboxes individuales y "seleccionar todos"
  - Barra de acciones que aparece al seleccionar proyectos con botón "🗑️ Eliminar seleccionados"
  - Confirmaciones antes de eliminar para prevenir eliminaciones accidentales
  - Estados de loading durante eliminaciones masivas
- **Corrección crítica de errores de sintaxis en items libres:**
  - **Frontend (QuoteEditor.tsx línea 288):** error `\` → `/` en cálculo de margen que impedía agregar items libres
  - **Backend (actions.ts línea 117):** comentario mal formateado `\ Modo precio` → `// Modo precio` que causaba error de servidor
  - **Cálculo de margen (QuoteEditor.tsx línea 129):** guardaba `costo_proveedor_clp: 0` para items libres → corregido a guardar el costo real
- **Visualización de margen corregida:** items libres ahora muestran margen porcentual calculado en lugar de "—"
  - Fórmula implementada: `((precio - costo) / costo) × 100`
  - Para caso real del usuario: precio 1,472,268 - costo 1,600,000 = margen -8.0% (pérdida documentada)
- **Debugging de error 404:** problema temporal después de reinicio de servidor en creación de cotizaciones → resuelto
- **Aclaración sobre pagos:** confirmado que los pagos se registran correctamente CON IVA incluido (flujo normal del negocio)
- **Estado actual:** items libres funcionan 100%, eliminación de proyectos operativa, LISTO para probar importación de costos como compras

**Hotfix sesión 16 (3 junio 2026) — Build de Vercel corregido:**

- **Problema detectado:** build de Vercel fallando por error de TypeScript en `ProjectDetail.tsx:691`
  - Error: tipo `ProjectPurchase` requiere propiedad `costo_referencia_sin_iva: number | null`
  - Faltaba en mapeo optimistic de compras masivas → causaba `Type error` en build
- **Solución aplicada:** 
  - Agregado `costo_referencia_sin_iva: null` en mapeo optimistic de `ProjectPurchase[]`
  - Build local verificado exitoso antes de commit
  - Commit `37c73ec`: "fix: agregar costo_referencia_sin_iva requerido en ProjectPurchase optimistic"
- **Deploy corregido:** push exitoso → Vercel rebuild automático → build ✅ funcionando
- **Estado actual:** proyecto desplegado correctamente en producción

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| UI | React 19.2.4 + Tailwind CSS v4 |
| Lenguaje | TypeScript (strict) |
| Hosting | Vercel (deploy automático desde GitHub) |
| Email | Resend (`app/api/leads/route.ts`) |
| OCR | Claude Opus 4.8 — solo usuarios internos (`app/api/parse-bill/route.ts`, override env `OCR_MODEL`) |
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
│   ├── page.tsx                    # Home (acortado sesión 17): Hero, HowItWorks, ValueProposition, Brands, ContactSection, Footer
│   ├── icon.png                    # Favicon (logotipo-2.png — Next.js lo detecta automáticamente)
│   ├── soluciones/page.tsx         # (sesión 17) Página Soluciones: Navbar + título + <Solutions showHeader={false}>
│   ├── proyectos/page.tsx          # (sesión 17) Página Proyectos: Navbar + título + <Projects showHeader={false}>
│   ├── nosotros/page.tsx           # (sesión 17) Página Nosotros: Navbar + AboutUs + Misión/Visión (textos del brochure)
│   ├── contacto/page.tsx           # (sesión 17) Página Contacto: Navbar + <ContactSection showEyebrow={false}>
│   ├── simulator/
│   │   ├── page.tsx                # Server Component: fetch config+catalog + valida sesión admin → ocrEnabled
│   │   └── SimulatorClient.tsx     # 'use client': wizard completo. Props ocrEnabled (OCR interno) y embedded (sin navbar, para backoffice)
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
│   │   ├── products/               # Catálogo: CRUD + sidebar categorías + filtro stock (consulta paginada >1000 filas)
│   │   │   └── import/             # Importación masiva Excel/CSV (página + server action upsert por SKU)
│   │   ├── quotes/                 # Cotizaciones: lista + editor + PDF (dropdown productos paginado)
│   │   └── simulator/page.tsx      # (sesión 18) Simulador embebido en el backoffice: <SimulatorClient ocrEnabled embedded>
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
│   │   ├── Navbar.tsx              # (sesión 17) 'use client': nav compartido responsive (variantes transparent/solid, menú móvil)
│   │   ├── Reveal.tsx              # (sesión 17) 'use client': fade-in al scroll (IntersectionObserver, reduced-motion)
│   │   ├── ProjectsMap.tsx         # (sesión 18) 'use client': mapa de Chile con marcadores interactivos (tooltip por proyecto)
│   │   ├── icons.tsx               # (sesión 17-18) Set de íconos SVG de línea (landing + simulador: Briefcase, GraduationCap, Factory, Buildings, Upload...)
│   │   ├── HeroSection.tsx         # <Navbar transparent> + video con gradientes + stats bar + animación entrada
│   │   ├── HowItWorks.tsx          # Cómo funciona (íconos SVG + Reveal)
│   │   ├── ValueProposition.tsx    # Propuesta de valor (íconos SVG + tarjetas premium + Reveal)
│   │   ├── SimulatorCTA.tsx        # CTA intermedio (ya NO se usa en el home)
│   │   ├── AboutUs.tsx             # Quiénes somos + equipo (usado en /nosotros)
│   │   ├── Solutions.tsx           # Soluciones: 4 servicios del brochure, prop showHeader (usado en /soluciones)
│   │   ├── Brands.tsx              # Banner marquee de logos (scroll infinito, public/images/brands/)
│   │   ├── Projects.tsx            # Grilla de proyectos + mapa Chile, prop showHeader (usado en /proyectos)
│   │   ├── FinalCTA.tsx            # CTA final (ya NO se usa en el home)
│   │   ├── ContactSection.tsx      # Formulario de contacto, prop showEyebrow (home + /contacto)
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
    ├── auth.ts                     # (sesión 18) isAdminAuthenticated(): valida JWT de cookie admin_token (server-side)
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
- Tipo de propiedad (filtrado por categoría de cliente). Opción "Otro" oculta desde sesión 18 (el tipo `'otro'` sigue en `PropertyType` por leads antiguos)
- **Departamento (sesión 18):** no se puede simular — se oculta el formulario y se muestra tarjeta con 3 alternativas (climatización, respaldo con baterías, asesoría energética) + botón "Quiero que me contacten" que envía la solicitud por `/api/contact` con los datos del Paso 2
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
- Tabla con los últimos 12 meses **facturables** (parte en el mes anterior al actual — el mes en curso aún no se factura)
- Por mes: consumo en **kWh O monto variable CLP** (cualquiera de los dos cuenta; si solo hay monto, se estima `kWh = monto ÷ precio` con el precio real promedio del usuario o $220 referencial — el estimado se muestra `≈ N` en azul, editable)
- Mensaje anti-abandono para público: "con 2 o 3 meses basta — estimamos el resto"
- **OCR integrado (SOLO usuarios internos, prop `ocrEnabled`):** botón "Subir boleta para autocompletar" con badge "Modo interno", usando `BillOCRUpload`
  - Soporta JPG, PNG, PDF
  - **Múltiples archivos a la vez** — procesamiento secuencial, merge por mes-año
  - Claude Opus 4.8 extrae datos; el usuario revisa y confirma antes de aplicar
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

**Funcionando end-to-end. Desde sesión 18: SOLO usuarios internos con sesión de admin** (el botón está oculto al público y `/api/parse-bill` devuelve 401 sin la cookie `admin_token` — protege el crédito Anthropic).

```
Usuario interno sube 1 o más archivos (JPG/PNG/PDF)
  → BillOCRUpload procesa secuencialmente
  → POST /api/parse-bill por cada archivo (requiere sesión admin)
    → Claude Opus 4.8 (claude-opus-4-8, override vía env OCR_MODEL) lee la boleta
    → Retorna JSON: distribuidora, tarifa, períodos con kWh y montos
  → Se mergean períodos de todos los archivos (prioridad: el que tiene variableAmountCLP)
  → Usuario revisa tabla editable y confirma
    → Se rellenan los meses en la tabla del paso 4
    → distribuidora y tarifa se propagan al WizardState
```

**Por qué Opus 4.8 (test sesión 18 con boleta Enel real — foto rotada 90°, papel arrugado, historial en gráfico de barras):** Haiku 4.5 inventó valores (166/154/174 vs reales 594/630/803); Sonnet 4.6 leyó los valores reales pero corrió la asignación de meses ±1 y saltó una barra; **Opus 4.8 extrajo los 13 meses exactos** y verificó el período actual contra las lecturas del medidor por iniciativa propia.

**Reglas del prompt OCR (reforzado sesión 18):**
- Períodos que cruzan meses (ej: 17 jul → 18 ago) → mes de **término** (agosto)
- Montos en CLP como enteros (sin puntos de miles)
- Busca el gráfico "consumo de los últimos 13 meses" (página 2 en Enel) como fuente principal del historial
- Maneja fotos rotadas 90°/180°
- Empareja cada barra con la etiqueta del eje que tiene debajo (no cuenta posiciones de memoria); valida que primera y última barra sean el mismo mes (un año de diferencia)
- **Prohibido inventar valores**: si una barra es ilegible, omite el mes y lo reporta en `notes` con confidence `medium`
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

### ✅ Completado en sesión 17 (4 junio 2026) — Rediseño visual

- [x] **Home acortado** — quitadas AboutUs, Solutions, Projects, SimulatorCTA, FinalCTA del home
- [x] **Páginas independientes** — `/soluciones`, `/proyectos`, `/nosotros`, `/contacto`
- [x] **Navbar compartido y responsive** — `components/landing/Navbar.tsx` (variantes transparent/solid, menú móvil)
- [x] **Componente `Reveal`** — fade-in al scroll con IntersectionObserver (respeta reduced-motion)
- [x] **Set de íconos SVG** — `components/landing/icons.tsx`, reemplazaron emojis en todo el sitio
- [x] **Pase de elegancia** — tipografía, tarjetas premium, animaciones, gradientes en todas las secciones del home
- [x] **Banner de marcas** — marquee con scroll infinito + logos reales (LONGi, Jinko, Livoltek, SMA)
- [x] **Sección Soluciones rediseñada** — 4 servicios del brochure (incl. Eólica y Consultoría)
- [x] **Misión/Visión en /nosotros** — textos del brochure
- [x] **Cifras actualizadas** — +25 localidades, 100% soluciones a medida (quitado "25 años garantizados")
- [x] **CTAs unificados** — "Simula tu proyecto" / "Simulador" en navbar
- [x] **Simulador alineado** — header, paso 1, hero/KPIs/CTA del paso 7, fix de colores verdes no-semánticos
- [ ] **PENDIENTE:** emojis de avisos condicionales del Paso 7 del simulador (ver media prioridad)
- [ ] **PENDIENTE:** logos oficiales de Huawei, Canadian Solar, Victron, Pylontech, Dyness (hoy usan favicons)
- [ ] **PENDIENTE:** commit + push de todos los cambios de la sesión 17 para desplegar a Vercel

### ✅ Completado en sesiones 14-15 (1 junio 2026)

- [x] **Sistema de gestión de IVA en costos** — implementado campo `con_iva` en `project_costs` con formulario de doble campo automático (sin IVA ↔ con IVA) para cálculo bidireccional
- [x] **Migración SQL con campo con_iva** — `supabase/project_costs_con_iva.sql` ejecutado: agregado `con_iva BOOLEAN NOT NULL DEFAULT true`, actualización de registros existentes
- [x] **Migración SQL costo_referencia_sin_iva** — `supabase/project_purchases_cantidad.sql` ejecutado: campo para costos de referencia en compras
- [x] **Formulario automático de costos en ProjectDetail.tsx** — campos duales "Sin IVA" y "Con IVA" con sincronización automática, detección del campo activo por valor, prevención de bucles infinitos
- [x] **Fix cuenta corriente con IVA** — corrección completa de visualización: costos adicionales según campo `con_iva`, compras con IVA automático (`* 1.19`), subtotales consistentes
- [x] **Fix detección items libres en QuoteEditor** — cambio de `costo_proveedor_clp === 0` a `product_id === null` para correcta identificación de items libres
- [x] **Fix cálculo margen cotizaciones** — corrección de `margenPesos` para items libres usando precio neto versus costo de referencia
- [x] **Tipos actualizados** — `ProjectCost` incluye `con_iva: boolean`, `ProjectPurchase` incluye `costo_referencia_sin_iva: number | null` en `lib/db/projects.ts`
- [x] **Función importCostsAsPurchases** — creada en `actions.ts` para importar costos de referencia como compras, botón agregado en interfaz (**pendiente debug**)
- [x] **Problemas IVA solucionados** — items libres muestran costos, IVA se calcula correctamente, subtotales consistentes, cuenta corriente con IVA

**SQL ejecutado esta sesión:**
```sql
ALTER TABLE project_costs ADD COLUMN IF NOT EXISTS con_iva BOOLEAN DEFAULT true;
UPDATE project_costs SET con_iva = true WHERE con_iva IS NULL;
ALTER TABLE project_costs ALTER COLUMN con_iva SET NOT NULL;
ALTER TABLE project_purchases ADD COLUMN IF NOT EXISTS costo_referencia_sin_iva NUMERIC;
```

### ✅ Completado en sesión 16 (2 junio 2026)

- [x] **Eliminación de proyectos con selección múltiple** — función `deleteProject()` y `deleteMultipleProjects()` en `actions.ts`, componente `ProjectsTable.tsx` con checkboxes y barra de acciones, confirmaciones y estados de loading
- [x] **Fix crítico items libres en cotizaciones** — error de sintaxis `\` → `/` en cálculo de margen (QuoteEditor.tsx línea 288) que impedía agregar items libres
- [x] **Fix crítico backend items libres** — comentario mal formateado en `actions.ts` línea 117 que causaba error de servidor al procesar items libres
- [x] **Corrección guardado de costos de referencia** — items libres ahora guardan el `costo_proveedor_clp` real en lugar de 0, permitiendo cálculo correcto de margen
- [x] **Visualización de margen en items libres** — items libres ahora muestran margen porcentual calculado `((precio-costo)/costo)×100` en lugar de "—"
- [x] **Debugging error 404 en cotizaciones** — problema temporal después de reinicio de servidor resuelto, creación de cotizaciones operativa
- [x] **Verificación sistema de pagos** — confirmado que los pagos se registran correctamente CON IVA incluido según flujo de negocio
- [x] **Items libres 100% funcionales** — usuario puede agregar items libres con costos y precios reales, margen se calcula y muestra correctamente (ej: -8.0% para caso de pérdida documentada)

### ✅ Completado en sesión 13 (20 mayo 2026)

- [x] **Fix Tailwind CSS / Turbopack** — error `Can't resolve 'tailwindcss' in 'Documentos'` causado por bug de Turbopack que resolvía desde el directorio padre. Solución: Next.js actualizado a 16.2.6 + `resolveAlias: { tailwindcss: path.resolve(...) }` en `next.config.ts`.
- [x] **Fix sidebar post-login** — sidebar no aparecía inmediatamente al entrar. Causa: `router.push` hace soft navigation sin recargar el layout. Fix: `window.location.href = '/admin/leads'` (hard reload) en `app/admin/login/page.tsx`.
- [x] **Recuperación de contraseña admin** — flujo completo: formulario `/admin/forgot-password`, API `POST /api/admin/forgot-password` (genera token con 1h de expiración, envía email via Resend), página `/admin/reset-password?token=...`, API `POST /api/admin/reset-password` (valida token, hashea nueva contraseña, limpia token). Rutas agregadas a `PUBLIC_ADMIN` en `proxy.ts`. SQL: `ALTER TABLE users ADD COLUMN reset_token text; ADD COLUMN reset_token_expires timestamptz;`
- [x] **Cuenta protegida** — `danilo.canessa@gmail.com` no puede ser eliminada ni desactivada por otros usuarios. Protección en `app/admin/users/actions.ts` (constante `PROTECTED_EMAIL`) y badge "🔒 protegido" en `UsersManager.tsx`.
- [x] **Último acceso en usuarios** — columna "Último acceso" en tabla de usuarios con fecha relativa. La fecha se registra automáticamente al hacer login (`app/api/admin/login/route.ts` actualiza `last_login_at`). SQL: `ALTER TABLE users ADD COLUMN last_login_at timestamptz;`
- [x] **Flujo cotización sin paso redundante** — al crear nueva cotización ya no hay que hacer clic en "Nueva cotización" dos veces. Al seleccionar cliente desde la lista, se redirige directamente al editor. Implementado con `?from=quotes` en `/admin/clients` + `ClientsManager` con `fromQuotes` prop que activa clic de fila completa.
- [x] **Formulario de cotización más ancho** — `max-w-6xl` → `max-w-screen-2xl` en `QuoteEditor.tsx`.
- [x] **Formulario de proyectos más ancho** — `max-w-5xl` → `max-w-screen-2xl` en `ProjectDetail.tsx` (4 instancias).
- [x] **Separador de miles en "Costo neto"** — campo cambiado de `type="number"` a `type="text"` con `Intl.NumberFormat('es-CL')` para mostrar miles y `.replace(/\D/g, '')` para parsear. Aplicado en ambos campos de costo neto en `QuoteEditor.tsx`.
- [x] **Fix ítems libres en cotización (bug 1 — margen_pct NOT NULL)** — columna `quote_items.margen_pct NUMERIC NOT NULL DEFAULT 30` rechazaba `null`. Fix: `margen_pct: directPriceIva > 0 ? 0 : margen` en `upsertQuoteItem` (`app/admin/quotes/actions.ts`).
- [x] **Fix ítems libres en cotización (bug 2 — precio 0 en display)** — `ItemRow` en `QuoteEditor.tsx` recalculaba precio desde `calcItem(costo=0, margen=0)` dando 0. Fix: detecta `isFreeItem` (`costo=0 && margen=0`), usa `item.unit_price_clp` directamente para `freeNeto`, y en save envía `unit_price_direct = freeNeto * 1.19`. El campo de edición del precio neto también usa `freeNeto` para ítems libres.

**SQL ejecutado esta sesión en Supabase:**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires timestamptz;
```

### ✅ Completado en sesión 11 (9 mayo 2026)

- [x] **Recuperación de acceso admin** — contraseña del usuario `danilo.canessa@gmail.com` reseteada via SQL en Supabase. Técnica: dollar-quoting (`$h$...$h$`) para evitar que los `$` del hash bcrypt confundan al parser de PostgreSQL. Contraseña temporal: `password` — **cambiar desde `/admin/users`**.

### ✅ Completado en sesión 10 (30 abril 2026)

- [x] **Vercel configurado** — proyecto vinculado (`vercel link`), 6 variables de entorno cargadas (`RESEND_API_KEY`, `LEAD_RECIPIENT_EMAIL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET`, `JWT_SECRET`). URL producción: `https://mercado-energy.vercel.app`
- [x] **Fix importación Excel — tipo integer** — `Math.round()` aplicado a `costo_proveedor_clp`, `base_price_clp` e `installation_price_clp` en `ProductImporter.tsx`. Excel introduce decimales por precisión flotante (ej: `434356.149...`) que Supabase rechaza en columnas `integer`
- [x] **Campo Proveedor en productos** — nuevo campo `proveedor text` (nullable) en: interfaz `Product`, formulario modal, tabla (debajo del SKU), `createProduct`/`updateProduct` en `actions.ts`, `ImportRow` y mapeo de columnas en `ProductImporter` (aliases: `proveedor`, `supplier`, `marca`, `fabricante`). SQL: `ALTER TABLE products ADD COLUMN IF NOT EXISTS proveedor text`
- [x] **Fix constraint category** — `products_category_check` actualizada en Supabase para incluir `'ac'` (Aire Acondicionado), que existía en la app pero no en la constraint de la BD

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

- [ ] **INMEDIATO: Fix función importCostsAsPurchases** — debuggear por qué los costos de referencia de items libres en cotizaciones no se importan como compras en proyectos (flujo completo para probar listo)
- [ ] **Precio de kWh dinámico por distribuidora/tarifa** — hoy usa $220 fijo cuando no hay monto en la boleta
- [ ] **Notificaciones por email** — avisar al admin cuando un lead nuevo llega o un proyecto cambia de estado
- [ ] **Métricas de conversión en dashboard** — tasa de conversión lead→cotización→proyecto, tiempo promedio por etapa
- [ ] **Pulir avisos del Paso 7 (Resultados) del simulador** — reemplazar los emojis de las cajas de recomendación condicionales (⚠️ 🔋 ⚙️ 💡 ❓ ℹ️ 🔴 ⚡) por íconos SVG de `components/landing/icons.tsx`, para coherencia con el rediseño elegante. Requiere correr el wizard completo con datos válidos para verificar visualmente cada aviso (no se pudo capturar en headless). Ya están hechos: header, paso 1, hero/KPIs/CTA del paso 7 y el auto eléctrico (🚗 → IconCar).

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

**Columnas agregadas en sesión 10:**

| Tabla | Columna | Descripción |
|---|---|---|
| `products` | `proveedor text` | Nombre del proveedor/fabricante del producto |

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
