# Mercado Energy — Contexto del Proyecto

> Última actualización: 23 de agosto 2026 (sesión 34 — **catálogo de paneles**: el panel pasa a ser entidad propia (`solar_panels`: marca, potencia, peso, ancho, largo, espesor) y cada kit apunta a uno vía `products.panel_id`. **La potencia del kit deja de escribirse a mano y se deriva** (paneles × W del panel), igual que los m² (medidas reales del panel + 2 cm por lado). Sección nueva `/admin/paneles` con matriz kits × paneles por checkbox, columnas ordenadas por potencia, y bloqueo de borrado nombrando los kits a reasignar. En las specs de cada kit solo se edita la cantidad de paneles: kWp y m² se recalculan en vivo (en la ficha completa y en el modal del listado). Los nombres comerciales se conservan; cuando la diferencia supera 0,25 kW el informe muestra ambas — *PFV 8,8 kW (8,4 kW)*. **Motivo:** `pfv-8.8kw` tenía 12 paneles y 8,8 kWp declarados (12×550=6,6 · 12×700=8,4), y la simulación generaba con 8,8 → sobreestimaba el ahorro ~4,8 %. Migración `supabase/paneles.sql` **ya corrida**; catálogo migrado a **Astroenergy 700 W** (2384×1303×33 mm, 38 kg) con cantidades ajustadas por el usuario. Commits `201c6cd`, `acb24c4`, `95d0406`. ⚠️ **Efecto colateral: al guardar un kit el precio se recalcula en silencio desde `costo_proveedor_clp × margen_pct`** y se sobrescribieron 5 precios; el peor —`pfv-2.2kw-battery` a $439.530 por un dígito faltante en el costo— **ya lo corrigió el usuario** ($3.671.910). Ver "PARA RETOMAR".)
>
> Sesión 33 — **simulaciones guardadas e informe rediseñado**: reabrir una simulación con `?simulacion=<id>` para corregir inputs o cambiar el kit (guardar crea versión nueva, nunca sobrescribe) + el autocompletado ofrece retomar una simulación previa; **informe PDF de exactamente 2 páginas** con paginación real (captura por página, no un lienzo cortado a ciegas), cabecera fotográfica, generación-vs-consumo, balance energético en 1/3+2/3, banda azul de KPIs y bloque de comparación de la cuenta cuando hay equipos proyectados; se elimina la "cobertura solar" (saturaba en la fracción diurna: era un parámetro del modelo disfrazado de resultado). **Dos bugs de dato al cliente:** las boletas `BT1-T6` caían como tarifa desconocida pero se pintaban en verde "Tarifa adecuada" → `normalizeTarifa()`; y el informe de **empresa** ignoraba el toggle de equipos proyectados, así que la pantalla mostraba una cosa y el PDF otra. **Todo commiteado y desplegado** — `0f6689a`, `cea367f`, `82b8dc0`, `f526882`. Sin migraciones nuevas.)
>
> Sesión 32 — **rediseño del sistema de facturas estilo ERP**: módulo único `/admin/facturas` con pestañas Compras · Ventas · Cobranza · Conciliación; ingreso de compras por **XML del DTE** (sin OCR); **plan de cuentas editable** con clasificación obligatoria y memoria por proveedor; **el proyecto deja de pedirse al ingresar** y pasa a ser centro de costo opcional; **anti-duplicados** por RUT+folio+tipo; **estado de pago y cobranza automática** de facturas de venta; **conciliación de ventas documento por documento** + veredicto del mes; balance desglosado por cuenta. Commits `db53ce7`, `9488632`, `24f25e1`, `47bfbfe` — **desplegados en la sesión 33**. Migraciones `supabase/facturas_v2.sql` y `supabase/simulaciones.sql` **ya corridas por el usuario**.
>
> Sesión 31 — **rediseño del simulador**: consumo real por mes, flujo de 6 pasos, hero de ahorro anual, escenario C con planta elegible + selector de kW en modo interno + 0% de reserva, gráficos generación-vs-consumo y balance energético, superficie por dimensiones del panel; **informe PDF con logo** y cabecera azul + 2 gráficos nuevos; **nuevo proyecto web** PFV 8 kW on-grid Las Condes. **Todo desplegado** — commits `46c2cec`, `feb123e`, `8fa6d0d`; al pushear se subió también el **módulo F29 de la sesión 30** (estaba sin pushear) → F29 ahora en producción. Sin migraciones nuevas. Sesión 30 — módulo tributario F29 + balance anual. Sesión 29 — simulador PFV existente + fotos comprimidas)
> Repositorio: https://github.com/DaniloCanessa/me
> Producción: **https://www.mercadoenergy.cl** (dominio definitivo, EN VIVO con SSL desde sesión 24). `mercado-energy.vercel.app` redirige 301 al dominio.

---

## ⚡ PRÓXIMO PASO AL REABRIR ESTE PROYECTO

**Sesiones 17 a 24 completadas, commiteadas y desplegadas.** Sesión 23: `c0bb683` redirects 301 + PWA, `3c21cfc` ícono PWA, `9088990` responsive listas, `360a378` responsive detalle. **Sesión 24:** `2aad819` flujo de captura de gastos + `874fc1a` enlace "ver boleta" + `5b4d522` 301 del `.vercel.app` al dominio nuevo (cambio de dominio en vivo). Requiere la migración `supabase/expense_captures.sql` (ya ejecutada por el usuario). **Sesión 25:** `ed03406` contraste móvil (light-only), `dd84b23` seguridad (sesión 12h + rate-limits + fix relay `send-report`), `29a98af` política de contraseñas. **Sesión 26:** `33ab4b6` badge de gastos pendientes, `5828c67` módulo de Finanzas + gastos generales manuales (requiere la migración `supabase/finanzas_gastos_generales.sql`, ya ejecutada por el usuario; **el usuario revisa el P&L con datos reales mañana**). **Sesión 27:** `d244580` correo diario de licitaciones (heartbeat los días sin novedades), `f77608d` preview de PDF + lightbox en la revisión de gastos, `1ca96d7` extrapolación estacional del consumo residencial (sin migraciones). Los 3 commiteados y desplegados. **`9e64c54`** corrige la coherencia del Paso de revisión con la estacionalidad y **`cdf14a9`** agrega el respaldo de cron por GitHub Actions + hardening del heartbeat (ver bloque de la sesión 27). **El cron de Vercel (Hobby) no se disparó la mañana del 16 jun** → se montó respaldo en GitHub Actions y se **rotó `CRON_SECRET`** (nuevo valor en Vercel Production + secreto de repo de GitHub; verificado verde por el usuario). La estacionalidad se **verificó en local** (función real `extrapolateSeasonalKWh`) **y en la UI real** (Chrome headless por CDP, wizard residencial completo): con un solo mes (abril=390) reproduce el ejemplo del modelo (media 408 · jul 466 · dic 370 · total ≈4.890 · peak julio); el mes ingresado se conserva exacto y los 11 faltantes salen estimados. **Sesión 28:** `d47e8e1` "Atención a" en clientes empresa + RUT/atención en el PDF de cotización (migración `supabase/cliente_atencion_rut_cotizacion.sql`, **ya ejecutada y verificada por el usuario**, desplegado). **Sesión 29 (21 jun):** Simulador con lógica de **PFV existente** (saldo de empalme / complemento / mantención) **commiteado y desplegado** (`9848928`) tras revisión del usuario — `tsc` y build limpios, verificado en la UI por CDP. Fotos de proyectos **comprimidas y desplegadas** (`0a9d88b`): casa-carlos-alvarado 9 MB→677 KB, panaderia-san-bernardo 3 MB→820 KB, poroma-img 3,6 MB→628 KB. **Sesión 30 (21-24 jun) — MÓDULO TRIBUTARIO F29 COMPLETO (13 commits SIN PUSHEAR, ver bloque sesión 30):** primero se validó el P&L de caja con datos reales (se corrigieron 2 datos en Supabase: comisión Transbank $99.151 → gasto general cat. Comisiones; duplicado Sodimac eliminado) y se agregó categoría al aprobar gasto general (`1876a13`). Luego el F29: facturas de venta (`5bd571b`), planilla F29 mensual (`6d2090d`), ciclo anticipo→factura (`2df6e5e`), Conciliación SII que importa el RCV del SII y cruza contra la app (`6ae247d`, `5a53bb3`), registro de gasto general + activo fijo desde la conciliación (`6acd8ad`), verificación del remanente + F29 oficial + fix de notas de crédito (`c7972bf`), cuadratura del balance (`42708fc`), export a Excel (`a7399bd`). **HALLAZGO CLAVE:** el crédito/débito del F29 deben salir del **RCV del SII** (CSV que el usuario descarga), NO de `project_purchases` — ver memoria [[f29-reconciliacion-real]]. Datos 2026 ene–may + F29 oficial cargados en Supabase (punto de partida). La verificación del remanente **flagueó marzo 2026** ($7.006 de remanente que febrero no dejó — revisar con contador). **Todo verificado end-to-end contra datos reales; NADA desplegado aún (el usuario revisa en local).**

**▶ PARA RETOMAR (sesión 35):**
0. ✅ **`pfv-2.2kw-battery` corregido por el usuario** (23 ago 2026): su `costo_proveedor_clp` tenía un dígito menos ($338.100 en vez de $3.338.100), lo que dejó el kit en $439.530 — más barato que el mismo kit sin batería. Ya está en **$3.671.910** ($1.748.529/kWp real), coherente con el de 3,3 kW con batería ($1.753.815/kWp).
0a. ⚠️ **El precio se recalcula en silencio al guardar.** `base_price_clp` sale de `costo_proveedor_clp × (1 + margen_pct/100)` en un campo oculto (`ProductEditForm` y `ProductsManager`), así que editar **cualquier** campo de un kit reescribe su precio. Al ajustar las cantidades de paneles en la sesión 34 se movieron 5 precios sin aviso. Los 4 restantes quedaron así y **conviene validarlos contra la lista real**: `pfv-11kw-battery` 17.700.000 → 13.703.300 · `pfv-3.3kw-battery` 5.460.000 → 6.138.352 · `pfv-13.9kw` 16.680.000 → 16.900.000 · `pfv-11kw` 13.200.000 → 13.000.000. **Pendiente de UI:** avisar antes de guardar cuando el precio vaya a cambiar. ⚠️ Recordar que **Supabase es la misma base en local y producción**: cualquier edición de precio queda viva en el sitio de inmediato, sin desplegar.
0b. 🔴 **La anomalía de precio del 11 y 13,9 kW persiste, ahora en el costo:** `pfv-11kw` tiene costo $10.000.000 (30 % margen) contra $5.634.454 del kit de 10 kW. En $/kWp real: 10 kW = $643.938 vs 11 kW = $1.238.095. Sigue duplicándose entre un escalón y el siguiente.
0c. **Kits cuyo nombre comercial ya no calza con lo real** (se muestran con paréntesis en el informe): `pfv-11kw` = 15 paneles → **10,5 kW** y `pfv-1.1kw` = 2 paneles → **1,4 kW**. Con paneles de 700 W no hay forma de llegar a 1,1 kW (1 panel = 0,7; 2 = 1,4): ese kit conviene renombrarlo o darlo de baja.
0d. **Panel de 550 W eliminado del catálogo** en la sesión 34: hoy los 14 kits usan Astroenergy 700 W. Si vuelve a haber stock de 550, se re-crea en `/admin/paneles` y se reasignan los kits que corresponda.
0b. ✅ **Migraciones al día:** `supabase/facturas_v2.sql` y `supabase/simulaciones.sql` **ya corridas y verificadas por el usuario** (la limpieza de duplicados dejó 0 filas; `simulaciones.sql` recuperó 2 simulaciones). El módulo `/admin/facturas` y las simulaciones guardadas están operativos y desplegados.
0c. **Rediseño del catálogo de kits (pospuesto por el usuario, "tengo que pensar más cómo quiero trabajar con eso"):** pasar de 550 W a **paneles de 700 W**, con panel activo configurable, kit definido por cantidad de paneles, catálogo de inversores con ratio DC/AC y precio compuesto. **Falta que el usuario defina:** modelo y dimensiones del panel de 700 W, catálogo de inversores y ratio DC/AC objetivo.
0d. **Limpieza de datos en facturas (sesión 32, sin hacer):** reclasificar las compras de junio (el backfill las dejó todas como "Materiales y equipos"); corregir la factura de la Universidad de Chile (total $39.960 con neto e IVA en 0 — es exenta); cargar la fecha de compromiso de pago de Aleol; y cosmético, `origen` muestra "OCR" en facturas que en realidad vinieron del RCV.
0b. **Configurar la cobranza:** verificar `cobranza.email` en `/admin/config` (default `ventas@mercadoenergy.cl`) y probar el envío con `/api/cron/cobranza?test=1` (simula, no envía). Al desplegar: el `vercel.json` ya trae el segundo cron (12:30 UTC = 08:30 Chile) y existe el respaldo `.github/workflows/cron-cobranza.yml` (usa el mismo secreto `CRON_SECRET`, ya configurado).
1. ✅ **F29 DESPLEGADO (sesión 31):** los commits del módulo F29 de la sesión 30 (`1876a13`…`a7399bd`) se pushearon a producción junto con el rediseño del simulador (fueron arrastrados por el push de `46c2cec`). **Las 8 migraciones ya están corridas en Supabase** (`sales_invoices`, `f29_periods`, `anticipo_factura_cycle`, `sii_rcv`, `balance_anual`, `gasto_activo_fijo`, `f29_oficial`). ✅ **Correos al cliente alineados a la marca** (commit `e7c81ef`, desplegado en la sesión 33): la confirmación de lead (`app/api/leads/route.ts`) y el envío del informe (`app/api/send-report/route.ts`) pasaron del verde sin logo al **azul de marca con logo**, vía `lib/email-brand.ts`.
2. **Saldos de apertura del balance** (`/admin/balance`, vacíos): capital social **$1.000.000** (confirmado por el usuario, falta ingresarlo); **aportes socio y pérdida acumulada** los dudaba (cifras derivadas por sesión anterior) → validar con contador o sacar del F22. Son editables y están marcados "por confirmar".
3. **Revisar con el contador el descuadre del remanente de marzo 2026** ($7.006 que febrero no dejó — la verificación lo marca en rojo en el F29 de marzo).
4. **Registrar las facturas de gasto general que faltan** (la Conciliación SII de cada mes las marca 🔴): un clic por factura o "registrar todas", pre-llenadas del RCV. Y registrar facturas de venta + honorarios (BHE) según ocurran.
5. **Pendientes "útiles pero después"** (acordados sesión 30): conciliación de ventas por documento, DJ 1879 honorarios, depreciación de activo fijo, recordatorios de vencimiento (F29 día 12, renta abril).
6. **Posible:** ajustar la **sección empresas** del simulador (dimensionamiento continuo en `buildBusinessKit`, cobertura 90%, tope 300 kW net billing, análisis tarifario BT2/BT3/BT4).

