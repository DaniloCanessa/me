# Mercado Energy — Contexto del Proyecto

> Última actualización: 18 de abril 2026
> Repositorio: https://github.com/DaniloCanessa/me
> Producción: https://me-fawn-eight.vercel.app

---

## Objetivo del proyecto

Plataforma web de simulación solar fotovoltaica para Chile. Permite a personas naturales y empresas estimar el ahorro, el kit recomendado y el retorno de inversión de un sistema solar, en base a sus boletas reales y región geográfica.

El flujo termina con una solicitud de contacto que deriva el lead a un especialista para visita técnica.

---

## Estado actual

**Fase 3 en progreso.**

El wizard de 7 pasos está completamente funcional. Incluye: lectura OCR de boletas (múltiples archivos), captura de leads por email, lógica de 3 escenarios de kit, baterías modulares, toggle base/futuro en resultados, gráfico de líneas mensual, exportación de informe PDF e interpolación estacional de meses faltantes.

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
| PDF | @react-pdf/renderer v4 (`SimulationPDF.tsx`) |
| BD | Sin backend — todo client-side (Supabase pendiente) |

**Nota importante:** Tailwind v4 usa `@import "tailwindcss"` en lugar de directivas `@tailwind`. No mezclar con la sintaxis de v3.

**Nota importante Vercel:** `new Resend(...)` y lectura de `process.env.ANTHROPIC_API_KEY` deben hacerse **dentro del handler** (no a nivel módulo), o el build de Vercel falla porque las variables no están disponibles en tiempo de evaluación del módulo.

---

## Arquitectura

```
mercado-energy/
├── app/
│   ├── layout.tsx                  # Metadata global, font Geist, lang="es"
│   ├── page.tsx                    # Landing page con hero y CTA a /simulator
│   ├── simulator/
│   │   └── page.tsx                # Contenedor del wizard (WizardState, navegación)
│   ├── lab/
│   │   └── bill-parser/page.tsx    # Laboratorio experimental de OCR (ruta /lab/bill-parser)
│   └── api/
│       ├── leads/route.ts          # POST: recibe lead, envía email via Resend
│       └── parse-bill/route.ts     # POST: recibe imagen/PDF, devuelve JSON via Claude Haiku
│
├── components/
│   ├── lab/
│   │   └── BillParser.tsx          # UI standalone del lab OCR
│   └── simulator/
│       ├── StepCustomerType.tsx    # Paso 1: persona natural / empresa
│       ├── StepContact.tsx         # Paso 2: datos de contacto (región obligatoria)
│       ├── StepSupply.tsx          # Paso 3: tipo propiedad, amperaje del empalme, solar existente
│       ├── StepBills.tsx           # Paso 4: ingreso de boletas + OCR + distribuidora/tarifa manual
│       ├── BillOCRUpload.tsx       # Sub-componente: upload múltiple, revisión y confirmación de boleta
│       ├── StepBillReview.tsx      # Paso 5: revisión visual (gráfico 12 meses, kWh sobre cada barra)
│       ├── StepFutureConsumption.tsx # Paso 6: AA, termo, auto eléctrico
│       ├── StepResults.tsx         # Paso 7: 3 escenarios, toggle base/futuro, CTA, PDF
│       ├── SimulationPDF.tsx       # Documento PDF (@react-pdf/renderer)
│       └── PDFDownloadButton.tsx   # Botón de descarga con dynamic import (sin SSR)
│   └── ui/
│       └── ProgressBar.tsx         # Barra de progreso de 7 pasos
│
└── lib/
    ├── types.ts                    # Todas las interfaces TypeScript
    ├── constants.ts                # Parámetros configurables (kits, tarifas, defaults, baterías)
    ├── regions.ts                  # 16 regiones de Chile con producción mensual kWh/kWp
    ├── calculations.ts             # Motor: runSimulation, calcThreeScenarios, selectKits
    ├── consumption.ts              # Cálculos de consumo futuro (AA, termo, EV)
    └── format.ts                   # Formateo de valores (CLP, kWh, %, payback)
```

---

## Wizard — 7 pasos

### Paso 1 — Tipo de cliente (`StepCustomerType`)
- Selección: **Persona natural** (casa/departamento) o **Empresa** (oficina/colegio/otro)
- Avance automático al seleccionar

### Paso 2 — Contacto (`StepContact`)
- **Persona natural:** nombre, email, teléfono, dirección, ciudad, comuna, región
- **Empresa:** razón social, contacto, email, teléfono, dirección, ciudad, comuna, región
- Región **obligatoria** — determina la producción solar en la simulación