**✅ CAMBIO DE DOMINIO COMPLETADO (sesión 24, 11 jun 2026):** `www.mercadoenergy.cl` ya sirve este proyecto con SSL y reemplazó la tienda Jumpseller. **El DNS se edita en HostGator** (nameservers `ns28`/`ns29.hostgator.cl`), NO en NIC Chile (que es solo el registrador). Registros puestos: apex `mercadoenergy.cl` **A → `216.198.79.1`**, `www` **CNAME → `81ad3f5d52b0cd8b.vercel-dns-017.com`** (valores nuevos de Vercel); el apex redirige 308 a www (lo hace Vercel). **Correo Titan preservado** (MX `mx1`/`mx2.titan.email` intactos — el sitio viejo estaba en Jumpseller y el correo en Titan). Las **301 del sitio viejo (~154 URLs, commit `c0bb683`)** ya están activas (institucionales 1:1 + fichas de producto a `/soluciones`). `mercado-energy.vercel.app` → **301 al dominio** (commit `5b4d522`, redirect host-based en `next.config.ts`). **✅ SEARCH CONSOLE + BING + SITEMAP LISTOS (sesión 24):** Google verificado por propiedad de **Dominio** (TXT `google-site-verification` en HostGator, TTL **3600** para no chocar con el SPF de Titan que ya estaba) + sitemap enviado. Bing verificado por **meta tag** `msvalidate.01` (en la metadata de `app/layout.tsx`, commit `0b49522` — Bing no importa propiedades de tipo "Dominio" desde GSC, por eso se agregó manual) + sitemap enviado. **✅ PWA reinstalada desde el dominio nuevo y funcionando** (confirmado por el usuario, 15 jun 2026).

**✅ CORREOS RESUELTOS (sesión 24):** el dominio `send.mercadoenergy.cl` ya estaba **verificado en Resend** (región São Paulo). Se cambió el remitente de los **6 envíos** del sandbox `onboarding@resend.dev` → **`notificaciones@send.mercadoenergy.cl`** (commit `b2cd0b1`), lo que destrabó los correos a **clientes** (confirmación de lead e informe de simulación) que antes **fallaban en silencio** (el sandbox solo entregaba al dueño de la cuenta). El buzón que recibe contactos/leads pasó de Gmail a **`ventas@mercadoenergy.cl`** (Titan; `contacto@` estaba bloqueado): se cambió el correo público del sitio en 10 lugares (commit `3b1c61f`) y `LEAD_RECIPIENT_EMAIL` en Vercel (Production) + `.env.local`. **Pendiente del usuario:** confirmar con una prueba real (formulario de contacto → llega a `ventas@`) y, si quieren remitente `@mercadoenergy.cl` a secas, verificar el dominio raíz en Resend.

**📱 APP MÓVIL (PWA) — Fases 1 y 2 LISTAS Y DESPLEGADAS (sesión 23):** el sitio es ahora una PWA instalable para uso interno. Se instala desde el navegador del celular entrando a `/admin` → "Agregar a pantalla de inicio"; queda con ícono "me" (rayo + círculo) y abre en pantalla completa en el login del admin. El backoffice completo es responsive (listas como tarjetas, detalles con scroll/apilado).

**🧾 CAPTURA DE GASTOS YA CONSTRUIDA Y DESPLEGADA (sesión 24):** bandeja en `/admin/gastos` — capturar boleta (cámara/galería) → revisar con OCR → aprobar. Con proyecto crea una compra (entra a la cuenta corriente); **sin proyecto** queda como gasto general. Ver detalle en el bloque de la sesión 24. **Verificado end-to-end por el usuario desde el celular: captura → OCR real → aprobación.**

**Estado de Vercel:** **el único proyecto válido es `mercado-energy`** (URL `https://mercado-energy.vercel.app`), que tiene TODAS las variables de entorno. **(sesión 24)** Se eliminó un proyecto Vercel **duplicado** llamado `me` que se auto-importó del mismo repo `DaniloCanessa/me`, desplegaba en paralelo y solo tenía 4 variables (sin las de Supabase → roto) — causaba confusión. Si Vercel vuelve a crear un duplicado al reimportar, **conservar siempre `mercado-energy`**. Variables en production: las históricas + **`MERCADO_PUBLICO_TICKET`** + **`CRON_SECRET`** + **`ANTHROPIC_API_KEY`** (cargada en sesión 24; antes faltaba — ver nota de OCR en verificación).

**Licitaciones operativo end-to-end:** tablas creadas en Supabase, primera sincronización real exitosa (2.435 publicaciones → 21 calzaron → email enviado), ticket definitivo verificado, cron diario activo a las 08:00 de Chile.

**Verificación post-deploy pendiente (producción):**
1. `/simulator` público → sin botón de subir boleta, ingreso flexible kWh/monto $
2. OCR con Opus 4.8 (`/admin/simulator` boletas de luz + captura de gastos) — **corregido en sesión 24: hasta entonces corría en MODO DEMO** porque `ANTHROPIC_API_KEY` nunca estuvo cargada en Vercel (devolvía datos de ejemplo fijos). Ya cargada → OCR de gastos verificado leyendo boletas reales; el del simulador usa la misma key (verificar cuando se use)
3. `/admin/products` → categoría "Kit Solar" visible con los 14 kits
4. Informe PDF → diseño azul de marca con etiqueta "+ IVA"
5. `/admin/licitaciones` → "Sincronizar ahora" funciona con el ticket definitivo
6. Botón flotante de WhatsApp → abre chat con +56 9 6654 6276, con halo pulsante (sesiones 20-21)
7. Favicon del rayo + título "Energía limpia y sustentable" en la pestaña (sesión 20)
8. `/admin/projects` → cuenta corriente con compras separadas y selector "IVA del precio" (sesión 21; verificado en local contra caso real)

**✅ Redes sociales ingresadas** (confirmado por el usuario, 15 jun 2026): las URLs ya están cargadas en `/admin/config` (sección "Redes sociales") → los íconos aparecen en el footer.

**Pendientes (media prioridad):**
- **Rate-limit con store compartido (Upstash Redis o tabla Supabase)** — anotado en sesión 25: el limitador actual es en memoria/por-instancia (primera barrera). Pasar a un tope global solo si se ve abuso real o crece el tráfico. No urgente
- **Captura de gastos v2 — lo que QUEDA:** auto-match de ítems de la boleta vs lista de compra **+** boletas multi-ítem (van juntos: requieren que `parse-receipt` lea las líneas de la boleta + UI de aprobación tipo tabla). **Ya hechos en sesión 26:** badge de pendientes y vista de gastos generales (dentro de Finanzas). **Descartado por el usuario:** link de captura público para terceros
- ~~Comprimir fotos pesadas de proyectos~~ ✅ HECHO (sesión 29, `0a9d88b`): casa-carlos-alvarado 9 MB→677 KB, poroma-img 3,6 MB→628 KB, panaderia-san-bernardo 3 MB→820 KB
- Conteo de leads en `/admin/leads` trae todas las filas y cortaría en 1.000 (mismo límite Supabase de sesión 18); hoy no afecta, cambiar a `count` exacto cuando crezca
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

**Desarrollos sesión 32 (14 agosto 2026) — SIMULAR PARA UN CLIENTE DEL CRM + CREAR COTIZACIÓN DESDE LA SIMULACIÓN (sin commitear, SIN migración):**

Motivo: *"quiero que desde el back office yo pueda simular a un cliente ya registrado y que traiga los datos"* + *"si hago una simulación es porque quiero crear una cotización y entregarla de esa forma"*. Hasta ahora simulación y cotización estaban **desconectadas**: `createQuote()` nacía vacía y el kit recomendado no viajaba a ninguna parte, pese a que `quotes.installation_id` e `installations.simulation_data` ya existían sin usar.

- **Autocompletado de clientes en el campo de nombre (`components/simulator/ClientNameField.tsx`, `lib/simulator-prefill.ts`, `lib/db/clients.ts` → `getClientsForSimulator`):** el dato entra donde naturalmente se escribe. Escribes 2+ letras en **"Nombre completo"** (residencial) o **"Razón social / Nombre empresa"** (empresa) y aparecen los clientes que calzan por nombre, empresa o email; al elegir uno se cargan sus datos y los de su instalación (**si tiene varias, pregunta cuál**; si no tiene, usa solo los del cliente). Queda una línea "✓ {cliente} — datos cargados desde el CRM · desvincular". **Solo back-office** (la página pública no recibe la prop `clients`). El formulario guarda estado propio, así que se remonta con `key={contactKey}` al elegir cliente — sin eso los campos no se actualizaban. **Descartado un primer intento** (botón "Simular para un cliente registrado" colgado sobre el wizard, `ClientPicker.tsx`): al usuario no le gustó y se eliminó. **El consumo NO se prellena a propósito:** sale de las boletas reales, que es de donde nace la estacionalidad; `consumo_promedio_mensual_kwh` es un dato de referencia del CRM, no el promedio de 12 boletas.
- **Cliente y ficha creados al COTIZAR, no al simular:** si el nombre no corresponde a nadie del CRM, el cliente se crea recién al generar la cotización (`source: 'simulador'`) — simular no debe ensuciar el CRM, cotizar sí es un compromiso. **Regla que quedó explícita:** simulador **público** → lead (`/api/leads`, estado `new`); simulador del **back-office** → cliente (además la cotización exige `client_id`, un lead no puede sostenerla). **Dos anti-duplicados:** antes de crear el cliente se busca por **email** y luego por **nombre exacto** (por si escribió el nombre en vez de elegirlo de la lista); y antes de crear la instalación se busca entre las del cliente por **dirección** (o comuna+región) — sin esto, simular dos veces la misma casa dejaba instalaciones duplicadas. **Este segundo caso se detectó probando en el navegador**, no en revisión de código.
- **Crear cotización desde el escenario activo (`components/simulator/QuoteFromSimulation.tsx` + `createQuoteFromSimulation` en `app/admin/quotes/actions.ts`):** bloque bajo la tarjeta del kit (solo `adminMode`) con vista previa de los ítems y el total neto. Cotiza **el escenario que se está viendo** (A/B/C o empresa), sin preguntar de nuevo. **Ítems:** la planta siempre; la batería como línea aparte cuando el escenario la incluye (`systemCostCLP − kit.priceReferenceCLP`). Los precios del simulador son **netos** (el informe lo dice explícitamente), igual que `unit_price_clp`, así que la convención calza. Deja nota interna con el escenario, liga `installation_id` y archiva el resumen en `installations.simulation_data`. Si se simuló "en frío" (sin partir de una ficha), ofrece un selector de cliente **sin reiniciar el wizard**.
- **Decisión del usuario:** el kit queda como **precio único** por ahora (el rediseño del catálogo se pospuso); una cotización = un escenario (dos opciones = dos cotizaciones, porque el `QuoteEditor` suma todos los ítems en un total).
- **FIX — la simulación se perdía al cotizar (`QuoteFromSimulation.tsx`):** el botón hacía `router.push` al editor, y como el estado del wizard vive en memoria, volver obligaba a rehacer la simulación entera. **Ya no navega:** al crear, el bloque muestra `✓ COT-XXXX creada · escenario` con enlace *"Abrir cotización →"*, la simulación queda intacta y el botón pasa a *"Crear otra cotización con este escenario"* — así se puede cotizar A y luego C sin repetir nada. La acción devuelve `quoteNumber` además del id.
- **Doble confirmación del OCR eliminada (`BillOCRUpload.tsx` + `StepBills.tsx`):** el flujo pedía "Confirmar N meses" en una pantalla de revisión y después "Continuar con N meses" abajo — dos revisiones de la misma grilla. Ahora, al terminar la lectura, **los meses se vuelcan directo a la tabla de 12 meses** (donde igual se iban a corregir) y queda un solo botón. Se eliminaron la etapa `review`, su tabla y sus handlers. Resguardos: aviso *"Se cargaron N meses desde la boleta"* con **"Deshacer lectura"** (restaura la tabla previa), etiqueta **"boleta"** en cada mes que vino del OCR, y aviso ámbar si el OCR corrió en modo demo. **El usuario confirmó que no usaba la pantalla intermedia para descartar meses.**
- **Verificado en el navegador (2ª ronda):** autocompletado escribiendo "viv" → aparece David con email e instalación → al elegirlo se cargan todos sus datos (el remontaje con `key` era necesario) → se creó COT-2026-105 **sin salir del simulador**. Cotización de prueba borrada. **Pendiente de probar por el usuario: el volcado directo del OCR con una boleta real** (no había boleta a mano para subir; el cambio está verificado por compilación y lectura de código, no en ejecución).
- **Nota sobre datos:** la instalación de Danilo Canessa la reclasificó el usuario a `business` el 14 ago — por eso sus 13.890 kWh/mes **sí son coherentes** (consumo industrial), y queda descartada la alerta de "dato mal cargado" de más arriba. En la ficha de David quedaron región `metropolitana` y comuna `Pudahuel` (reales, aportados por el enriquecimiento automático); el amperaje y el consumo que se usaron en las pruebas **se borraron** por ser inventados.
- **Verificado end-to-end en Chrome con datos reales:** se eligió a David Vivanco → el wizard trajo sus datos y avisó que faltaban región y amperaje → se completó el wizard → el bloque mostró "Planta fotovoltaica 8.8 kW on-grid — 16 paneles · $6.014.118" (coincide exacto con el catálogo) → se creó **COT-2026-102** con subtotal neto $6.014.118, IVA $1.142.682, **total $7.156.800**, ligada a la instalación "Casa", con la simulación archivada. **La cotización de prueba y el resumen archivado se eliminaron después** (los datos de consumo eran inventados). `tsc`, `eslint` y `npm run build` limpios.