### Paso 3 — Suministro (`StepSupply`)
- Tipo de propiedad (filtrado por categoría de cliente)
- **Amperaje del empalme** (obligatorio) — botones 10 / 15 / 20 / 25 / 32 / 40 / 50 / 63 A
  - Limita el tamaño máximo de la planta solar (`empalmeMaxKW = amperajeA × 220 / 1000`)
  - SVG ilustrativo de referencia para ubicar el número en el tablero eléctrico
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
- **Gráfico de barras CSS con los 12 meses:** meses reales en verde, interpolados en gris
  - kWh mostrado encima de **todas** las barras (máxima en verde bold, resto en gris)
- Tabla detallada: mes, kWh, monto CLP, $/kWh calculado
- Avisos contextuales: precio promedio calculado, meses faltantes

### Paso 6 — Consumos futuros (`StepFutureConsumption`)
- **Aire acondicionado:** steppers por tamaño BTU (9.000 / 12.000 / 18.000)
- **Termo eléctrico:** steppers de ocupantes → calcula capacidad y kWh/mes
- **Auto eléctrico:** cantidad de autos → estima +33% de consumo por auto
- Resumen en vivo: consumo actual vs. proyectado
- **Las baterías ya NO se seleccionan aquí** — se configuran en el paso 7 (Escenario C)

### Paso 7 — Resultados (`StepResults`)
- **Toggle consumo actual / con equipos nuevos** (cuando hay adiciones en paso 6)
  - Recalcula los 3 escenarios con el kWh correspondiente a cada modo
  - Funciona tanto para personas naturales como empresas
- **3 escenarios de kit** (solo residencial — ver sección de lógica de kits)
- KPIs, kit recomendado, desglose financiero, tabla de balance mensual
- **Gráfico de líneas SVG** debajo de la tabla: producción, autoconsumo, inyección, red (12 meses)
- **Recomendación de tarifa:**
  - `unknown` → pedir que confirme tarifa en boleta
  - `BT4.x` / `AT` → recomendar batería para gestión de horas de punta
- **Análisis EV:** recomendación día/noche/mixto calculada con el balance energético real
- Impacto ambiental: CO₂ evitado y equivalencia en árboles
- **CTA:** "Coordina una reunión con nuestro equipo técnico" → POST `/api/leads` → email via Resend
- **Exportar PDF:** botón "Descargar informe PDF" genera informe completo del escenario activo

---

## Lógica de kits — 3 escenarios (residencial)

### Principio fundamental
Siempre se recomienda el kit de **mayor tamaño que cabe dentro del límite del empalme**. Este es el escenario base (A). Nunca se sub-dimensiona por defecto.

### Cálculo del límite de empalme
```
empalmeMaxKW = amperajeA × 220 / 1000

Ejemplo: 40 A → 8.8 kW → kit máximo = 8 kWp
```

### Función `selectKits(empalmeMaxKW)` en `lib/calculations.ts`
- **kitA:** kit más grande cuyo `sizekWp ≤ empalmeMaxKW`. Es siempre el recomendado principal.
- **kitB:** kit inmediatamente inferior a kitA en el catálogo (opción económica). Es `null` si kitA ya es el kit más pequeño.

### Escenario A — Kit máximo, sin batería
- Kit: `kitA`
- Batería: 0 kWh
- Precio: `kitA.priceReferenceCLP`
- Label en UI: "Recomendado"

### Escenario B — Kit menor, sin batería
- Kit: `kitB` (un escalón abajo de kitA)
- Batería: 0 kWh
- Precio: `kitB.priceReferenceCLP`
- Label en UI: "Opción económica"
- Solo se muestra si `kitB !== null`

### Escenario C — Kit máximo con baterías
- Kit: `kitA` (mismo que escenario A)
- Batería: `N × 5 kWh` donde N ∈ {1, 2, 3, 4, 5, 6} — selector en la UI
- Precio: `kitA.priceReferenceCLP + N × 1.500.000 CLP`
- Label en UI: "Con baterías"
- El selector de N aparece solo cuando el tab C está activo

### Función `calcThreeScenarios(input, batteryCount)` en `lib/calculations.ts`
```typescript
// Retorna:
{
  A: SimulatorResult,       // kitA sin batería
  B: SimulatorResult | null, // kitB sin batería (null si no existe)
  C: SimulatorResult,       // kitA con N baterías
  kitA: SolarKit,
  kitB: SolarKit | null,
}
```

---

## Lógica de baterías