**Desarrollos sesión 32 (17 agosto 2026) — INFORME DE SIMULACIÓN: métricas y gráfico (sin commitear):**

Observaciones del usuario tras usar el simulador con un cliente real. Las tres se aplicaron **en el informe PDF y en la pantalla de resultados** para que digan lo mismo.

- **El "70% de cobertura solar" era un parámetro disfrazado de resultado.** `coveragePercent = autoconsumo ÷ consumo`, y sin batería el autoconsumo está topado por `dayConsumptionRatio`, que vale exactamente **0,70** → con cualquier planta grande el número se satura en 70% aunque el sistema genere el 400% del consumo. Imposible de explicar a un cliente. **Reemplazado por "Dejas de pagar X% de tu cuenta de luz anual"** (`annualBenefitCLP ÷ totalOriginalGridCostCLP`), más el nuevo KPI **"Gasto actual"** ($/año que paga hoy). Se agregaron `annualBillCLP` y `billSavingsPercent` a `FinancialSummary` (`lib/types.ts` + `lib/calculations.ts`); el dato ya existía como `totalOriginalGridCostCLP`. Ojo: con sistemas sobredimensionados llega a 100% (el beneficio supera la cuenta) — es correcto (la cuenta queda en cero) y el aviso de "Sistema sobredimensionado" explica el excedente.
- **Fuera el KPI de "Ahorro mensual".** Razón del usuario, correcta: en verano se acumulan excedentes y en invierno se gastan, así que el promedio mensual no ocurre ningún mes. Queda solo el anual.
- **Gráfico de balance energético rehecho** (`BalanceChart` en el informe y `StackedBalanceChart` en pantalla). Antes: barra = producción (autoconsumo + inyección) y la red como **línea punteada** → dos escalas distintas en el mismo gráfico. Ahora, **opción elegida por el usuario**: sobre el eje la barra es **tu consumo del mes** (autoconsumo verde + red gris) y **bajo el eje la inyección** (azul). Cada barra suma una magnitud real. El eje se reparte según el peso de cada lado con un piso de 25% abajo para que la inyección siempre se vea. Leyenda y nota explicativa nuevas; se corrigió el subtítulo "producción · en kWh" que quedaba desactualizado.
- **Verificado en el navegador** con la ficha de David: el gráfico renderiza con los tres colores en la disposición correcta y el hero muestra "Dejas de pagar". `tsc` limpio. Los 2 errores de lint que quedan (`StepResults` 834 y 939) son **previos**: caen fuera de todos los hunks del diff, verificado contra `git diff`.
- **Ajustes posteriores del usuario (18 ago):**
  - **Inyección: conserva su celeste `#2563eb` y se le agrega rayado.** (Primero se interpretó mal la instrucción "ponla en el mismo color" como "el mismo del autoconsumo" y se pasó a verde; el usuario aclaró que era **mantener el celeste que ya tenía**.) El rayado se dibuja con **rects horizontales** (helper `franjas()`), NO con `<pattern>` SVG, porque el informe se rasteriza con **html2canvas** y los patrones no renderizan de forma confiable ahí. Las leyendas de ambos gráficos ganaron variante rayada (`hatched` en `LegendItem` del informe; SVG inline en la de pantalla).
  - **Escenario destacado elegible.** Estado `featuredScenario` (null = el que calcula el motor). Bajo las pestañas hay un **botón grande de ancho completo, borde punteado azul y estrella**: "Destacar este escenario en el informe — pasa a ser el recomendado"; al aplicarlo se convierte en una barra azul de confirmación con "Volver al automático". `effectiveRecommended = featuredScenario ?? recommendedScenario` manda en los badges de las 3 pestañas, en la etiqueta de la tarjeta del kit y en el `recommendedScenario` que recibe el informe. Motivo del usuario: tras conversar con el cliente puede convenir vender otro escenario (verificado: al destacar C, su badge pasa a "Recomendado" y A pasa a "Kit mayor").
- **Nota operativa:** `npm run build` falla con `EPERM: unlink .next/...` mientras el dev server está corriendo (lock de OneDrive/Windows, ya documentado en sesión 31). No es error de código.
- **🔴 BUG ENCONTRADO Y CORREGIDO — `simulator.day_consumption_ratio` no hacía nada (18 ago):** el usuario lo cambió de 0,70 a **0,35** en `/admin/config` y la simulación no se movió. Había **tres eslabones cortados**: (1) `buildBaseInput` en `StepResults` no incluía `dayConsumptionRatio` entre los overrides que pasa al `SimulatorInput`; (2) `calcMonthlyBalance` en `lib/calculations.ts` usaba `SOLAR_DEFAULTS.dayConsumptionRatio` **hardcodeado** en vez del input; (3) la fracción nocturna era otra constante fija (0,30), así que conectar solo la diurna en 0,35 habría hecho **desaparecer el 35% del consumo** del modelo. **Arreglado:** el ratio se pasa por el input, `calcMonthlyBalance` lo recibe como parámetro y la **nocturna se deriva como `1 − diurna`** para que siempre sumen 1. También se corrigieron los dos textos "Perfil de consumo: 70%/30%" (pantalla e informe), que mostraban la constante y no el valor real. La descripción del parámetro en la BD decía **"(NO cambiar)"** — se reemplazó, porque ahora sí funciona.
- **Parámetro separado por tipo de cliente (decisión del usuario):** `simulator.day_consumption_ratio` pasó a ser **solo residencial** (hoy en **0,35**) y se creó `simulator.day_consumption_ratio_business` (**0,85** por defecto), porque en una empresa el consumo ocurre en horario de trabajo y el valor residencial la castigaba injustamente. `SimulatorConfig` ganó `dayConsumptionRatioBusiness`, `SOLAR_DEFAULTS` ganó `businessDayConsumptionRatio: 0.85`, y `buildBaseInput` elige según `state.customerCategory`. Los textos "Perfil …% diurno" de pantalla e informe ahora dicen además si es perfil **residencial** o **empresa**. Ambos parámetros son editables en `/admin/config` con descripciones que empiezan en "RESIDENCIAL:" / "EMPRESA:". **Verificado end-to-end** ejecutando el motor con la config real de la BD: mismo consumo (350 kWh/mes) y mismo kit 6,6 kW → residencial 1.464 kWh de autoconsumo y payback 6,2 años; empresa 3.576 kWh y payback 5,3 años.
- **Impacto medido** (kit 6,6 kW · 350 kWh/mes · RM), al pasar de 70/30 a 35/65: autoconsumo **2.940 → 1.464 kWh**, inyección **7.158 → 8.631 kWh**, ahorro anual **$1.434.180 → $1.272.480 (−11%)**, payback **5,5 → 6,2 años**. Baja poco en proporción porque el excedente que deja de autoconsumirse se inyecta y se paga al 50%. **Las simulaciones anteriores a este arreglo corrieron con 70% diurno**, que para residencial es optimista.
**SIMULACIONES GUARDADAS (18 ago) — construido, PENDIENTE CORRER `supabase/simulaciones.sql`:**

- **Migración `supabase/simulaciones.sql`** (idempotente): tablas **`simulations`** (una instalación puede tener muchas; guarda `fecha_simulacion` **con hora**, `fecha_boleta`, `numero_boleta`, dirección/comuna/región, el escenario destacado y sus cifras, `input_json` con el estado completo del wizard para reabrir, `quote_id` y `corrige_id`) y **`simulation_bills`** (las boletas subidas, archivadas en el bucket privado `receipts` bajo `boletas-luz/`). Migra lo que había en `installations.simulation_data` a la primera simulación de cada instalación, sin perder historial.
- **La boleta queda archivada en el CRM.** `/api/parse-bill` ahora **guarda el archivo** además de leerlo y devuelve `storagePath`; el wizard retiene esas rutas (`BillOCRUpload` → `StepBills` → `SimulatorClient` → `StepResults`) y al guardar se enlazan a la simulación. Motivo del usuario: tener datos, boletas, simulaciones, instalaciones y cotizaciones en un solo lugar y no en carpetas del computador. Si la subida falla, el OCR igual sigue.
- **OCR extendido:** `ExtractedBill` ganó `numeroBoleta` y `numeroCliente`, con instrucciones en el prompt (busca "N° Boleta", "Folio", "N° Documento", "N° Cliente", "Rol"). Antes no se extraían y sin ellos no se puede detectar una boleta repetida.
- **Botón "Guardar simulación"** (`SaveSimulation.tsx` + `app/admin/simulator/actions.ts`). **Guardar es explícito**, no automático al llegar a resultados, para que las pruebas exploratorias no ensucien el CRM. Si el cliente no existe se crea junto con su instalación (mismo anti-duplicados que la cotización: email → nombre; instalación por dirección → comuna+región); si existe, solo se agrega la simulación y se enriquece la ficha.
- **Detector de boleta repetida:** antes de guardar busca por **número de documento** y, si no hay, por **período dentro de la misma instalación**. Si encuentra, muestra un aviso ámbar con la fecha/hora y las cifras de la anterior, y ofrece **abrirla** o **guardar igual como versión nueva**. Nunca sobrescribe.
- **Pestaña "Simulaciones" en la ficha del cliente**, en el orden pedido: Información · Instalaciones · Actividades · Cotizaciones · **Simulaciones** · Proyectos. Lista cada simulación con fecha y hora, boleta de origen, instalación, kWp, ahorro y payback, con badges "Corregida"/"Cotizada" y **enlaces a las boletas archivadas** (URL firmada).
- **DECISIÓN del usuario:** corregir una simulación genera **una NUEVA con fecha y hora**, no sobrescribe.
- **PENDIENTE de esta función (no construido):** (1) **reabrir** una simulación guardada para editar el kit o corregir inputs — el `input_json` ya se guarda, falta la UI que lo cargue en el wizard; (2) al elegir un cliente que **ya tiene simulaciones**, preguntar si quiere ver/trabajar sobre una existente o partir de cero.
- **Verificado:** `tsc` limpio y `eslint` sin errores nuevos (los 2 de `StepResults` son previos). Migración **YA CORRIDA** por el usuario (el error "Could not find table 'simulations' in the schema cache" que vio era el **caché de PostgREST** desactualizado justo tras crear las tablas; se resuelve solo o con "Reload schema cache" en Settings → API).

**🔴 BUG DEL INFORME PDF + envío por correo (18 ago, corregidos):**

- **El PDF descargado no correspondía al escenario en pantalla.** Reportado por el usuario: simuló 6 kW, abrió el informe, cambió a 8 kW —la pantalla mostraba 8 kW correctamente— y el PDF descargado seguía siendo el de 6 kW. **Causa:** `PDFDownloadButton` guarda el PDF en `pdfCache` (un `useRef`) para no regenerarlo entre la descarga y el envío, pero **ese caché nunca se invalidaba**. **Arreglado:** se calcula una `firmaInforme` con el kWp, costo y batería de cada escenario más el escenario recomendado; cuando cambia, un `useEffect` vacía el caché y el PDF se regenera.
- **El informe se enviaba al cliente con solo abrir la vista previa.** `useEffect(() => { if (isOpen) sendEmail(); }, [isOpen])` — bastaba mirar el informe para que al cliente le llegara esa versión, y con el bug del caché podía irle una versión que ya no correspondía (a **Gonzalo Giacaman le llegó el informe de 6 kW** por este camino). **Cambiado a envío explícito:** botón **"✉ Enviar al cliente"** en la cabecera del modal, que pasa a "✓ Enviado al cliente"; si después cambia el contenido del informe, la firma se recalcula y **se habilita reenviar** la versión corregida. La vista previa ya no envía nada.

**🔴 HALLAZGOS EN EL CATÁLOGO DE KITS (sesión 32, 14 ago 2026 — NADA MODIFICADO, el usuario está decidiendo el enfoque):**

- **BUG DE PRECIO, afecta cotizaciones reales:** los kits **pfv-11kw ($13.200.000)** y **pfv-13.9kw ($16.680.000)** siguen en el **$1.200.000/kWp de la carga inicial**, mientras el resto se actualizó con una curva realista que baja de $2.042.017/kWp (1,1 kW) a **$631.059/kWp (10 kW)**. Resultado: del kit de 10 kW al de 11 kW **el precio se duplica por 1 kW más**. Si una simulación cae en 11 kW o más, la cotización sale al doble.
- **Desalineo panel 550 W vs 650 W:** `config_parameters` tiene `simulator.panel_wattage_wp = 650` y `simulator.panel_area_m2 = 2,7`, pero **esos valores solo se usan en `buildBusinessKit` (empresas)**. Los kits residenciales de la BD están armados con paneles de **550 W** (2 paneles = 1,1 kW) y la superficie que ve el cliente sale de `requiredSurfaceM2()` en `lib/constants.ts`, que **hardcodea las dimensiones del panel de 550 W** (2,278 × 1,134 m + 2 cm por lado = 2,721 m²/panel) e **ignora la config por completo**.
- **Causa de fondo:** el kit guarda `sizekWp` y `panelCount` como datos independientes — son la misma información dos veces, y se contradicen en cuanto cambia el panel.
- **Propuesta entregada al usuario (pendiente de decisión):** (1) un **"panel activo" configurable** (modelo, Wp, alto, ancho, margen, precio) como única fuente de verdad; (2) **el kit se define por cantidad de paneles** y el kWp/superficie se derivan → cambiar de panel actualiza el catálogo solo (con 700 W la escalera sería 2/4/6/8/10/12/15/18/21 paneles = 1,4 a 14,7 kWp); (3) **catálogo de inversores** (hoy el kit no guarda inversor en ninguna parte) con selección por **ratio DC/AC** y filtro mono/trifásico según el empalme; (4) **precio compuesto** (paneles + inversor + estructura + batería + mano de obra + margen) en vez de precio fijo por kit. **Datos que faltan del usuario:** modelo y medidas reales del panel de 700 W, catálogo de inversores con potencias y fases, y el ratio DC/AC que usa.
- **Corrección de un diagnóstico previo:** el `installationNotes` con los m² viejos NO se muestra en pantalla — los kits vienen de la BD (`products`) y `rowToKit` en `lib/db/catalog.ts` no mapea ese campo; el texto solo existe en el fallback de `constants.ts`.

**Desarrollos sesión 32 (13 agosto 2026) — REDISEÑO DEL SISTEMA DE FACTURAS ESTILO ERP (sin commitear, requiere migración):**

Motivo del usuario: *"el sistema de facturas es muy engorroso"* + *"las facturas ya no quedarán asociadas a un proyecto, porque no siempre corresponden a un proyecto ni lo que se compra son suministros, como lo hacen los otros ERP"*. Diagnóstico: las compras entraban por **3 puertas distintas** con reglas distintas, la clasificación contable se pedía al final o nunca, no había anti-duplicados (así se coló el Sodimac duplicado de la sesión 30), ventas y compras vivían en módulos separados y la conciliación de ventas solo comparaba **totales** (decía que no cuadraba, no *cuál* factura faltaba).

- **Migración única `supabase/facturas_v2.sql`** (idempotente, con bloque `DO` que no aborta si hay duplicados + consulta final que los lista): tabla `purchase_accounts`, columnas `account_id`/`origen`/`xml_path`/`detalle_json` en `expense_captures`, backfill de la clasificación existente, índice único anti-duplicados, campos de cobranza en `sales_invoices`, tabla `sales_invoice_payments`, tabla `sii_rcv_ventas_detalle`, claves `cobranza.email`/`cobranza.activa` en `config_parameters`.
- **Ingreso por XML del DTE (`lib/dte.ts`, dep. nueva `fast-xml-parser`):** arrastras uno o varios XML → lee RUT, folio, fecha, neto/exento, IVA, total y las líneas de detalle **sin OCR**. Soporta el sobre `EnvioDTE`/`EnvioBOLETA` con varios documentos y el DTE suelto. Normaliza el folio sin ceros a la izquierda (el XML trae `0004521`, el RCV `4521` → si no, la conciliación no cruzaba). Detecta si el emisor somos nosotros → avisa que es una venta. **Probado con un sobre de 2 documentos** (factura + nota de crédito).
- **Plan de cuentas editable (`lib/db/accounts.ts` + `purchase_accounts`):** 15 cuentas iniciales en 3 grupos que son lo único que el balance mira — `costo_giro` → Costo de ventas, `gasto_admin` → Gastos de administración, `activo_fijo` → Activos (no es gasto). **Memoria por proveedor:** la segunda factura de un proveedor viene ya clasificada con la cuenta que usó la anterior. Clasificación en **un clic desde el listado** (`<select>` inline, sin abrir nada).
- **El proyecto dejó de pedirse al ingresar.** Pasa a ser **centro de costo opcional**: se vincula después desde la ficha del proyecto (`components/admin/LinkInvoicesPanel.tsx` + acciones `linkInvoicesToProject`/`unlinkInvoiceFromProject`/`getUnlinkedInvoices`), y eso crea la compra espejo en la cuenta corriente. Los proyectos conservan margen y cuenta corriente.
- **Módulo único `/admin/facturas`** con pestañas **Compras · Ventas · Cobranza · Conciliación SII**. `/admin/facturas-venta` y `/admin/conciliacion` **redirigen** (enlaces guardados siguen sirviendo). En el menú: **📄 Facturas** (badge = sin clasificar) y **🧾 Capturar boleta** (`/admin/gastos`, el flujo del celular, badge = pendientes). Se eliminó el botón "+ Gasto general" (su función quedó en el ingreso manual de Facturas) → de 3 puertas a 2.
- **Estado de pago + cobranza (`lib/cobranza.ts`, `/api/cron/cobranza`):** compromiso por condición (contado/15/30/60/90/manual), **pagos parciales** con % pagado y barra de progreso; si la factura tiene proyecto el pago entra **también** a su cuenta corriente (enlazado por `project_payment_id`, sin doble conteo). Correo **consolidado** con el azul de marca: 3 días antes, el día del vencimiento y cada 7 días mientras quede saldo. El escalón se guarda en la factura (`cobranza_nivel` + `cobranza_ultimo_envio`) **en vez de depender de que el cron corra todos los días** → si se salta un día el aviso sale igual al siguiente. Segundo cron en `vercel.json` (12:30 UTC) + respaldo `.github/workflows/cron-cobranza.yml`. **Verificado con 15 casos** (incluido el cron saltado, la factura abonada al 40% y la pausada).
- **Conciliación de ventas documento por documento:** el parser ya leía el CSV de **detalle** pero solo lo agregaba; ahora además guarda cada documento en `sii_rcv_ventas_detalle` y se cruza por folio contra `sales_invoices` con el mismo semáforo 🟢🔴🟠🟡. **Veredicto del mes** arriba de todo: *"✅ Todo cuadra"* o la lista exacta de problemas. **Fixes de paso:** las compras se cruzan contra **todas** las aprobadas (antes solo `tipo='factura'`, y eso dejaba fuera las notas de crédito), el folio se compara normalizado, y las notas de crédito de la app restan el IVA como en el RCV.
- **Balance y Finanzas alimentados por la clasificación:** el balance muestra **Compras por cuenta** con los 3 grupos y el detalle por cuenta, más un aviso si queda algo sin clasificar; el activo fijo ya no sale del flag `activo_fijo` sino del grupo de la cuenta. El desglose de Finanzas agrupa por cuenta (con respaldo al campo legado `categoria`).
- **HALLAZGO — 13 facturas duplicadas en producción:** al correr la migración, el índice anti-duplicados no se pudo crear porque los datos ya traían **8 grupos repetidos (21 filas donde debían ser 8)**: Universidad de Chile folio 1294599 ×4, Sodimac ×3 y ×2, Entel ×3, Jumpseller ×3, Max Service ×2, Voltingeniería ×2, Banco de Chile ×2. **Causa raíz encontrada:** `getConciliacion` busca las facturas de la app **dentro del mes** (`fecha` entre desde/hasta), así que una registrada con `fecha` nula o fuera del período aparecía siempre como "falta en app" y `registrarTodasGenerales` la reinsertaba en cada corrida. **Arreglado en código:** ahora se contrastan contra TODA la tabla antes de insertar (y se informa cuántas se omitieron), y el alta individual valida duplicado. **Limpieza — YA EJECUTADA y verificada (0 duplicados):** dos archivos, `supabase/facturas_v2_duplicados.sql` (solo revisa, seguro de correr entero) y `supabase/facturas_v2_duplicados_aplicar.sql` (borra 13 copias dejando 8, + crea el índice, + verifica). Se confirmó fila por fila que los montos eran idénticos dentro de cada grupo, y los `created_at` mostraron 5 corridas del "registrar todas" entre las 18:26 y 18:31 del 1 jul. **Impacto:** el F29 y el costo total del balance NO se vieron afectados (leen el RCV del SII); sí se infló el P&L de caja de Finanzas y el desglose por cuenta, que ahora quedaron correctos.
- **Lecciones del editor SQL de Supabase** (para futuras migraciones): (1) `config_parameters.value` es **JSONB** → los textos van como `to_jsonb('…'::text)`, no como literal suelto; (2) **no sirven las tablas auxiliares entre sentencias** de un mismo script — ni `TEMP` (el pool de conexiones las pierde) ni normales (el editor planifica todo el script antes de ejecutar la primera sentencia) → lo que dependa de un paso previo debe ir en **una sola sentencia con CTEs**.
- **Dato a corregir detectado de paso:** la factura de la Universidad de Chile (folio 1294599, $39.960) tiene `neto 0` e `iva 0` — probablemente exenta mal cargada. Como el desglose por cuenta usa el neto, aparece en $0. No afecta al F29. Corregible desde la pestaña Compras.
- **BUG ENCONTRADO Y CORREGIDO EN LA VERIFICACIÓN POR CHROME (`lib/db/sii.ts`):** la conciliación **derivaba el IVA del total** (÷1,19) en vez de usar el IVA declarado del documento, así que en las facturas **exentas** inventaba crédito. Se detectó con la factura de la Universidad de Chile (total $39.960, IVA real $0): la conciliación le asignaba $6.380 y el crédito de la app no calzaba con la pestaña Compras ($541.057 vs $534.677). `ivaFromCapture` ahora usa el `iva` guardado cuando existe y solo lo deriva si falta; se agregó `iva` al `select`. Verificado en la UI: ambas vistas marcan $534.677.
- **Verificado end-to-end en la UI (Chrome, sesión real de Danilo, `localhost:3000`):** el módulo carga; junio muestra **8 documentos · neto $2.814.093 · IVA crédito $534.677** (sin los duplicados); la **clasificación en un clic persiste** (Banco de Chile → Comisiones bancarias, confirmado tras recargar); el **veredicto** de la conciliación funciona y avisa correctamente que junio no tiene RCV cargado; **Cobranza** lista la factura 21 de Sociedad de Inversiones Aleol SpA ($6.553.121, 0% pagado, sin compromiso) con el panel de compromiso + registro de pago operativo.
- **PENDIENTE DEL USUARIO (datos, no código):** (1) **reclasificar las facturas de junio** — el backfill las dejó todas en "Materiales y equipos" y varias no lo son (Entel → Servicios básicos, Jumpseller → Oficina, Voltingeniería → Subcontratos, etc.); (2) **corregir el neto de la factura de la Universidad de Chile** (folio 1294599: total $39.960 con neto e IVA en 0 → si es exenta, neto $39.960 e IVA $0); (3) **cargar el compromiso de pago de la factura de Aleol**; (4) el badge de origen dice "OCR" en las facturas que en realidad vinieron del RCV (cosmético: `origen` quedó en su valor por defecto 'foto' en el backfill).
- **Verificado:** `tsc --noEmit` limpio, `eslint` limpio, `npm run build` OK (53 páginas). **Migración `facturas_v2.sql` YA CORRIDA en Supabase**, duplicados limpiados e índice anti-duplicados creado. **Nada commiteado ni desplegado.**

**Desarrollos sesión 31 (8-14 julio 2026) — REDISEÑO DEL SIMULADOR + informe con logo + nuevo proyecto (TODO DESPLEGADO):** Commits `46c2cec`, `feb123e`, `8fa6d0d` pusheados a `main`. **Al pushear se subió también el módulo F29 de la sesión 30 que estaba sin pushear** → F29 ahora en producción. **Sin migraciones nuevas** (solo motor/UI). Verificado end-to-end por CDP en el simulador (público y `/admin/simulator` con sesión de Danilo).