### Parámetros clave (en `lib/constants.ts`)
```typescript
SOLAR_DEFAULTS.batteryUsableFraction        = 0.70  // 70% disponible para uso nocturno
SOLAR_DEFAULTS.batteryModuleKWh             = 5     // kWh por módulo de batería
SOLAR_DEFAULTS.batteryModulePriceCLP        = 1_500_000  // CLP por módulo
SOLAR_DEFAULTS.batteryDailyCycleEfficiency  = 0.80  // eficiencia ida+vuelta del ciclo
```

### Modelo de carga y descarga (por mes en `calcMonthlyBalance`)
```
capacidad_usable_diaria  = batteryCapacityKWh × 0.70
reserva_emergencia       = batteryCapacityKWh × 0.30  // nunca se descarga

máx_carga_mensual  = (capacidad_usable_diaria / eficiencia) × días_del_mes
máx_descarga_mensual = capacidad_usable_diaria × eficiencia × días_del_mes

carga_batería   = min(excedente_solar, máx_carga_mensual)
descarga_batería = min(
  carga_batería × eficiencia,
  máx_descarga_mensual,
  consumo_nocturno  ← la batería no puede descargar más de lo que se consume de noche
)
```

### Regla del 30% de reserva
La batería **nunca se descarga más allá del 70% de su capacidad**. El 30% restante se reserva para cortes de luz y emergencias. Este parámetro es configurable en `SOLAR_DEFAULTS.batteryUsableFraction` para ajustarlo en el futuro sin cambiar la lógica.

### Flujo energético con batería
```
Día (producción solar disponible):
  autoconsumo = min(producción, consumo_diurno)
  excedente   = producción - autoconsumo
  carga_batería = min(excedente, máx_carga_mensual)
  inyección   = excedente - carga_batería

Noche (sin producción solar):
  descarga_batería = min(carga × eficiencia, consumo_nocturno)
  red_nocturna     = consumo_nocturno - descarga_batería
```

---

## Cálculo de cobertura solar

```
coveragePercent = (selfConsumptionKWh + batteryDischargeKWh) / consumoTotalKWh × 100
```

**Por qué se usa `batteryDischargeKWh` y no `batteryChargeKWh`:**
La energía que entra a la batería sufre pérdidas de ciclo (eficiencia 80%). Si se contabilizara la carga en vez de la descarga, se sobreestimaría la cobertura real. La descarga es la energía que el hogar efectivamente recibe de la batería.

**Sin batería:** `coveragePercent = selfConsumptionKWh / consumoTotalKWh × 100`

---

## Motor de simulación

### Función principal `runSimulation(input, kit, batteryCapacityKWh, systemCostOverride?)`
Corre la simulación completa para un kit y capacidad de batería dados. Retorna `SimulatorResult` con balance energético mensual (12 meses), KPIs financieros e impacto ambiental.

### Modelo energético mensual
```
producción_mensual = kit.sizekWp × región.productionKWhPerKWp[mes]

consumo_diurno  = consumoMensual × 0.70   ← FIJO, no cambiar
consumo_nocturno = consumoMensual × 0.30  ← FIJO, no cambiar

Si producción ≥ consumo_diurno:
  autoconsumo = consumo_diurno
  excedente   = producción - consumo_diurno
  → lógica de batería (ver sección baterías)
  inyección   = excedente - carga_batería
  red         = consumo_nocturno - descarga_batería

Si producción < consumo_diurno:
  autoconsumo = producción
  excedente = inyección = carga_batería = descarga_batería = 0
  red = (consumo_diurno - producción) + consumo_nocturno
```

**IMPORTANTE:** `dayConsumptionRatio = 0.70` es un parámetro fijo de negocio. No debe calcularse dinámicamente desde datos de amanecer/atardecer. Es una simplificación deliberada para tener un modelo predecible y auditable.

### Empresas (`runBusinessSimulation`)
- No usa catálogo de kits — dimensionamiento continuo
- Objetivo: cubrir el 90% del consumo anual (`businessCoverageTarget = 0.90`)
- Precio: `$1.000.000/kWp`
- No tiene escenarios A/B/C ni selector de baterías

### Precio del kWh
1. Promedio de `variableAmountCLP / consumptionKWh` de las boletas ingresadas
2. Si no hay boletas con monto: precio referencial **220 CLP/kWh**

### Net billing (inyección a la red)
Valor de inyección = **50%** del precio de compra del kWh (norma vigente CNE).

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
- Confianza: `high` / `medium` / `low` — si es `low` se rechaza y pide otra boleta
- Header `anthropic-beta: pdfs-2024-09-25` solo se envía para archivos PDF (no para imágenes)

**Mock mode:** cuando no hay `ANTHROPIC_API_KEY`, retorna datos simulados con patrón estacional realista.

---

## Exportación de PDF

**Implementado con `@react-pdf/renderer` v4.**

- Componente: `SimulationPDF.tsx` — define el documento con `Document`, `Page`, `View`, `Text`
- Botón: `PDFDownloadButton.tsx` — usa `dynamic()` con `ssr: false` para evitar problemas en el servidor
- Se genera en el cliente al hacer clic; el nombre del archivo es `simulacion-solar-{nombre-cliente}.pdf`

**Contenido del informe:**
- Header verde con nombre del cliente, región, tarifa, distribuidora y fecha de generación
- 4 KPIs: ahorro mensual, ahorro anual, período de retorno, cobertura solar
- Kit recomendado: tamaño, paneles, área, precio referencial, batería si aplica
- Desglose financiero: autoconsumo, inyección, total anual, ROI 25 años, ahorro vida útil
- Tabla de balance energético mensual (12 meses): producción, autoconsumo, inyección, red, beneficio
- Impacto ambiental: CO₂ evitado al año y árboles equivalentes
- Nota metodológica y footer con nombre del cliente y fecha

---

## Captura de leads

**Funcionando.** Al hacer clic en el CTA:
- `StepResults` hace POST a `/api/leads` con todos los datos del lead y simulación activa
- Resend envía email HTML al operador con `replyTo` del lead
- `from: 'Mercado Energy <onboarding@resend.dev>'`
- Variables de entorno necesarias: `RESEND_API_KEY`, `LEAD_RECIPIENT_EMAIL`

---

## Catálogo de kits residenciales

| ID | kWp | Paneles | Área | Precio ref. |
|---|---|---|---|---|
| kit-2kwp  | 2  | 4  | 10 m² | $2.400.000 |
| kit-3kwp  | 3  | 6  | 15 m² | $3.600.000 |
| kit-5kwp  | 5  | 10 | 25 m² | $6.000.000 |
| kit-8kwp  | 8  | 15 | 38 m² | $9.600.000 |
| kit-10kwp | 10 | 18 | 45 m² | $12.000.000 |

**Panel estándar:** 550 Wp, 2,5 m²
**Módulo de batería:** 5 kWh, $1.500.000 CLP c/u (escenario C: hasta 6 módulos = 30 kWh)

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

SOLAR_DEFAULTS.injectionValueFactor     = 0.50        // net billing 50%
SOLAR_DEFAULTS.dayConsumptionRatio      = 0.70        // 70% consumo diurno — NO CAMBIAR
SOLAR_DEFAULTS.nightConsumptionRatio    = 0.30        // 30% consumo nocturno — NO CAMBIAR
SOLAR_DEFAULTS.systemLifeYears          = 25          // vida útil sistema

SOLAR_DEFAULTS.batteryUsableFraction    = 0.70        // 70% usable para descarga nocturna
SOLAR_DEFAULTS.batteryModuleKWh         = 5           // kWh por módulo de batería
SOLAR_DEFAULTS.batteryModulePriceCLP    = 1_500_000   // precio por módulo
SOLAR_DEFAULTS.batteryDailyCycleEfficiency = 0.80     // eficiencia ida+vuelta

SOLAR_DEFAULTS.evConsumptionIncreasePerCar  = 0.33    // +33% por auto eléctrico
SOLAR_DEFAULTS.minAlternativeCoveragePercent = 65     // mínimo para mostrar kit B
SOLAR_DEFAULTS.businessCoverageTarget       = 0.90    // cobertura objetivo empresas