- **Motor — consumo real por mes (`46c2cec`):** `SimulatorInput.monthlyConsumptionByMonth`; `runSimulation` usa el consumo real de cada boleta (+ estimación estacional de los meses faltantes) en vez del promedio → la línea de consumo ya no es plana y mejoran cobertura/ahorro/payback mes a mes. Con PFV existente base "total" descuenta la producción de la planta existente mes a mes. `StepResults` arma el mapa por mes (base y con equipos proyectados).
- **Flujo más corto:** se eliminó el paso **"Revisión"** (`bill-review`) → wizard de 7 a **6 pasos** (`StepBillReview.tsx` quedó sin uso); se quitó la solicitud de **tarifa residencial** (BT1 por defecto, `StepSupply`); se eliminó la sección de **análisis tarifario** en boletas (`StepBills`), que además tenía el bug de validación del monto por `step=1000` (el caso de David Vivanco daba "valores entre 120.000 y 121.000").
- **Resultados:** el hero muestra **ahorro ANUAL** (antes mensual, que confundía). Escenario **C** rediseñado (se mantienen A/B/C): elige la **planta** (recomendada/económica), **selector de kW en modo interno** (`adminMode`, override de la planta principal; la "más económica" pasa a ser el **escalón de catálogo inmediatamente inferior**, o se oculta en el mínimo — helpers `closestNoBatteryKit` / `nextSmallerNoBatteryKit`), **controles segmentados** tipo iOS para módulos/reserva, y **opción 0% de reserva**. Nuevos gráficos **"Generación vs consumo mensual"** (columnas ámbar + línea de consumo, con los kW) y **"Balance energético mensual"** (barras apiladas autoconsumo+inyección + línea de red), con la tabla numérica **colapsable**. **Superficie necesaria** calculada con las dimensiones reales del panel (2,278 × 1,134 m, 550 W) + **2 cm por lado** (`requiredSurfaceM2` en `constants.ts`), en la tarjeta, el lead y el informe. Copy **"Con equipos nuevos" → "Con equipos proyectados"**.
- **Informe PDF (`SimulationReportHtml`, `46c2cec` + ajustes):** **logo de marca** (`mercadoenergy-blanco.png`) en la cabecera, que pasó de **negro a azul/navy** (degradado); se quitó el texto azul superior "PFV máxima (sin batería)" y el "Simulador Solar · Chile"; incorpora los **dos gráficos nuevos** con los kW en el título. Ojo: al abrir "Mostrar informe" se dispara el envío del PDF por correo al cliente (por eso se probó con cuidado).
- **Proyectos (web, `feb123e`):** nuevo proyecto **"Planta fotovoltaica residencial on-grid"** — PFV 8 kW on-grid en **Las Condes** con foto comprimida (`proyecto-las-condes-8kw.jpg`, 960×1280, 176 KB) + marcador en el mapa de Chile.
- **Superficie / 0% reserva / copy (`8fa6d0d`):** los tres ajustes finales del simulador (ver arriba).
- **Nota operativa:** en Windows/OneDrive el `npm run build` a veces falla con `EPERM: unlink .next/...` (lock de archivo); se resuelve con `taskkill //F //IM node.exe` + `rm -rf .next` + rebuild.

**Desarrollos sesión 30 (21-24 junio 2026) — MÓDULO TRIBUTARIO F29 + balance anual (DESPLEGADO en sesión 31; 8 migraciones ya corridas):**

Contribuyente: **BIZNEXUS GROUP SPA, RUT 77.958.683-9**, Régimen **Pro PyME 14D N°3**. Archivos del contador en `OneDrive/Documentos/01_BIZNEXUS/Facturas/` (carpetas `2026/2026MM/` con RCV CSV + certificados F29; `2025 - final/` con el balance de 8 columnas de referencia).

- **Validación previa del P&L de caja (`1876a13` + 2 fixes de datos en Supabase):** se reprodujo el P&L de caja contra datos reales. Se corrigió: comisión **Transbank $99.151** estaba como gasto de proyecto huérfano → se pasó a **gasto general categoría "Comisiones"**; **duplicado Sodimac $50.897** eliminado. Mayo caja quedó −$3.241.390. Commit: al **aprobar un gasto sin proyecto** ahora se elige categoría (antes caía en "Sin categoría") + categoría "Comisiones" agregada a `GENERAL_EXPENSE_CATEGORIES`.
- **Fase A — Facturas de venta (`5bd571b`, migr. `sales_invoices.sql`):** `/admin/facturas-venta` — registrar factura de venta (débito IVA) a mano, prellenada desde proyecto, o subiendo el PDF del SII con OCR (`/api/parse-receipt`). Tabla `sales_invoices` (tipo/folio/fecha/neto/iva/total, estado emitida/anulada, documento en bucket `receipts/ventas/`).
- **Fase B — Planilla F29 mensual (`6d2090d`, migr. `f29_periods.sql`):** pestaña "F29 (IVA)" en `/admin/finanzas` junto a "Caja". Renglones con código del SII. Campos manuales por mes en `f29_periods` (remanente 504, PPM 563/115/062, retención 151, reajustes 92/93). **OJO: luego (Conciliación) el crédito/débito pasaron a salir del RCV, no de project_purchases.**
- **Fase C — Ciclo anticipo→factura (`2df6e5e`, migr. `anticipo_factura_cycle.sql`):** `project_purchases` ganó `settles_anticipo_id` + `absorbs_anticipo`. Al registrar una factura se indica si salda un anticipo y si **lo absorbe** (el monto ya lo incluye → no se cuenta dos veces en caja) o es adicional. F29: anticipos no dan crédito; la factura da el crédito completo en su mes.
- **Conciliación SII (`6ae247d`, `5a53bb3`, migr. `sii_rcv.sql`):** `/admin/conciliacion` — sube los CSV `RCV_COMPRA`/`RCV_VENTA` del SII (parser separador `;`, 3 formatos: compras detalle, ventas resumen, ventas detalle). Cruza por **RUT+folio** contra la app (gastos + ventas) con semáforo: 🟢 calza / 🔴 falta en app / 🟠 no está en SII (crédito que el SII pudo omitir) / 🟡 monto distinto. **El F29 ahora lee crédito/débito del RCV** (cuadra exacto con el SII); respaldo a la app si no se importó.
- **Registrar gasto general + activo fijo (`6acd8ad`, migr. `gasto_activo_fijo.sql`):** desde la conciliación, las facturas 🔴 se registran como **gasto general** en un clic, pre-llenadas del RCV (sin tipear), con **categoría** + casilla **activo fijo** + imagen opcional. "Registrar todas las que faltan" en bloque. Activo fijo se descuenta de costos y va a Activos (1.1.05) en el balance.
- **Verificación del remanente + F29 oficial + fix NC (`c7972bf`, migr. `f29_oficial.sql`):** **FIX:** las notas de crédito recibidas (tipo 61) en el RCV de compras ahora RESTAN (antes sumaban — enero pasó de $157.998 a $142.578 = código 511 exacto). Tabla `f29_oficial` guarda los códigos del certificado de cada mes. **Verificación encadenada:** si el 504 declarado ≠ el 77 del mes previo (tolerancia de reajuste), el F29 muestra **alarma roja** — el SII a veces no arrastra el remanente. **Flagueó marzo 2026** ($7.006 que febrero, que pagó IVA, no dejó → revisar con contador).
- **Fase D — Balance anual / pre-balance (`c426cf7`, `42708fc`, migr. `balance_anual.sql`):** `/admin/balance` — estado de resultado (ingresos − costos − honorarios desde el RCV), IVA/PPM acumulados, **cuadratura** (Activo = Pasivo + Patrimonio, caja como residual), detalle por mes, **registro de honorarios (BHE)**. Saldos de apertura (`balance_config`: capital/aportes/pérdida acumulada) **editables y marcados "por confirmar con contador"** — no se dieron por buenos a ciegas (el usuario dudaba de aportes $2.370.803 y pérdida acum $3.016.500 calculados por una sesión previa; capital $1.000.000 sí confirmado).
- **Export a Excel (`a7399bd`, dep nueva `exceljs`):** botón en el balance → `/api/admin/balance/export` genera `.xlsx` (estado de resultado + cuadratura + detalle mensual + honorarios) para el contador.
- **Datos 2026 cargados en Supabase (punto de partida):** RCV ene–may (compras+ventas) importado y corregido (NC restan); F29 oficial ene–may cargado (certificados). Pre-balance 2026 ene–may: ingresos $2.184.005 · costos $2.692.361 · resultado del giro −$508.356 · IVA débito $414.961 · crédito $511.550. Junio aún no declarado (sin RCV).
- **Decisiones del usuario:** ventas con **factura** (emite); anticipos **solo a proveedores**; el F29 se alimenta del **RCV del SII**, no de costos de proyecto; la conciliación es **bidireccional** (también detecta crédito que el SII omite y remanente no arrastrado). Ver memoria [[f29-reconciliacion-real]].

**Desarrollos sesión 28 (17 junio 2026) — "Atención a" + RUT en cotización (desplegado) + simulador con PFV existente (en revisión):**

- **"Atención a" en clientes + RUT/atención en el PDF de cotización (commit `d47e8e1`, migración `supabase/cliente_atencion_rut_cotizacion.sql` — ya ejecutada; verificado por el usuario):** `clients.atencion_a` (contacto de la empresa que solicitó la cotización) en el modal de nuevo cliente y en la ficha (lectura/edición); al convertir un lead de empresa se autocompleta con el `contact_name` del lead. En `quotes` se snapshotean `client_rut` y `client_atencion` al crear la cotización (igual que nombre/email/teléfono), editables en el `QuoteEditor`. El **PDF** muestra bajo "Cotización para": nombre → **RUT** → **"Atención: [persona]"** → email/teléfono (decisión del usuario: empresa + RUT + atención). Archivos: `lib/types.ts`, `app/admin/clients/actions.ts`, `components/admin/ClientsManager.tsx`, `ClientDetail.tsx`, `app/admin/quotes/actions.ts`, `QuoteEditor.tsx`, `lib/pdf/QuotePDF.tsx`.
- **Simulador — lógica de PFV existente (IMPLEMENTADO, SIN COMMITEAR, en revisión del usuario; sin migración):** antes el wizard capturaba "ya tengo paneles" + kWp pero el **motor lo ignoraba**. Ahora:
  - **Pregunta de base de consumo** (`StepBills`, solo si `hasExistingSolar`): ¿el consumo ingresado es el de la **boleta de la compañía** (importación de red) o el **consumo total** (red + lo que produce su PFV)? Se guarda en `consumptionProfile.consumptionBasis` (`'grid' | 'total'`).
  - **Saldo de empalme** (`StepResults`): `headroom = empalme − PFV existente`. La planta nueva se dimensiona contra ese saldo y contra el **consumo residual** (base "total" → se descuenta la producción estimada de la PFV existente = kWp × producción regional ÷ 12; base "grid" → el consumo ingresado tal cual). Reutiliza el motor intacto: solo se ajustan `empalmeMaxKW`→saldo y `monthlyConsumptionKWh`→residual en `buildBaseInput`.
  - **Bifurcación:** saldo **< 1 kWp** (`MIN_HEADROOM_KWP`) → **"a tope"** → tarjeta de **revisión/mantención** + CTA "Quiero que me contacten" (lead con `maintenanceRequest: true`, simulación en cero para no romper `/api/leads`). Con saldo → resultados normales + banner "Propuesta para complementar tu PFV existente (~X kW disponibles)".
  - Aplica a **residencial y empresa**. **Verificado en la UI por CDP:** amp 10 + 3 kWp → mantención; amp 40 + 3 kWp → complemento "~5.8 kW". `tsc` y build limpios.

**Desarrollos sesión 27 (16 junio 2026) — Correo diario de licitaciones + preview de boletas en gastos + extrapolación estacional del consumo (commits `d244580`, `f77608d`, `1ca96d7`; sin migraciones):**

- **Correo diario de licitaciones / heartbeat (commit `d244580`, `lib/mercadopublico.ts`):** el cron ahora envía un correo **todos los días**, no solo cuando hay nuevas. Si hay licitaciones nuevas → el correo de siempre con el detalle. Si no → un correo *"Sin licitaciones nuevas hoy"* que confirma que la sincronización corrió (muestra fecha + cuántas publicaciones revisó). Así el usuario sabe que el sistema sigue vivo: **si un día no llega correo, esa es la señal de falla.** Se extrajo `getActiveRecipients()` (reusado) y se agregó `notifyNoNewTenders()`. El disparador de prueba ahora acepta **`?test=heartbeat`** para forzar el correo de "sin novedades" (admin-only); `?test=1` sigue enviando la muestra de nuevas. La lógica de detección y el horario del cron (08:00 Chile) no cambiaron.
- **Preview de PDF + lightbox en la revisión de gastos (commit `f77608d`, `components/admin/GastosManager.tsx`):** la revisión solo mostraba la boleta con `<img>`, que no renderiza PDFs (los archivos pueden subirse en PDF). Ahora: PDFs se muestran incrustados en `<iframe>` (modal) y con ícono 📄 en la tarjeta; enlace "abrir en pestaña nueva" para imagen y PDF; y un botón **"⛶ Ampliar"** que abre un lightbox a pantalla completa — con zoom (clic) en imágenes y visor nativo en PDF, cierre con × / clic fuera / Esc. Detección por extensión del `image_path`. Sin cambios de backend (el `signedUrl` sirve para ambos).
- **Extrapolación estacional del consumo residencial (commit `1ca96d7`):** reemplaza el relleno de meses faltantes por **promedio de vecinos** por una **extrapolación estacional** basada en el perfil nacional BT1 (modelo del usuario en `modelo-estacionalidad.md`). Coeficientes relativos (media = 1, peak invierno jul/ago, valle mar/dic) en `SEASONAL_COEFFICIENTS` (`lib/constants.ts`). Función pura `extrapolateSeasonalKWh()` (`lib/consumption.ts`): `mediaAnual = promedio(Cₘ / coef[m])` sobre los meses conocidos, y cada faltante = `round(mediaAnual × coef[mes])`. **Solo aplica a residencial y funciona desde 1 mes** (antes el relleno requería ≥2); **empresa mantiene el promedio de vecinos** (`buildProfile` ramifica con `isBusinessCustomer`, pasado desde `SimulatorClient`). **kWh o $ funciona igual:** la conversión $→kWh ocurre antes, la estacionalidad opera sobre kWh. Solo cambia el relleno de faltantes — `averageMonthlyKWh` (lo que usa el motor) y todo el cálculo aguas abajo intactos; los meses ingresados se conservan exactos y los faltantes quedan `source: 'interpolated'`. Verificado con el ejemplo del modelo (abril=390 → media 408 · julio 466 · dic 370 · total ≈4.890 · peak julio).
- **Coherencia del Paso de revisión con la estacionalidad (commit `9e64c54`, `StepBills.tsx` + `StepBillReview.tsx`):** al rellenar **siempre** los 12 meses en residencial, el Paso de revisión mostraba stats y copy desalineados. Detectado al **verificar en la UI real** (Chrome headless por CDP, wizard residencial completo con 1 mes) y corregido: (1) `peakMonthKWh`/`minMonthKWh` ahora se calculan sobre los **12 meses** (reales + estimados), no solo reales — son **display-only**, el motor no los usa, así que la simulación no cambia (antes "Mes más alto/bajo" daba 390/390 con 1 mes; ahora 466/370); (2) el contador **"Meses ingresados"** usa los meses con dato real (`N/12`), no `bills.length` (antes mostraba "12/12"); (3) el aviso ámbar roto ("Tienes 0 mes sin datos / promedio plano") se reemplazó por una **nota informativa azul** "Estimamos N meses…"; el ámbar solo aparece si quedan meses sin dato **ni** estimación (caso borde empresa); (4) en el gráfico, el mes de mayor consumo se resalta en **azul aunque sea estimado** (julio), para que la leyenda "Mes de mayor consumo" no quede huérfana. Re-verificado en la UI: alto 466 · bajo 370 · 1/12 · nota azul · julio azul, abril verde (real).
- **Incidente del cron + respaldo por GitHub Actions + hardening del heartbeat (commit `cdf14a9`):** el 16 jun el correo diario **no llegó en la mañana**. Diagnóstico: el código/pipeline estaba **sano** (corrida real local: `revisadas 1608, calzaron 5, nuevas 5, emailEnviado true` — había 5 licitaciones nuevas sin registrar) → la falla fue que **el cron de Vercel no se disparó**. Causa de fondo: **el proyecto está en plan Hobby**, donde el cron es "best-effort" con **ventana flexible de 1 h** y se puede saltar (lo confirma la propia UI de Vercel → Settings → Cron Jobs). Acciones:
  - **Respaldo `.github/workflows/cron-licitaciones.yml`:** GitHub Action que cada día a las **12:00 UTC** (08:00 Chile, igual que `vercel.json`) hace `curl` a `https://www.mercadoenergy.cl/api/cron/tenders` con `Authorization: Bearer ${{ secrets.CRON_SECRET }}`. Independiente de Vercel; el dedup del servidor evita duplicados si ambos corren. Falla **roja** en Actions si el endpoint no devuelve 200 (señal extra). Tiene `workflow_dispatch` para disparo manual. **Verificado por el usuario: "Run workflow" verde + correo recibido.**
  - **`CRON_SECRET` ROTADO (16 jun):** el valor antiguo en Vercel estaba marcado **"Sensitive"** → no se podía leer/copiar. Se generó uno **nuevo** y se puso idéntico en **Vercel (Production, requirió redeploy)** y en el **secreto de repo de GitHub** (`Settings → Secrets and variables → Actions`, nombre `CRON_SECRET`). El `.env.local` tiene otro valor distinto (solo pruebas locales). El valor viejo quedó invalidado.
  - **Hueco de keywords tapado (`lib/mercadopublico.ts`):** si `tender_keywords` falla o vuelve vacía, `syncTenders` ahora **igual envía un heartbeat** (con aviso ámbar destacado) en vez de retornar sin correo → "no llega correo" sigue significando "el cron no corrió", no "corrió pero falló en silencio". Además, si la API de Mercado Público no respondió en ninguna fecha, el heartbeat avisa que el "0 publicaciones" es por caída, no por ausencia de nuevas. `notifyNoNewTenders()` ahora acepta un `warning` opcional.
- **Pendientes del usuario resueltos (confirmados 15 jun):** PWA reinstalada desde el dominio nuevo y funcionando; URLs de redes sociales ingresadas en `/admin/config` (íconos visibles en el footer).

**Desarrollos sesión 26 (12 junio 2026) — v2 de gastos: módulo de Finanzas (P&L) + gastos generales con categoría + badge (commits `33ab4b6`, `5828c67` + migración `supabase/finanzas_gastos_generales.sql`):**

- **Badge de gastos pendientes (commit `33ab4b6`):** contador junto a "Gastos" en el sidebar. `app/admin/layout.tsx` llama `countPendingExpenses()` y lo pasa por `AdminShell` → `AdminSidebar` (prop `pendingExpenses` + `badge` en `NavItem`).
- **Módulo de Finanzas (`/admin/finanzas`, commit `5828c67`):** Estado de Resultados en **BASE CAJA**, por mes: **Ventas (cobrado) − Gastos de proyectos − Gastos generales = Resultado**. Decisiones del usuario: ventas = **pagos recibidos** (`project_payments`), base **caja**, montos en **neto** con toggle a **con-IVA**. Navegación por mes + desglose de gastos generales por categoría. `lib/db/finanzas.ts` consolida `project_payments` + `project_purchases` + `project_costs` + `expense_captures` (sin proyecto); cada fuente entrega su par {conIva, neto} respetando el flag `con_iva` (pagos = con IVA por regla del negocio).
- **Gastos generales "como tal" (commit `5828c67`):** migración `supabase/finanzas_gastos_generales.sql` (campo `categoria` + `image_path` nullable, para registrar gastos sin foto como arriendo/sueldos). Botón **"+ Gasto general"** en `/admin/gastos` (`GeneralExpenseButton`) → modal: monto, categoría (Arriendo/Sueldos/Servicios/…), ¿incluye IVA?, fecha, proveedor y **foto opcional**. Acción `createGeneralExpense` (estado `aprobado` directo, `sin_proyecto=true`). Categorías en `GENERAL_EXPENSE_CATEGORIES` (`lib/db/expenses.ts`).
- **Pendiente de validación:** el usuario revisa el P&L con datos reales (mañana). Si los números no calzan (IVA, qué cuenta como venta), se afina.
- **Pendiente v2 que QUEDA:** auto-match de ítems + boletas multi-ítem (juntos; mejora de `parse-receipt` para leer líneas + UI de aprobación). Link público de captura: descartado por el usuario.

**Desarrollos sesión 25 (12 junio 2026) — Seguridad del back-office + contraste móvil (commits `ed03406`, `dd84b23`, `29a98af`):**

- **Fix de contraste en móvil (commit `ed03406`):** `app/globals.css` tenía el bloque `@media (prefers-color-scheme: dark)` heredado de la plantilla → con el modo oscuro del sistema el texto se volvía casi blanco sobre fondos claros (inputs ilegibles en el celular). Se quitó el dark mode (la app es **light-only**), se declaró `color-scheme: light` y se fijó `color` en `input/textarea/select`. Arregla TODOS los formularios de una.
- **Auditoría de seguridad — lo que ya estaba bien:** contraseñas con bcrypt (cost 12), JWT HS256 con expiración + cookie `httpOnly`/`secure`/`sameSite=lax`, reset token con expiración (1h) y sin reuso, forgot-password sin enumeración de usuarios, OCR/PDF-cotizaciones/cron todos autovalidan sesión. **Ojo:** `proxy.ts` solo protege `/admin/:path*`, NO `/api/*` → cada API debe autovalidar.
- **Hardening (commit `dd84b23`):**
  - **Sesión 7 días → 12 h** (JWT exp + cookie maxAge en `/api/admin/login`). Decisión del usuario: 12h fijas (no por inactividad).
  - **`/api/send-report` era un RELAY DE CORREO ABIERTO** (sin auth: enviaba a cualquier email con cualquier PDF desde el dominio verificado) → rate-limit 5/h por IP + validación de email + tope de tamaño del PDF (~5 MB).
  - **Rate-limit** anti fuerza-bruta en login (10 / 15 min por IP) y en formularios (contacto 10/h, forgot-password 5/h, leads 30/h). Helper `lib/rate-limit.ts` — **en memoria, por instancia** (primera barrera, no tope global).
- **Política de contraseñas (commit `29a98af`):** `lib/password.ts` → `validatePassword` (mín. 8 + 1 mayúscula + 1 carácter especial), aplicada **server-side** en crear usuario, reset por admin y reset por email, + ayuda en pantalla. Aplica a contraseñas nuevas; las existentes siguen válidas hasta que se cambien.
- **Pendiente anotado (NO urgente):** rate-limit con **store compartido (Upstash Redis o tabla Supabase)** para tope global multi-instancia — hoy el límite es por-instancia. Hacerlo solo si se ve abuso real en logs o el sitio escala. Upstash vía Vercel Marketplace (~30-45 min, plan gratis); requiere volver el limitador `async` (await en los 6 call sites).

**Desarrollos sesión 24 (9 junio 2026) — Flujo de captura de gastos: boletas de compra con OCR y bandeja de aprobación (commits `2aad819`, `874fc1a` + migración `supabase/expense_captures.sql`):**

- **Modelo:** tabla `expense_captures` (la bandeja) + bucket privado de Storage `receipts` (ambos creados en la misma migración). Cada boleta vive con su estado (`pendiente`/`aprobado`/`rechazado`), datos de la boleta (proveedor, rut, tipo, folio, fecha, neto, iva, total, `con_iva`) y `project_id` **nullable** (NULL = sin proyecto / gasto general de la empresa). Trazabilidad: `captured_by`, `reviewed_by`, `reviewed_at`, `purchase_id`, `ocr_status`, `ocr_json`
- **Captura ≠ clasificación:** la captura es tonta (foto + proyecto opcional + nota); el **OCR corre al revisar**, no al capturar → se mantiene interno (admin) y el link de captura podrá abrirse a terceros más adelante sin exponerlo
- **OCR nuevo `app/api/parse-receipt/route.ts`:** extractor para **boletas/facturas de compra chilenas** (emisor: razón social + RUT, tipo, folio, fecha, neto, IVA, total, si el total incluye IVA). Admin-only, Opus 4.8 (override `OCR_MODEL`), mock sin API key. Acepta archivo directo **o** una ruta del Storage (para la revisión). Es DISTINTO de `/api/parse-bill` (boletas de luz)
- **`lib/db/expenses.ts`:** tipo `ExpenseCapture` + lecturas (`getExpenseCaptures`, `getExpenseCapture`, `countPendingExpenses`) + Storage (`uploadReceiptImage`, `getReceiptSignedUrl` con URL firmada 1 h). Bucket **privado**, todo server-side con la service role, sin políticas RLS
- **Captura (`/admin/gastos/capturar` + `CaptureExpenseForm`):** dos botones **"Tomar foto"** (`<input capture="environment">`) y **"Elegir de galería"** (`accept image/*,application/pdf`). Selector de proyecto con 3 opciones: "Decidir al revisar", "Sin proyecto (gasto general)", o un proyecto vigente. Permite cargar varias seguidas
- **Bandeja (`/admin/gastos` + `GastosManager`):** grilla de tarjetas filtrable por estado, con miniatura (URL firmada). Al abrir una: modal con la imagen, botón **"Procesar OCR"** (llama a `/api/parse-receipt`, rellena y persiste vía `saveExpenseCapture`), campos editables, selector de proyecto + ítem (cargado on-demand con `getProjectItemsForExpense`), toggle "el total incluye IVA", y **Aprobar / Rechazar / Eliminar**
- **Aprobar (`app/admin/gastos/actions.ts`):** **con proyecto** → inserta un `project_purchase` (cantidad 1, precio = total, `con_iva` del toggle) que entra a la cuenta corriente del proyecto + enlaza `purchase_id`; **sin proyecto** → queda `aprobado` con `sin_proyecto=true` (no toca ninguna obra). Eliminar borra también la imagen del Storage. Aprobación **abierta** (cualquier usuario con sesión, no solo admin — decisión del usuario)
- **`lib/auth.ts`:** nuevo `getAdminUser()` (payload del JWT) para `captured_by`/`reviewed_by`. Ítem **🧾 Gastos** agregado al `AdminSidebar`
- **Enlace "ver boleta" desde el proyecto (commit `874fc1a`):** se cruza `expense_captures.purchase_id` con las compras del proyecto (en `app/admin/projects/[id]/page.tsx`, prop `receiptUrls`) y se muestra un 📎 a la imagen (URL firmada) en las filas de compras (por ítem y sin ítem) y en los movimientos de la cuenta corriente. Sin cambios de esquema; solo aparece en compras nacidas de un gasto capturado
- **Verificado:** `tsc` limpio + build OK; el usuario ejecutó la migración en Supabase. **Probado end-to-end desde el celular: captura → OCR real → aprobación.**
- **OCR activado en producción (post-deploy, sesión 24):** el OCR (gastos y boletas de luz) corría en **modo demo** porque `ANTHROPIC_API_KEY` nunca había estado en Vercel. Se creó la key en Anthropic, se cargó en Vercel (Production) y en `.env.local`, y se **eliminó el proyecto Vercel duplicado `me`** (incompleto) dejando solo `mercado-energy`. Se agregó un aviso en la UI cuando el OCR está en modo demo (commit `7b13f3b`) y compresión de la foto en el navegador antes de subir, para no exceder el límite de los Server Actions (commit `ddeac02`). También: botón Cancelar en la captura (`e805448`) y texto oscuro en los campos para contraste en móvil (`f82531b`)
- **Cambio de dominio a `www.mercadoenergy.cl` EN VIVO (commit `5b4d522`):** DNS editado en HostGator (apex A `216.198.79.1`, www CNAME `81ad3f5d52b0cd8b.vercel-dns-017.com`), correo Titan preservado, 301 del `.vercel.app` al dominio, 301 del sitio viejo activas. Ver detalle en "próximo paso" arriba. Pendiente del usuario: Search Console + Bing + sitemap, reinstalar PWA
- **Correos por dominio propio (commits `b2cd0b1`, `3b1c61f`):** remitente de los 6 envíos → `notificaciones@send.mercadoenergy.cl` (dominio verificado en Resend; el sandbox solo entregaba al dueño de la cuenta → los correos a clientes fallaban en silencio). Buzón receptor de contactos/leads → `ventas@mercadoenergy.cl` (Titan): correo público del sitio actualizado en 10 lugares + `LEAD_RECIPIENT_EMAIL` en Vercel y `.env.local`. Ver detalle en "próximo paso" arriba
- **Fix logout + prueba de correo de licitaciones (commit `448c598`):** el logout (`/api/admin/logout`) redirigía a `http://localhost:3000/admin/login` porque usaba `NEXT_PUBLIC_BASE_URL` (no seteada en prod) → ahora usa `request.nextUrl` (host real, funciona en cualquier dominio). Disparador de prueba **`/api/cron/tenders?test=1`** (admin-only): envía un correo con las últimas 3 licitaciones por el camino real, para verificar el envío sin esperar nuevas — **la lógica diaria NO cambió** (sigue avisando solo cuando hay licitaciones nuevas, por decisión del usuario). Ambos verificados por el usuario
- **Pendiente v2:** auto-match de ítems de la boleta vs lista de compra; boletas multi-ítem; link de captura público/tokenizado para terceros; badge de pendientes + notificación; vista de gastos generales