BUSINESS_DEFAULTS.costPerKWpCLP         = 1_000_000  // precio empresa por kWp
```

---

## Consumos futuros estimados

| Equipo | Estimación |
|---|---|
| AA 9.000 BTU | 70 kWh/mes/equipo |
| AA 12.000 BTU | 95 kWh/mes/equipo |
| AA 18.000 BTU | 140 kWh/mes/equipo |
| Termo 80 L (1-2 personas) | 88 kWh/mes |
| Termo 150 L (3-4 personas) | 165 kWh/mes |
| Termo 200 L (5+ personas) | 220 kWh/mes |
| Auto eléctrico | +33% del consumo actual por auto |

Estos valores son estimaciones de uso promedio. No se calculan desde horas de uso diario — son constantes fijas por equipo/capacidad.

---

## Decisiones de diseño clave

### Kit siempre al máximo del empalme
Se recomienda el kit más grande posible dentro del límite físico del empalme. Nunca se sub-dimensiona por defecto. El usuario puede ver la opción B (un escalón abajo) para comparar precio vs. cobertura.

### `dayConsumptionRatio` fijo en 0.70
Representa qué fracción del consumo mensual ocurre durante el día (cuando hay producción solar). Es un parámetro de negocio fijo y deliberado — **no debe calcularse dinámicamente** desde datos de amanecer/atardecer de cada región. Simplificación que hace el modelo predecible y auditable.

### Baterías: 70% uso / 30% reserva
La batería nunca se descarga completamente. El 30% se reserva para cortes de luz. Este split se controla con `batteryUsableFraction = 0.70` en `SOLAR_DEFAULTS` y es fácilmente ajustable.

### Tarifa `'unknown'`
Se guarda sin resolver en `SupplyData.tarifa`. Solo se resuelve a `'BT1'` dentro del motor de cálculo en `buildBaseInput`. Permite mostrar avisos diferenciados en resultados.

### Distribuidora y tarifa — captura diferida al paso 4
Se eliminaron del paso 3. Se capturan automáticamente si el usuario sube una boleta (OCR), o manualmente en el paso 4. Se propagan al `WizardState` mediante `onUpdateSupply`.

### Interpolación estacional
Meses faltantes se estiman promediando los ±2 vecinos de calendario (circular). Captura la estacionalidad del consumo (Chile tiene inviernos con mayor consumo en zona central/sur). Requiere ≥2 meses reales.

### EV: análisis de carga diferido a resultados
El `EVCharger` en `WizardState` tiene valores provisorios tras el paso 6. `StepResults` recalcula con `calcEVCharger()` usando el balance energético real del escenario A.

### Cobertura usa `batteryDischargeKWh`
Evita sobreestimar la cobertura. La energía que entra a la batería sufre pérdidas — solo la descarga real al hogar cuenta.

### Protección de entregables
`select-none` + `onCopy preventDefault` en `StepBillReview` y `StepResults`.

### Inicialización lazy de clientes API en Vercel
`new Resend(...)` y lectura de `process.env.ANTHROPIC_API_KEY` deben ir **dentro del handler** de cada route, no a nivel módulo. Vercel no garantiza las variables de entorno en tiempo de evaluación del módulo.

---

## Pendientes y próximos pasos

### Alta prioridad

- [ ] **Supabase — persistencia de simulaciones y leads**
  - Guardar cada simulación completada con su `WizardState` completo
  - Panel de administración para ver leads recibidos con filtros
  - Tabla `leads` con JSON del resultado como alternativa mínima

### Media prioridad

- [ ] **Precio de kWh dinámico por distribuidora/tarifa**
  - Hoy usa $220 fijo cuando no hay monto en la boleta
  - Tabla de precios referenciales por distribuidora y tarifa

- [ ] **Envío de resultados por email al lead**
  - Al capturar el lead, enviar también al cliente un resumen con KPIs y kit recomendado

- [ ] **Mejora de la landing page**
  - Testimonios, casos de uso, beneficios clave antes del CTA al simulador

### Baja prioridad / futuro

- [ ] **Múltiples tarifas en resultados** — comparar qué tarifa conviene según perfil de demanda
- [ ] **Modelo horario para BT4.x/AT** — integrar precios por bloque horario con batería
- [ ] **Actualización de precios de kits** — panel para actualizar sin tocar código
- [ ] **Ajuste de consumo AA por zona climática** — norte vs. sur tienen perfiles distintos

---

## Flujo de datos resumido

```
StepCustomerType      → customerCategory
StepContact           → contact { regionId, email, ... }
StepSupply            → supply { amperajeA, propertyType, hasExistingSolar }
StepBills             → consumptionProfile { bills[], averageMonthlyKWh, ... }
                         (bills incluye meses reales + interpolados)
                      → supply.distribuidora + supply.tarifa (vía onUpdateSupply)
StepBillReview        → (solo visualización — confirma y avanza)
StepFutureConsumption → futureConsumption { airConditioners, waterHeater, evCharger,
                         totalAdditionalMonthlyKWh }
StepResults           → calcThreeScenarios(baseInput, batteryCount)   ← residencial
                      → calcThreeScenarios(futureInput, batteryCount)  ← si hay adiciones
                      → runBusinessSimulation(input)                   ← empresa
                      → calcEVCharger() con balance energético real
                      → POST /api/leads si el usuario hace clic en CTA
                      → PDFDownloadButton genera informe del escenario activo
```

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