**Desarrollos sesión 23 (9 junio 2026) — Redirecciones 301 del sitio antiguo, PWA (app móvil) y backoffice responsive (commits `c0bb683`, `3c21cfc`, `9088990`, `360a378`):**

- **Redirecciones 301 del sitio antiguo (`next.config.ts`, commit `c0bb683`):** se navegó el sitemap del sitio actual (`www.mercadoenergy.cl`, 154 URLs, era una tienda e-commerce). Función `redirects()` con `statusCode: 301` literal (no `permanent: true`, que en Next.js emite 308 — la doc en `node_modules/next/dist/docs` lo confirma):
  - Institucionales 1:1: `/nosostros`→`/nosotros`, `/contact`→`/contacto`, `/servicios`→`/soluciones`, `/terminos-y-condiciones`→`/terminos`, `/politica-de-privacidad`→`/privacidad`, `/politica-de-reembolso`→`/devoluciones`, `/forma-de-pago`→`/net-billing`, `/blog` y `/entrada-del-blog`→`/`
  - ~145 fichas de producto (solar, climatización, calefont/termos, piscinas, accesorios) → `/soluciones` con reglas de prefijo/comodín por categoría (decisión del usuario: catch-all a `/soluciones`)
  - Verificado con dev server real (curl): todas devuelven 301 al destino correcto; las páginas propias siguen en 200. **Se activan cuando el dominio nuevo sirva este proyecto**
- **PWA instalable — Fase 1 de la app móvil (commits `c0bb683` + `3c21cfc` ícono):**
  - `app/manifest.ts` (convención Next 16): `name "Mercado Energy"`, `short_name "me"`, `start_url /admin`, `scope /`, `display standalone`, `theme_color #1d65c5`
  - `public/sw.js` (service worker mínimo, sin offline aún) + `components/ServiceWorkerRegister.tsx` (registro en cliente, montado en `app/layout.tsx`). Headers de `/sw.js` (content-type + no-cache) y `viewport.themeColor` en el layout raíz
  - Íconos generados con `sharp` desde el logo (rayo + círculo + "me"): `public/icons/icon-192/512/maskable-512.png` + `app/apple-icon.png`
  - **Backoffice con drawer móvil:** `components/admin/AdminShell.tsx` (nuevo) — en escritorio el sidebar es fijo (igual que antes); en móvil es un drawer off-canvas con barra superior + hamburguesa, se cierra al navegar. `AdminSidebar` ganó prop `onNavigate` + altura completa. `app/admin/layout.tsx` ahora usa `AdminShell`
  - **Push notifications**: pendiente para Fase 3 (sumar listeners `push`/`notificationclick` al SW + VAPID). **Se evita Serwist** (offline) porque requiere webpack y el proyecto usa Turbopack
- **Backoffice responsive Fase 2 — tablas a tarjetas (commit `9088990` listas, `360a378` detalle):**
  - Patrón: tabla en escritorio (`hidden md:table`) + tarjetas apiladas en móvil (`md:hidden`), compartiendo estado y handlers. **Listas:** Proyectos (`ProjectsTable`), Cotizaciones (`QuotesTable`), Leads (con `StatusSelect` + drawer `LeadDetail`), Productos (`ProductsManager`, sidebar de categorías → `<select>` en móvil), Clientes (`ClientsManager`), Config (`ConfigTable`, edición inline conservada), Usuarios (`UsersManager`)
  - **Detalle:** `ProjectDetail` — sus 8 tablas financieras (ítems, compras por ítem, compras sin ítem, factura multi-ítem, costos, pagos, cuenta corriente, cotización original) envueltas en scroll horizontal con ancho mínimo (mejor que tarjetas para grillas de comparación por columna) + padding lateral reducido en móvil. `LeadCRM` — barra de tabs con scroll horizontal. `QuoteEditor` — layout de 2 columnas se apila en móvil, panel a ancho completo (la tabla ya tenía scroll). Licitaciones — solo padding (ya usaba tarjetas). El **dashboard ya era responsive** (grids + listas tipo tarjeta)
  - Verificado: `tsc --noEmit` limpio + `npm run build` OK en cada tramo. Prueba visual del admin autenticado queda pendiente en dispositivo (no hay sesión admin por terminal)
- **Feature de captura de gastos — DISEÑADO, sin construir (decisiones del usuario para retomar):**
  - **Hallazgo clave:** el OCR actual (`/api/parse-bill`, Opus 4.8) es solo para **boletas de electricidad** (distribuidora, tarifa, gráfico 13 meses). Para gastos hay que crear un extractor nuevo (`/api/parse-receipt`) para **boletas/facturas de compra** (proveedor, RUT, folio, fecha, neto, IVA, total), reusando la infraestructura existente (auth interno, Anthropic, imagen/PDF)
  - **Entrada:** cámara **o** galería (`<input capture>` / selección de archivo) — la foto puede llegar por WhatsApp de un tercero no familiarizado con el sistema
  - **Arquitectura acordada:** separar **captura** (cualquiera: foto + proyecto, baja fricción) de **clasificación** (admin completa proyecto/ítem/IVA y aprueba) → bandeja "gastos por revisar". **Link de captura en el CRM desde el inicio** (el usuario sumará otro usuario pronto). La **aprobación no queda amarrada solo al admin** (que otra persona pueda aprobar; nada burocrático). Más adelante: sección de **usuarios con perfiles/roles**
  - **Flujo:** imagen → OCR automático → seleccionar proyecto → ítem único o de la lista de compra → confirmar datos pre-llenados → guardar (`addProjectPurchase`, ya soporta el selector Neto/Incluye IVA de la sesión 21). Mapea a `project_purchases` (existente). **v2:** auto-match de ítems de la boleta contra la lista de compra del proyecto; boletas multi-ítem en una pasada

**Desarrollos sesión 22 (7 junio 2026) — SEO para cambio de dominio, optimizaciones y ajustes de UI (commits `f01d144`, `aed56a4`, `13d9491`, `0677673`, `13c1a99`):**

- **SEO completo (preparación cambio de dominio a `www.mercadoenergy.cl`, commit `13c1a99`):**
  - `lib/seo.ts`: constantes `SITE_URL`/`SITE_NAME`/`OG_IMAGE` + helper `pageMetadata({title, description, path})` que arma título, descripción, canónica, Open Graph y Twitter card
  - `app/layout.tsx`: `metadataBase`, plantilla de títulos `%s — Mercado Energy`, robots index, OG/Twitter por defecto y **JSON-LD `LocalBusiness`** con datos reales (Biznexus Group SpA, Miguel León Prado 134 Santiago, tel +56 9 6654 6276, email)
  - `app/robots.ts`: permite público, bloquea `/admin` `/lab` `/api`, apunta al sitemap + host
  - `app/sitemap.ts`: 10 páginas públicas con prioridades
  - Metadata propia por página (home, simulador, soluciones, proyectos, nosotros, contacto, net-billing y las 3 legales). Las legales y net-billing migradas al helper (antes tenían el sufijo hardcodeado → con la plantilla se duplicaba)
  - `noindex` en `/admin` (layout) y `/lab/bill-parser`
  - **Imagen OG** `public/og-image.jpg` (1200×630, 141 KB): foto del proyecto Poroma + capa oscura + logo blanco, generada con System.Drawing
  - Verificado en local: robots.txt, sitemap.xml, títulos con plantilla, canónicas, OG, Twitter y JSON-LD correctos
- **Optimizaciones de rendimiento (commits `f01d144`, `aed56a4`):**
  - **Video del hero 4K → 1080p** (`video-poroma.mp4`): 41 MB → 14 MB (−66%), sin audio, faststart, con ffmpeg (instalado vía winget). Calidad visualmente idéntica al 65% de opacidad
  - `/admin/leads`: 5 consultas secuenciales a Supabase → 1 `Promise.all`
  - Dashboard admin: consulta de usuarios integrada al `Promise.all` existente
  - Eliminado `console.log` de debug en formulario de costos de proyectos
  - Eliminado `components/SimulatorResults.tsx` (componente legacy sin imports)
- **Ajustes de UI (commits `13d9491`, `0677673`):**
  - Botón WhatsApp más destacado: halo verde pulsante cada 2s (`animate-ping`, respeta reduced-motion), 56→64px, sombra intensa + anillo blanco
  - net-billing y páginas legales: logo a versión blanca (`mercadoenergy-blanco.png`) sobre el nav negro, tamaño al doble (h-10 → h-20)
  - Footer: enlaces Soluciones/Proyectos/Quiénes somos/Contacto apuntaban a anclas rotas (`#soluciones`, etc.) de secciones que dejaron de estar en el home en sesión 17 → ahora `Link` a las páginas reales
  - Hero: eliminado "— sin compromiso"; ContactSection: eliminado "Visita técnica gratuita, sin compromiso."
  - Simulador Paso 1: título "¿Quién eres?" → "¿Qué proyecto quieres simular?"
  - Menos espacio entre secciones: home (HowItWorks↔ValueProposition 14rem→8rem) y /nosotros (AboutUs↔"Nuestro propósito" 13rem→7rem)
  - Menos espacio bajo "Última actualización" en páginas legales
  - Páginas `/soluciones` `/proyectos` `/nosotros` `/contacto` ya existían como independientes desde sesión 17

**Desarrollos sesión 21 (6 junio 2026) — IVA por compra en cuenta corriente y WhatsApp destacado (commits `48f92f9`, `aa3e1a7`):**

- **Bug reportado (proyecto "Instalación aire acondicionado"):** 3 compras ($168.067 / $3.047.535 / $373.433 netos) aparecían como 2 líneas en la cuenta corriente y el subtotal daba $4.270.952 en vez de $4.200.000. Causas: (1) compras sin folio se fusionaban entre sí (llave de agrupación caía en "Sin proveedor-Sin folio-fecha"); (2) el sistema aplicaba ×1.19 a TODAS las compras, sin forma de indicar que un monto ya incluía IVA
- **Campo `con_iva` en `project_purchases`** (`supabase/project_purchases_con_iva.sql`, ejecutado): `false` = neto (se aplica ×1.19, comportamiento histórico), `true` = el monto ya incluye IVA. Tipo `ProjectPurchase` actualizado
- **Agrupación corregida en cuenta corriente:** solo se agrupan compras que comparten **folio real** (misma factura); sin folio, cada compra es su propia línea
- **Selector "IVA del precio"** (Neto s/IVA / Incluye IVA) en `PurchaseForm` y `PurchaseEditForm`, con etiquetas dinámicas de precio/total. Badge ámbar "c/IVA" en las filas de compras con IVA incluido
- **Botón "Editar" en compras asignadas a ítems** (antes solo se podían eliminar; `PurchaseEditForm` ganó prop `colSpan` para reuso en ambas tablas)
- **Coherencia neto vs neto:** la tabla de compras por ítem ahora compara montos netos contra el costo cotizado (antes el footer mezclaba comprado c/IVA vs costo neto). Helpers `purchaseConIva()` / `purchaseSinIva()` usados en `totalComprado`, `compradoSinIva` y cuenta corriente
- `addProjectPurchase`/`updateProjectPurchase` leen `con_iva` del form; `importCostsAsPurchases` y compra masiva insertan `con_iva: false` (costos de catálogo son netos)
- Eliminados los `console.log` de debug de la cuenta corriente (quedaban de la sesión 14)
- **Verificado por el usuario con el caso real:** las 3 compras aparecen separadas y el subtotal da $4.200.000 ✓
- **Botón WhatsApp más destacado** (`WhatsAppButton.tsx`): halo verde pulsante cada 2s (`animate-ping`, respeta reduced-motion), tamaño 56→64px, sombra más intensa + anillo blanco para contraste sobre fondos oscuros

**Desarrollos sesión 20 (6 junio 2026) — Botón WhatsApp, redes sociales parametrizables y branding (commit `1ed376d`):**

- **Botón flotante de WhatsApp** (`components/landing/WhatsAppButton.tsx`, async Server Component): click-to-chat gratuito vía `wa.me` (sin API de pago), fijo abajo a la derecha, verde oficial #25d366, hover expande etiqueta "¿Conversemos?". Montado en las 6 páginas públicas (home, /soluciones, /proyectos, /nosotros, /contacto, /net-billing) — NO en simulador ni admin
- **Parámetros de texto en `/admin/config`:** columna `value` de `config_parameters` convertida de NUMERIC a **JSONB** (`supabase/whatsapp_config.sql`, ejecutado — los 15 parámetros numéricos se preservaron). Nuevas categorías:
  - **WhatsApp**: `whatsapp.number` (configurado: 56966546276) y `whatsapp.default_message`. Validación server-side del número (solo dígitos 8–15, sin "+")
  - **Redes sociales**: `social.instagram/facebook/youtube/tiktok` (`supabase/social_config.sql`, ejecutado vía API). URL completa o vacío = red oculta en el footer. ⚠️ Seed vacío — falta que el usuario llene las URLs
- `updateConfigParam` (`app/admin/config/actions.ts`): acepta texto para categorías `whatsapp`/`social`, revalida la landing (`revalidatePath('/', 'layout')`) al guardar — los cambios se reflejan sin redeploy. `ConfigTable` renderiza input de texto ancho para esas categorías (`TEXT_CATEGORIES`)
- **Helpers DB** (`lib/db/config.ts`): `getWhatsAppConfig()` y `getSocialConfig()` con fallback graceful
- **Teléfono en contacto:** +56 9 6654 6276 con `IconPhone` nuevo, bajo "Oficina" en `ContactSection` (link `tel:`)
- **Redes sociales en el footer:** fila de íconos (`IconInstagram/Facebook/YouTube/TikTok` en `icons.tsx`, glifos rellenos) bajo el email — solo se muestran las que tienen URL configurada
- **Marca Solis** agregada al banner de marcas (`public/images/brands/solis.png`, `wordmark: true`)
- **Branding:** favicon nuevo del rayo (`app/icon.png` cuadrado 656×656 + `app/favicon.ico` regenerado — ojo: favicon.ico tiene prioridad sobre icon.png). Título de pestaña → "Mercado Energy — Energía limpia y sustentable". Navbar del home (variante transparent) → logo blanco completo `mercadoenergy-blanco.png` (h-24/28); páginas internas mantienen `logotipo.png` (h-16/20, agrandado). Footer → monograma blanco `me-blanco.png` (h-36) directo sobre el negro, sin el cuadro blanco. Header del simulador → logo h-16/20
- **Limpieza:** eliminado `temp_create_quote.sql` (INSERT de prueba con placeholders, sin valor)

**Desarrollos sesión 19 (5 junio 2026) — Licitaciones de Mercado Público:**

- **Integración con la API pública de ChileCompra** (`api.mercadopublico.cl`): autenticación por ticket gratuito. La API no soporta búsqueda por keyword → se listan las publicaciones por día y se filtran localmente. Ticket definitivo solicitado y configurado (`MERCADO_PUBLICO_TICKET` en local y Vercel; fallback al ticket de prueba público en desarrollo)
- **`lib/mercadopublico.ts`**: cliente API (listado por fecha, detalle por código, retry ante inestabilidad, rate limit ~1 req/s) + `syncTenders()`: revisa hoy y ayer, filtra solo licitaciones con cierre futuro, match por keywords (sin acentos/mayúsculas) sobre nombre + descripción, inserta nuevas, notifica por email
- **Tablas Supabase** (`supabase/tenders.sql`, ejecutado): `tenders` (PK codigo_externo, estado_interno con pipeline nueva/vista/interesa/descartada/postulada), `tender_keywords` (24 seed parametrizables), `tender_recipients` (correos de notificación, seed danilo.canessa@gmail.com)
- **`/admin/licitaciones`** (`TendersManager.tsx`): lista con link a la ficha de Mercado Público, organismo/región, monto, cierre con cuenta regresiva (rojo ≤3 días), chips de keywords que calzaron, pipeline con botones (Me interesa/Postulada/Descartar/Restaurar), filtros por estado, "Marcar todas como vistas", editor de keywords y de correos de notificación (chips toggle/eliminar/agregar, errores de duplicado amigables)
- **Cron diario** (`vercel.json` → `/api/cron/tenders`, 12:00 UTC = 08:00 Chile): protegido con `CRON_SECRET` (Vercel lo envía como Bearer) o sesión admin; `maxDuration 300`
- **Email vía Resend** a todos los correos activos de `tender_recipients` (fallback `LEAD_RECIPIENT_EMAIL`): solo cuando hay licitaciones nuevas, con nombre/organismo/cierre/keywords/link
- **Probado end-to-end con la API real**: 2.435 publicaciones revisadas → 21 sincronizadas → email recibido. Con el ticket definitivo: mismas 8 abiertas, 0 duplicados (dedup correcto). Se eliminaron 13 ya cerradas tras agregar el filtro de cierre futuro

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
- **Config actualizada por el usuario en `/admin/config`:** panel 550 Wp → **650 Wp**, área 2,5 → **2,7 m²**. Solo afecta dimensionamiento de **empresas** (`buildBusinessKit`); los kits residenciales tienen specs propios en `products` (siguen en base 550 Wp — decisión consciente, no se regeneró el catálogo). **Superado en la sesión 34:** los kits residenciales ahora derivan su potencia del panel asignado en `solar_panels` (hoy Astroenergy 700 W), no de esta config. `panelWattageWp`/`panelAreaM2` de `/admin/config` quedan aplicando **solo a empresas**

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
| BD | Supabase (leads + config_parameters + products + tenders) |
| Auth admin | Cookie `admin_token` vs `ADMIN_SECRET` + middleware |
| Licitaciones | API Mercado Público / ChileCompra (`lib/mercadopublico.ts`, ticket en `MERCADO_PUBLICO_TICKET`) + Vercel Cron diario |

**Nota importante:** Tailwind v4 usa `@import "tailwindcss"` en lugar de directivas `@tailwind`. No mezclar con la sintaxis de v3.

**Nota importante Vercel:** `new Resend(...)` y lectura de `process.env.ANTHROPIC_API_KEY` deben hacerse **dentro del handler** (no a nivel módulo), o el build de Vercel falla porque las variables no están disponibles en tiempo de evaluación del módulo.

---

## Arquitectura

```
mercado-energy/
├── app/
│   ├── layout.tsx                  # (sesión 22) metadataBase, plantilla de títulos, OG/Twitter, robots, JSON-LD LocalBusiness; font Geist, lang="es"
│   ├── robots.ts                   # (sesión 22) robots.txt: público indexable, bloquea /admin /lab /api, apunta al sitemap
│   ├── sitemap.ts                  # (sesión 22) sitemap.xml: 10 páginas públicas con prioridades
│   ├── page.tsx                    # Home (acortado sesión 17): Hero, HowItWorks, ValueProposition, Brands, ContactSection, Footer + metadata SEO
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
│   │   ├── licitaciones/           # (sesión 19) Licitaciones Mercado Público: lista + pipeline + keywords + correos
│   │   └── simulator/page.tsx      # (sesión 18) Simulador embebido en el backoffice: <SimulatorClient ocrEnabled embedded>
│   ├── lab/
│   │   └── bill-parser/page.tsx    # Laboratorio experimental de OCR
│   └── api/
│       ├── leads/route.ts          # POST: recibe lead, envía email via Resend
│       ├── contact/route.ts        # POST: formulario de contacto landing (Resend)
│       ├── parse-bill/route.ts     # POST: imagen/PDF/Excel → JSON via Claude Opus 4.8 (requiere sesión admin)
│       ├── cron/tenders/route.ts   # (sesión 19) GET: sincronización diaria de licitaciones (CRON_SECRET o admin)
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
│   │   ├── ContactSection.tsx      # Formulario de contacto, prop showEyebrow (home + /contacto) + email/oficina/teléfono
│   │   ├── WhatsAppButton.tsx      # (sesión 20) Botón flotante WhatsApp (async, lee número/mensaje de config_parameters)
│   │   ├── Footer.tsx              # (async) Footer: monograma me-blanco, redes sociales desde config, mapa, pagos, legal
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
    ├── seo.ts                      # (sesión 22) SITE_URL/SITE_NAME/OG_IMAGE + helper pageMetadata() para metadata por página
    ├── auth.ts                     # (sesión 18) isAdminAuthenticated(): valida JWT de cookie admin_token (server-side)
    ├── mercadopublico.ts           # (sesión 19) Cliente API ChileCompra + syncTenders() + email de notificación
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

> ⚠️ La tabla de abajo es el **estado real en Supabase al 23 ago 2026** (sesión 34).
> Desde esa sesión **los kWp y los m² NO se escriben**: se derivan de `paneles ×
> potencia del panel` y de las medidas del panel asignado. Lo único editable en las
> specs de un kit es la cantidad de paneles. El respaldo en código (`KIT_CATALOG` en
> `lib/constants.ts`) solo se usa si la base no responde, y tiene precios distintos.

**Panel en uso:** Astroenergy **700 W** — 2384 × 1303 × 33 mm, 38 kg.
Se administra en `/admin/paneles` (tabla `solar_panels` + `products.panel_id`).
El panel de 550 W se eliminó del catálogo; si vuelve a haber stock, se re-crea ahí.

### Sin batería
| ID | Nombre comercial | Paneles | kWp reales | m² | Precio ref. |
|---|---|---|---|---|---|
| pfv-1.1kw  | 1.1 kW  | 2  | **1.4**  | 7  | $2.246.219 |
| pfv-2.2kw  | 2.2 kW  | 3  | 2.1      | 10 | $2.287.815 |
| pfv-3.3kw  | 3.3 kW  | 5  | 3.5      | 16 | $3.078.151 |
| pfv-5.5kw  | 5.5 kW  | 8  | 5.6      | 26 | $4.445.319 |
| pfv-6.6kw  | 6.6 kW  | 9  | 6.3      | 29 | $5.609.411 |
| pfv-8.8kw  | 8.8 kW  | 12 | **8.4**  | 39 | $6.014.118 |
| pfv-10kw   | 10 kW   | 14 | 9.8      | 46 | $6.310.588 |
| pfv-11kw   | 11 kW   | 15 | **10.5** | 49 | $13.000.000 |
| pfv-13.9kw | 13.9 kW | 20 | 14.0     | 65 | $16.900.000 |

### Con batería
| ID | Nombre comercial | Paneles | kWp reales | m² | Precio ref. |
|---|---|---|---|---|---|
| pfv-2.2kw-battery | 2.2 kW | 3  | 2.1      | 10 | $3.671.910 |
| pfv-3.3kw-battery | 3.3 kW | 5  | 3.5      | 16 | $6.138.352 |
| pfv-5.5kw-battery | 5.5 kW | 8  | 5.6      | 26 | $6.908.000 |
| pfv-8.8kw-battery | 8.8 kW | 12 | **8.4**  | 39 | $8.250.000 |
| pfv-11kw-battery  | 11 kW  | 15 | **10.5** | 49 | $13.703.300 |

En **negrita** los kits cuyo nombre comercial difiere de lo real en más de 0,25 kW:
el informe los muestra como *PFV 8,8 kW (8,4 kW)*. El resto es redondeo comercial y
no se muestra.

**Precio:** `base_price_clp` se **recalcula al guardar** como `costo_proveedor_clp ×
(1 + margen_pct/100)`. Editar cualquier campo de un kit reescribe su precio; si el
costo del proveedor está mal, el precio se corrompe en silencio.

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
- `from: 'Mercado Energy <notificaciones@send.mercadoenergy.cl>'` (dominio verificado en Resend desde sesión 24; antes era el sandbox `onboarding@resend.dev`)
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

## Licitaciones — Mercado Público (ChileCompra)

**Operativo end-to-end desde sesión 19.** Detecta licitaciones del Estado que calzan con los servicios de Mercado Energy y notifica por email.

```
Cron diario 08:00 Chile (vercel.json → /api/cron/tenders)
  → syncTenders() en lib/mercadopublico.ts
    → Lista publicaciones de hoy y ayer (API ChileCompra, ticket en MERCADO_PUBLICO_TICKET)
    → Filtra: solo cierre futuro + match con tender_keywords (sin acentos/mayúsculas)
    → Trae detalle solo de las que calzan (rate limit ~1 req/s, retry ante inestabilidad)
    → Inserta nuevas en tabla tenders (dedup por codigo_externo)
    → Email vía Resend a tender_recipients activos (fallback LEAD_RECIPIENT_EMAIL)
  → Gestión en /admin/licitaciones: pipeline (nueva/vista/interesa/descartada/postulada),
    keywords y correos parametrizables (chips toggle/eliminar/agregar)
```

**Claves:**
- La API no soporta búsqueda por keyword → filtrado local. Ficha pública: `mercadopublico.cl/fichaLicitacion.html?idLicitacion=CODIGO`
- Tablas: `tenders`, `tender_keywords` (24 seed), `tender_recipients` — SQL en `supabase/tenders.sql`
- Env vars: `MERCADO_PUBLICO_TICKET` (definitivo, cargado en Vercel y local), `CRON_SECRET` (Vercel lo envía como Bearer al cron)
- Sincronización manual: botón "Sincronizar ahora" en la página (server action) o GET al cron con sesión admin

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
